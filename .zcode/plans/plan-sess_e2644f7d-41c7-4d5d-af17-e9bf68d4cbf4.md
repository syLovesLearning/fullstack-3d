# 货位台账 + 3D 占用联动 实施计划

## Context

当前 `total_slots` 只是 `bays × levels × slots_per_bay` 的派生值，系统没有真实货位记录：无法知道某个库位是否占用、放的是什么货、批次是什么；3D 场景也是"只要货架绑定了货品类型就把每个库位都画满货物"。README 已把"货位台账 + 3D 联动"列为下一步。

本次目标：
1. 新增 `rack_slots` 台账表，按货架维度自动生成/回收货位（货位码、状态、货品类型、批次号）。
2. 提供货位查询、按货架同步、批量同步、单货位 PATCH 接口，并在仓储概览中输出占用统计。
3. 前端新增货位台账面板：按层/货格/库位可视化占用，支持改状态/货品/批次、清空、同步。
4. 3D 场景按台账真实占用渲染（占用位画货，空位只留空托盘），点击货架面板显示占用率；平面图与台账数据同源。

已确认口径：台账字段 = 状态 + 货品类型 + 批次号；3D 做到"占用渲染 + 货架占用率"（不做货位级点击拾取）。

---

## 1. 契约先行：`docs/API_SPEC.md`

新增第 4 节「货位台账」，并补充既有接口行为：

- `GET /api/v1/warehouse/slots?rack_id=<uuid可选>` → `SlotItem[]`
- `POST /api/v1/warehouse/racks/{rack_id}/slots/sync` → `{created, removed, total}`（按当前 bays/levels/slots_per_bay 补齐/回收货位，保留已有货位数据）
- `POST /api/v1/warehouse/slots/sync-all` → 同上（批量）
- `PATCH /api/v1/warehouse/slots/{slot_id}` → `{status?, cargo_type_code?, batch_no?}`
  - `status ∈ empty|occupied|maintenance|locked`
  - `empty` 自动清空 `cargo_type_code` 与 `batch_no`
  - `occupied` 必须绑定货品类型（未绑定返回 400）
  - 货品类型不存在返回 400；货位不存在返回 404
- `GET /warehouse/summary` 新增 `slot_stats`：`{total, occupied, empty, maintenance, locked, occupancy_rate}`
- `POST /warehouse/racks` 与 `PATCH /warehouse/racks/{id}` 后自动按新尺寸同步货位
- `POST /warehouse/seed-demo` 幂等导入货架后自动生成货位；新生成的库位若货架已绑定货品则直接标记占用（批次 `DEMO-SEED`）
- `DELETE /warehouse/racks/{id}` 级联删除货位
- `DELETE /warehouse/cargo-types/{id}`：若被货架或占用货位引用，返回 **409**
- `SlotItem` = `id, rack_id, rack_code, code, bay_no, level_no, slot_no, status, cargo_type_code, cargo_name, cargo_color_hex, batch_no`

---

## 2. 数据库：`backend/scripts/init_db.sql`

新增 `rack_slots`：

```sql
CREATE TABLE IF NOT EXISTS rack_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rack_id UUID NOT NULL REFERENCES rack_layouts(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  bay_no INTEGER NOT NULL CHECK (bay_no >= 0),
  level_no INTEGER NOT NULL CHECK (level_no >= 0),
  slot_no INTEGER NOT NULL CHECK (slot_no >= 0),
  status TEXT NOT NULL DEFAULT 'empty'
         CHECK (status IN ('empty','occupied','maintenance','locked')),
  cargo_type_code TEXT,
  batch_no TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (rack_id, bay_no, level_no, slot_no),
  UNIQUE (code)
);
CREATE INDEX IF NOT EXISTS idx_rack_slots_rack ON rack_slots (rack_id);
```

要点：
- 货位码规则 `RK-L1-B01-L01-S01`（bay/level/slot 从 1 开始展示，数据库存 0 基索引，与 3D 计算一致）。
- `ON DELETE CASCADE` 保证删货架自动清台账。
- 迁移使用 `make migrate`（全部 `CREATE IF NOT EXISTS`，可重复执行）。

---

## 3. 后端

### `backend/src/schemas/models.py`（约 +35 行）
新增 `SlotStatus` 字面量、`SlotItem`、`SlotUpdate`、`SlotSyncResponse`、`SlotStats`，并给 `WarehouseSummaryResponse` 增加 `slot_stats: SlotStats`。

### 新建 `backend/src/repositories/slot_repo.py`（约 130 行）
沿用 `WarehouseRepo` 的显式 SQL 风格，持有 `AsyncConnectionPool`：

- `_sync(rack_id | None, inherit_cargo=False)`：用 `generate_series` 一条 SQL 补齐缺失货位（`ON CONFLICT DO NOTHING`），再用一条 SQL 删除超出当前 `bays/levels/slots_per_bay` 的货位；返回 `{created, removed, total}`。`inherit_cargo=True` 时新货位按货架绑定的货品直接置为占用（批次 `DEMO-SEED`），仅用于 seed-demo。
- `sync_for_rack(id)` / `sync_all(inherit_cargo=False)`
- `list_slots(rack_id | None)`：join `rack_layouts` 取 `rack_code`，left join `cargo_types` 取 `cargo_name/color`
- `update_slot(id, body)`：读取当前值 → 计算最终 `status/cargo/batch_no` → 校验（occupied 必须有货、货品必须存在）→ 更新并回读；返回 `("ok"|"not_found"|"cargo_required"|"cargo_not_found", row)`
- `stats()`：`COUNT(*) FILTER (...)` 聚合，`occupancy_rate = occupied/total*100`（保留 1 位）

