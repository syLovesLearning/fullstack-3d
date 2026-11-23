# API_SPEC.md — REST 接口契约（唯一真相源）

所有接口统一前缀 `/api/v1`。除 `GET /health`、`POST /api/v1/auth/dev-login`、`POST /api/v1/auth/register` 与 `POST /api/v1/auth/login` 外，其余接口均需携带 `Authorization: Bearer <jwt>`。

## 1. 系统健康检查

- `GET /health` -> `{"status": "ok"}`

## 2. 鉴权与身份

- `POST /api/v1/auth/dev-login` / `register` / `login` / `GET /api/v1/auth/me`

## 3. 仓储基础布局（货品字典 / 货架布局 / 固定道路）

- `GET /api/v1/warehouse/summary` / `POST /api/v1/warehouse/seed-demo`
- `GET|POST /api/v1/warehouse/cargo-types`, `DELETE /api/v1/warehouse/cargo-types/{cargo_id}`
- `GET|POST /api/v1/warehouse/racks`, `PATCH /api/v1/warehouse/racks/{rack_id}`, `PATCH /api/v1/warehouse/racks/{rack_id}/meta`, `DELETE /api/v1/warehouse/racks/{rack_id}`
- `GET|POST /api/v1/warehouse/roads`, `DELETE /api/v1/warehouse/roads/{road_id}`

## 4. WMS 库位主数据（纯库位维护 + 合并拆分 + 策略）

- `GET /api/v1/warehouse/slots?rack_id=` -> `WarehouseSlotItem[]`（含 `span_slots`、`merged_into_slot_id`、`slot_type`、`abc_class`、`allow_mixed`、`max_weight_kg`、`status`、`remark`）
- `PATCH /api/v1/warehouse/slots/{slot_id}` -> `{status, slot_type, abc_class, allow_mixed, max_weight_kg, remark}` -> `WarehouseSlotItem`
- `POST /api/v1/warehouse/slots/{slot_id}/merge` -> 合并同跨同层相邻下一库位（`span_slots=2`）-> `{"merged": true}`
- `POST /api/v1/warehouse/slots/{slot_id}/split` -> 拆分合并库位还原为 2 个独立库位 -> `{"split": true}`
- `POST /api/v1/warehouse/slots/batch` -> `{rack_id, bay_idx?, level_idx?, action: "lock"|"unlock"|"disable"|"set_abc"|"set_type", abc_class?, slot_type?}` -> `{"updated": int}`

## 5. 园区厂区位置与道路维护（680m × 420m 物流园区）

- `GET /api/v1/campus/zones` -> `CampusZoneItem[]`（7 座大仓 + 1 座货车月台，含 `x, y, w, h, doors, sub_layout`）
- `PATCH /api/v1/campus/zones/{zone_id}` -> `{name?, x?, y?, w?, h?, doors?}` -> `CampusZoneItem`
- `POST /api/v1/campus/zones/reset` -> 重置为默认园区布局（或随机重排 `{randomize: boolean}`）-> `CampusZoneItem[]`
- `GET /api/v1/campus/roads` -> `CampusRoadItem[]`（含固定主干道 `is_locked=true` 与自定义园区道路）
- `POST /api/v1/campus/roads` -> `{code, name, x, y, w, h}` -> `CampusRoadItem`
- `DELETE /api/v1/campus/roads/{road_id}` -> `{"deleted": true}`（`is_locked=true` 主干道禁止删除）
