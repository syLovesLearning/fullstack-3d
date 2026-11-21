# API_SPEC.md — REST 接口契约（唯一真相源）

所有接口统一前缀 `/api/v1`。除 `GET /health`、`POST /api/v1/auth/dev-login`、`POST /api/v1/auth/register` 与 `POST /api/v1/auth/login` 外，其余接口均需携带 `Authorization: Bearer <jwt>`。

## 1. 系统健康检查

- `GET /health` -> `{"status": "ok"}`

## 2. 鉴权与身份

- `POST /api/v1/auth/dev-login` -> `{username, role, groups?}` -> `{access_token, token_type, user}`
- `POST /api/v1/auth/register` -> `{username, password, role, groups}` -> `{access_token, token_type, user}`
- `POST /api/v1/auth/login` -> `{username, password}` -> `{access_token, token_type, user}`
- `GET /api/v1/auth/me` -> `AuthContext`

## 3. 仓储维护（货品类型 / 货架布局 / 固定道路 / 一键导入）

<<<<<<< HEAD
- `GET /api/v1/warehouse/summary` -> 厂区尺寸、区域统计、待办概览与 `slot_stats`（`{total, occupied, empty, maintenance, locked, occupancy_rate}`）
- `POST /api/v1/warehouse/seed-demo` -> `{seeded_racks: int, total_racks: int}`（幂等导入默认 8 排标准重型货架与道路；同时补齐货位台账，并把默认 8 排货架的空货位置为占用，批次 `DEMO-SEED`，用于演示 3D 占用效果）
- `GET /api/v1/warehouse/cargo-types` -> `CargoTypeItem[]`
- `POST /api/v1/warehouse/cargo-types` -> `{code, name, length_m, width_m, height_m, weight_kg, model_key, color_hex}` -> `CargoTypeItem`
- `DELETE /api/v1/warehouse/cargo-types/{cargo_id}` -> `{"deleted": true}`；若该货品仍被货架绑定或被已占用货位引用 -> `409 {"detail": 货品类型仍被引用}`
- `GET /api/v1/warehouse/racks` -> `RackLayoutItem[]`
- `POST /api/v1/warehouse/racks` -> `{code, name, length_m, width_m, height_m, bays, levels, slots_per_bay, max_load_kg, pos_x, pos_z, rotation_deg, model_key, cargo_type_code?}` -> `RackLayoutItem`（创建后自动按 `bays × levels × slots_per_bay` 生成货位台账）
- `PATCH /api/v1/warehouse/racks/{rack_id}` -> 部分更新货架（**code 不可改**）：可传 `{name?, length_m?, width_m?, height_m?, bays?, levels?, slots_per_bay?, max_load_kg?, pos_x?, pos_z?, rotation_deg?, model_key?, cargo_type_code?}` 中任意字段；未传字段保持原值，显式传 `cargo_type_code: null` 解绑货品；`total_slots` 按 `bays × levels × slots_per_bay` 重算；货位台账自动补齐/回收（超出新尺寸的货位被删除，保留仍匹配的货位） -> `RackLayoutItem`
- `DELETE /api/v1/warehouse/racks/{rack_id}` -> `{"deleted": true}`（级联删除该货架全部货位）
- `GET /api/v1/warehouse/roads` -> `RoadZoneItem[]`
- `POST /api/v1/warehouse/roads` -> `{code, name, pos_x, pos_z, length_m, width_m, drivable_forklift}` -> `RoadZoneItem`
- `DELETE /api/v1/warehouse/roads/{road_id}` -> `{"deleted": true}`（`is_locked=true` 的固定主干道禁止删除）

## 4. 货位台账（Slot Ledger）

货位码规则：`{rack_code}-B{bay+1:02}-L{level+1:02}-S{slot+1:02}`，例如 `RK-L1-B01-L01-S01`。`bay_no / level_no / slot_no` 均为 0 基索引，与 3D 场景计算一致。

