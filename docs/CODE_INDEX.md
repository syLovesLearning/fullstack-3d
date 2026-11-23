# CODE_INDEX.md — Auto-Generated Structural Map (Agent-Readable)

> Do NOT edit manually. Run `python3 scripts/gen_code_index.py` after file/symbol changes.

## Backend (`backend/src/`)

| File | Exports | Internal Deps | Summary |
| :--- | :--- | :--- | :--- |
| `backend/src/api/auth.py` | dev_login, register, login, get_me | src.api.deps, src.config, src.repositories.user_repo, src.schemas.models | 鉴权接口：支持正式注册与密码登录（dev-login 受 ENABLE_DEV_LOGIN 开关控制）。 |
| `backend/src/api/campus.py` | list_campus_zones, update_campus_zone, reset_campus_zones, list_campus_roads, create_campus_road, delete_campus_road | src.api.deps, src.repositories.campus_repo, src.schemas.campus_models, src.schemas.models | 园区厂区位置与道路维护路由：支持 680m×420m 厂区布局、门开关与道路 CRUD。 |
| `backend/src/api/deps.py` | create_access_token, get_user_repo, get_warehouse_repo, get_slot_repo, get_campus_repo, get_current_auth | src.config, src.repositories.campus_repo, src.repositories.slot_repo, src.repositories.user_repo, src.repositories.warehouse_repo, src.schemas.models | FastAPI 依赖注入装配与 JWT 鉴权。 |
| `backend/src/api/slots.py` | list_slots, update_slot, merge_slot, split_slot, batch_slots | src.api.deps, src.repositories.slot_repo, src.schemas.models | WMS 库位主数据路由：支持查询、属性/状态维护、相邻合并/拆分与批量刷写。 |
| `backend/src/api/warehouse.py` | get_warehouse_summary, seed_demo_warehouse, list_cargo_types, create_cargo_type, delete_cargo_type, list_racks, create_rack, update_rack_position, update_rack_meta, delete_rack, list_roads, create_road, delete_road | src.api.deps, src.repositories.slot_repo, src.repositories.warehouse_repo, src.schemas.models | 仓储维护路由：提供概览、一键导入、货品类型、货架摆放及固定道路管理接口。 |
| `backend/src/config.py` | Settings | - | 全局配置：使用 find_dotenv 向上查找 .env，杜绝硬编码 .parent 层级。 |
| `backend/src/infra/migrate.py` | run_migrate | src.config | 跨平台数据库自动建库与建表脚本（逐条执行 SQL 并校验关键表就绪）。 |
| `backend/src/infra/postgres.py` | create_pg_pool, close_pg_pool | - | PostgreSQL 异步连接池生命周期管理（psycopg3）。 |
| `backend/src/main.py` | lifespan, health | src.api, src.config, src.infra.postgres | FastAPI 应用入口：托管 Postgres 连接池、API 路由及生产态前端静态产物。 |
| `backend/src/repositories/campus_defaults.py` | - | - | 园区厂区位置与道路默认种子数据（680m × 420m）。 |
| `backend/src/repositories/campus_repo.py` | CampusRepo | src.repositories.campus_defaults, src.schemas.campus_models | 园区厂区位置与道路维护数据仓库（显式异步 SQL + 自愈建表）。 |
| `backend/src/repositories/slot_repo.py` | SlotRepo | src.schemas.models | WMS 库位主数据仓库：自愈建表与列升级、相邻库位合并/拆分、状态与策略批量维护。 |
| `backend/src/repositories/user_repo.py` | UserRepo | - | 用户与权限数据仓库（支持角色、分组数据权限与 PBKDF2 密码校验）。 |
| `backend/src/repositories/warehouse_repo.py` | WarehouseRepo | src.schemas.models | 仓储维护数据仓库（显式异步 SQL，支持默认货品、固定道路、货架元数据与幂等导入）。 |
| `backend/src/schemas/campus_models.py` | CampusDoor, CampusSubSlot, CampusZoneItem, CampusZoneUpdate, CampusZoneResetRequest, CampusRoadCreate, CampusRoadItem | - | 园区厂区位置与道路维护 Pydantic v2 契约模型。 |
| `backend/src/schemas/models.py` | AuthContext, DevLoginRequest, RegisterRequest, LoginRequest, WarehouseDimensions, WarehouseZoneItem, WarehouseSummaryResponse, SeedDemoResponse, CargoTypeCreate, CargoTypeItem, RackLayoutCreate, RackPositionUpdate, RackMetaUpdate, RackLayoutItem, RoadZoneCreate, RoadZoneItem, WarehouseSlotItem, SlotUpdateRequest, SlotBatchRequest | - | 跨层共享 Pydantic v2 契约模型（对标前端 TypeScript Interface）。 |