### 新建 `backend/src/api/slots.py`（约 75 行）
同前缀 `/api/v1/warehouse` 的独立 router，实现上述 4 个货位接口；错误码映射：404 / 400。

### 扩展现有文件
- `backend/src/api/deps.py`：新增 `get_slot_repo`
- `backend/src/main.py`：注册 slots router
- `backend/src/api/warehouse.py`
  - `summary` 注入 `slot_repo` 并返回 `slot_stats`
  - `create_rack` / `update_rack` 成功后 `sync_for_rack`
  - `seed_demo` 成功后 `sync_all(inherit_cargo=True)`
  - `delete_cargo_type` 处理新的 `in_use` 状态 → 409
- `backend/src/repositories/warehouse_repo.py`：`delete_cargo_type` 先查 `rack_layouts.cargo_type_code` 与 `rack_slots.cargo_type_code` 引用，有引用返回 `"in_use"`

### 测试：`backend/tests/test_api_smoke.py`
新增 `FakeSlotRepo` 并 override `get_slot_repo`，覆盖：
- 按货架同步 / 批量同步返回计数
- 空货位 PATCH 自动清空货品与批次
- 占用但未给货品 → 400
- 货位不存在 → 404
- summary 输出 `slot_stats`
- 删除被引用货品 → 409

---

## 4. 前端

### 类型与请求
- `frontend/src/api/warehouseTypes.ts`：新增 `SlotStatus`、`SlotItem`、`SlotStats`、`SlotUpdateBody`
- `frontend/src/api/client.ts`：新增 `listSlots(token, rackId?)`、`updateSlot(token, id, body)`、`syncRackSlots(token, rackId)`、`syncAllSlots(token)`（继续统一走 `requestJson`，组件不裸写 fetch）

### 新建 `frontend/src/components/SlotLedgerPanel.vue`（约 180 行）
- 头部：选中货架、`已占 X / 总 Y（Z%）`、占用进度条、"同步库位"按钮
- 层级切换（顶层 → 底层），当前层以 `bay × slots_per_bay` 网格渲染货位块：
  - 占用 = 货品颜色；空 = 虚线灰；维护 = 黄；锁定 = 红
- 点击货位后在面板内编辑：状态下拉、货品下拉、批次输入、保存 / 清空
- `emit('sync', rackId)`、`emit('update', slotId, body)`，所有请求由父组件发起并刷新

### `frontend/src/components/WarehouseMaintenance.vue`
- `refreshAll` 并发拉取增加 `listSlots`（全部台账，前端按 `rack_id` 过滤）
- 新增两个事件处理器：`handleSyncSlots`、`handleUpdateSlot`，复用现有 `withRefresh` 统一错误提示
- 在平面图下方插入 `<SlotLedgerPanel>`；货架增删改后因 `refreshAll` 自动同步台账
- 保持在 200 行内（当前 174 行，新增约 20 行）

### 3D 占用联动
- `frontend/src/utils/dynamicWarehouse3D.ts`
  - 入参追加 `slots: SlotItem[]`
  - 按 `rack_id` 分组，仅 `status==='occupied'` 的货位生成货物实例；空位/维护/锁定只生成托盘（维护黄、锁定红，复用 `agv_yellow` / `alert_red` 材质）
  - 货位坐标直接复用现有的 `bayW / levels / slots_per_bay` 计算公式（`bay_no/level_no/slot_no` 为 0 基）
  - 兼容：某货架尚无台账记录时回退到原"整排画满"表现，避免旧数据场景变空
- `frontend/src/composables/useFactoryScene.ts`：`syncWarehouse3D(racks, roads, cargos, slots)`，新增 `occupiedCount` 暴露
- `frontend/src/components/FactoryTwinView.vue`：并发拉取 `listSlots` 并传入；HUD 增加占用量；点击货架的属性面板增加"库位占用 X/Y"行

---

## 5. 文档与索引
- 更新 `docs/API_SPEC.md`（新接口与既有接口行为变更）
- 更新 `README.md` 功能说明（货位台账已接入）
- 最后执行 `python3 scripts/gen_code_index.py` 刷新 `docs/CODE_INDEX.md`

## 6. 验证

1. `cd backend && make migrate`（新建 `rack_slots`）
2. `cd backend && make test`（含新增货位用例）
3. 启动后端后 curl 走通：`dev-login` → `POST /slots/sync-all` → `GET /slots?rack_id=` → `PATCH /slots/{id}`（清空/占用/非法占用 400）→ 重复 `POST /seed-demo` 验证幂等与自动占用
4. `cd frontend && pnpm build`（`vue-tsc --noEmit` + 构建）
5. 启动前后端做一次页面冒烟：仓储维护选中货架 → 同步库位 → 改一个货位状态 → 切到 3D 查看货物增减与占用率变化（浏览器工具验证）
6. 确认 `docs/CODE_INDEX.md` 已包含新增文件与导出符号