- `SlotItem` -> `{id, rack_id, rack_code, code, bay_no, level_no, slot_no, status, cargo_type_code, cargo_name, cargo_color_hex, batch_no}`
- `status` 取值：`empty | occupied | maintenance | locked`
- `SlotSyncResponse` -> `{created: int, removed: int, total: int}`

接口：

- `GET /api/v1/warehouse/slots?rack_id={uuid}` -> `SlotItem[]`（`rack_id` 可省略，省略时返回全部货位）
- `POST /api/v1/warehouse/racks/{rack_id}/slots/sync` -> `SlotSyncResponse`（按当前货架尺寸补齐/回收货位，保留已有货位数据；货架不存在 -> 404）
- `POST /api/v1/warehouse/slots/sync-all` -> `SlotSyncResponse`（批量同步全部货架，不改变已存在的货位状态）
- `PATCH /api/v1/warehouse/slots/{slot_id}` -> `{status?, cargo_type_code?, batch_no?}` -> `SlotItem`
  - `status` 未传时保持原状态；`cargo_type_code` / `batch_no` 未传时保持原值
  - `status=empty`：自动清空 `cargo_type_code` 与 `batch_no`
  - `status=occupied`：必须绑定货品类型（当前已绑定或本次传入），否则 `400 {"detail": 占用货位必须绑定货品类型}`
  - `cargo_type_code` 不存在 -> `400 {"detail": 货品类型不存在}`
  - 货位不存在 -> `404 {"detail": 货位不存在}`

## 5. 演示布局随机重排

- `POST /api/v1/warehouse/layout/randomize` -> `{racks: int, roads: int, total_slots: int, occupied_slots: int}`（`total_slots` / `occupied_slots` 为全库统计，含用户自建货架）
  - 删除旧演示货架（`RK-L*` / `RK-R*` / `RK-D*`）与自动道路（`RD-*`），按随机几何重新生成 10~14 排货架（长度 10~24m，随机 0°/90°）和横向/纵向叉车通道
  - `MAIN-AISLE` 中央固定主干道保留；用户自建货架与道路保留，生成时做碰撞与围墙边界避让
  - 生成后自动补齐货位台账，并把演示货架的货位随机化为占用 / 空 / 维护 / 锁定，批次形如 `LOT-xxx`
=======
- `GET /api/v1/warehouse/summary` -> 厂区尺寸、区域统计与待办概览
- `POST /api/v1/warehouse/seed-demo` -> `{seeded_racks: int, total_racks: int}`（幂等导入默认 8 排标准重型货架与道路）
- `GET /api/v1/warehouse/cargo-types` -> `CargoTypeItem[]`
- `POST /api/v1/warehouse/cargo-types` -> `{code, name, length_m, width_m, height_m, weight_kg, model_key, color_hex}` -> `CargoTypeItem`
- `DELETE /api/v1/warehouse/cargo-types/{cargo_id}` -> `{"deleted": true}`
- `GET /api/v1/warehouse/racks` -> `RackLayoutItem[]`
- `POST /api/v1/warehouse/racks` -> `{code, name, length_m, width_m, height_m, bays, levels, slots_per_bay, max_load_kg, pos_x, pos_z, rotation_deg, model_key, cargo_type_code?}` -> `RackLayoutItem`
- `PATCH /api/v1/warehouse/racks/{rack_id}` -> `{pos_x, pos_z, rotation_deg}` -> `RackLayoutItem`
- `DELETE /api/v1/warehouse/racks/{rack_id}` -> `{"deleted": true}`
- `GET /api/v1/warehouse/roads` -> `RoadZoneItem[]`
- `POST /api/v1/warehouse/roads` -> `{code, name, pos_x, pos_z, length_m, width_m, drivable_forklift}` -> `RoadZoneItem`
- `DELETE /api/v1/warehouse/roads/{road_id}` -> `{"deleted": true}`（`is_locked=true` 的固定主干道禁止删除）
>>>>>>> ini