## Frontend (`frontend/src/`)

| File | Exports / Component |
| :--- | :--- |
| `frontend/src/App.vue` | App |
| `frontend/src/api/client.ts` | UserInfo, AuthResponse, RawApiResult, devLogin, registerUser, loginUser, getMe, seedDemoWarehouse, listCargoTypes, createCargoType, deleteCargoType, listRacks, createRack, updateRackPosition, updateRackMeta, deleteRack, listRoads, createRoad, deleteRoad, listSlots, updateSlot, mergeSlot, splitSlot, batchSlots, listCampusZones, updateCampusZone, resetCampusZones, listCampusRoads, createCampusRoad, deleteCampusRoad, rawApiRequest |
| `frontend/src/api/warehouseTypes.ts` | CargoTypeItem, RackLayoutItem, RoadZoneItem, WarehouseSlotItem, CampusDoor, CampusSubSlot, CampusZoneItem, CampusRoadItem |
| `frontend/src/components/ApiTester.vue` | ApiTester |
| `frontend/src/components/CampusFloorCanvas.vue` | CampusFloorCanvas |
| `frontend/src/components/CampusMaintenance.vue` | CampusMaintenance |
| `frontend/src/components/CampusRoadPanel.vue` | CampusRoadPanel |
| `frontend/src/components/CargoTypePanel.vue` | CargoTypePanel |
| `frontend/src/components/FactoryTwinView.vue` | FactoryTwinView |
| `frontend/src/components/LevelMaintModal.vue` | LevelMaintModal |
| `frontend/src/components/LogisticsSimView.vue` | LogisticsSimView |
| `frontend/src/components/RackCrudPanel.vue` | RackCrudPanel |
| `frontend/src/components/RackFloorCanvas.vue` | RackFloorCanvas |
| `frontend/src/components/RackFront2D.vue` | RackFront2D |
| `frontend/src/components/RackMetaModal.vue` | RackMetaModal |
| `frontend/src/components/RackSingleFrontView.vue` | RackSingleFrontView |
| `frontend/src/components/RoadZonePanel.vue` | RoadZonePanel |
| `frontend/src/components/SlotDetailModal.vue` | SlotDetailModal |
| `frontend/src/components/SlotDrilldownTable.vue` | SlotDrilldownTable |
| `frontend/src/components/SlotMaintenanceView.vue` | SlotMaintenanceView |
| `frontend/src/components/WarehouseMaintenance.vue` | WarehouseMaintenance |
| `frontend/src/composables/useFactoryScene.ts` | useFactoryScene |
| `frontend/src/main.ts` | - |
| `frontend/src/utils/cableReels.ts` | buildCableReels |
| `frontend/src/utils/campusCanvasDraw.ts` | ViewTransform, computeCampusTransform, drawCampusScene |
| `frontend/src/utils/campusRoadGraph.ts` | CAMPUS_W, CAMPUS_H, FORKLIFT_IN_SPEED, LIFT_SEC, Pt, GreenRoadRect, RoadNode, doorWorldPos, buildInternalOrthoPath, rebuildGreenRoadNetwork, findCampusAStar, calcBestDoorAndInternal, checkCampusZoneConflict |
| `frontend/src/utils/campusSimEngine.ts` | RESERVE_LIMIT, FORKLIFT_OUT_SPEED, KIND_META, SubZone, SimFlow, SimForklift, SimTruck, SimEvent, CampusSimState, fmtClock, pushSimEvent, rebuildSubZones, addSimFlow, spawnRandomFlow, syncForkliftCount, stepCampusSim |
| `frontend/src/utils/dynamicWarehouse3D.ts` | renderSingleRackLocations3D, rebuildDynamicWarehouse3D |
| `frontend/src/utils/electricBox.ts` | buildCornerElectricBox |
| `frontend/src/utils/factoryMachines.ts` | buildFactoryMachines |
| `frontend/src/utils/factoryPerimeter.ts` | FactoryStats, buildFactoryPerimeter |
| `frontend/src/utils/forkliftBuilder.ts` | ForkliftHandle, createForkliftTemplate, instantiateForklift |
| `frontend/src/utils/materialPool.ts` | MaterialPool |
| `frontend/src/utils/mathShaders.ts` | makeMathConcrete, makeMathWood |
| `frontend/src/utils/warehouseGeometry.ts` | PLANT_W, PLANT_L, RACK_MODEL_OPTIONS, CARGO_MODEL_OPTIONS, getRackFootprint, checkRackPlacementConflict |
| `frontend/src/utils/warehouseProps.ts` | buildWarehouseProps |
| `frontend/src/utils/warehouseRacks.ts` | buildWarehouseRacks |
