# CODE_INDEX.md — Auto-Generated Structural Map (Agent-Readable)

> Do NOT edit manually. Run `python3 scripts/gen_code_index.py` after file/symbol changes.

## Backend (`backend/src/`)

| File | Exports | Internal Deps | Summary |
| :--- | :--- | :--- | :--- |
| `backend/src/api/auth.py` | dev_login, register, login, get_me | src.api.deps, src.repositories.user_repo, src.schemas.models | 鉴权接口：支持开发一键切换账号、正式注册与密码登录。 |
<<<<<<< HEAD
| `backend/src/api/deps.py` | create_access_token, get_user_repo, get_warehouse_repo, get_slot_repo, get_layout_repo, get_current_auth | src.config, src.repositories.layout_repo, src.repositories.slot_repo, src.repositories.user_repo, src.repositories.warehouse_repo, src.schemas.models | FastAPI 依赖注入装配与 JWT 鉴权。 |
| `backend/src/api/layout.py` | randomize_layout | src.api.deps, src.repositories.layout_repo, src.repositories.slot_repo, src.schemas.models | 演示布局随机重排路由：重建随机货架/道路，并随机化货位占用。 |
| `backend/src/api/slots.py` | list_slots, sync_all_slots, sync_rack_slots, update_slot | src.api.deps, src.repositories.slot_repo, src.schemas.models | 货位台账路由：查询、按货架/批量同步与单货位占用维护。 |
| `backend/src/api/warehouse.py` | get_warehouse_summary, seed_demo_warehouse, list_cargo_types, create_cargo_type, delete_cargo_type, list_racks, create_rack, update_rack, delete_rack, list_roads, create_road, delete_road | src.api.deps, src.repositories.slot_repo, src.repositories.warehouse_repo, src.schemas.models | 仓储维护路由：提供概览、一键导入、货品类型、货架摆放与固定道路管理接口。 |
| `backend/src/config.py` | Settings | - | 全局配置：使用 find_dotenv 向上查找 .env，杜绝硬编码 .parent 层级。 |
| `backend/src/infra/postgres.py` | create_pg_pool, close_pg_pool | - | PostgreSQL 异步连接池生命周期管理（psycopg3）。 |
| `backend/src/main.py` | lifespan, health | src.api, src.config, src.infra.postgres | FastAPI 应用入口：装配 Postgres 连接池、鉴权、仓储维护与货位台账路由。 |
| `backend/src/repositories/layout_repo.py` | build_random_layout, LayoutRepo | - | 随机演示布局生成：重排演示货架与道路，保留用户自建数据并做几何避让。 |
| `backend/src/repositories/slot_repo.py` | SlotRepo | src.schemas.models | 货位台账数据仓库（显式异步 SQL：按货架尺寸同步、查询、占用变更与统计）。 |
| `backend/src/repositories/user_repo.py` | UserRepo | - | 用户与权限数据仓库（支持角色、分组数据权限与 PBKDF2 密码校验）。 |
| `backend/src/repositories/warehouse_repo.py` | WarehouseRepo | src.schemas.models | 仓储维护数据仓库（显式异步 SQL，支持默认货品、固定道路与幂等导入 8 排标准货架）。 |
| `backend/src/schemas/models.py` | AuthContext, DevLoginRequest, RegisterRequest, LoginRequest, WarehouseDimensions, WarehouseZoneItem, SlotStats, WarehouseSummaryResponse, SeedDemoResponse, CargoTypeCreate, CargoTypeItem, RackLayoutCreate, RackLayoutUpdate, RackLayoutItem, SlotItem, SlotUpdate, SlotSyncResponse, LayoutRandomizeResponse, RoadZoneCreate, RoadZoneItem | - | 跨层共享 Pydantic v2 契约模型（对标前端 TypeScript Interface）。 |
=======
| `backend/src/api/deps.py` | create_access_token, get_user_repo, get_warehouse_repo, get_current_auth | src.config, src.repositories.user_repo, src.repositories.warehouse_repo, src.schemas.models | FastAPI 依赖注入装配与 JWT 鉴权。 |
| `backend/src/api/warehouse.py` | get_warehouse_summary, seed_demo_warehouse, list_cargo_types, create_cargo_type, delete_cargo_type, list_racks, create_rack, update_rack_position, delete_rack, list_roads, create_road, delete_road | src.api.deps, src.repositories.warehouse_repo, src.schemas.models | 仓储维护路由：提供概览、一键导入、货品类型、货架摆放及固定道路管理接口。 |
| `backend/src/config.py` | Settings | - | 全局配置：使用 find_dotenv 向上查找 .env，杜绝硬编码 .parent 层级。 |
| `backend/src/infra/postgres.py` | create_pg_pool, close_pg_pool | - | PostgreSQL 异步连接池生命周期管理（psycopg3）。 |
| `backend/src/main.py` | lifespan, health | src.api, src.config, src.infra.postgres | FastAPI 应用入口：仅保留 Postgres 连接池、鉴权与仓储维护骨架路由。 |
| `backend/src/repositories/user_repo.py` | UserRepo | - | 用户与权限数据仓库（支持角色、分组数据权限与 PBKDF2 密码校验）。 |
| `backend/src/repositories/warehouse_repo.py` | WarehouseRepo | src.schemas.models | 仓储维护数据仓库（显式异步 SQL，支持默认货品、固定道路与幂等导入 8 排标准货架）。 |
| `backend/src/schemas/models.py` | AuthContext, DevLoginRequest, RegisterRequest, LoginRequest, WarehouseDimensions, WarehouseZoneItem, WarehouseSummaryResponse, SeedDemoResponse, CargoTypeCreate, CargoTypeItem, RackLayoutCreate, RackPositionUpdate, RackLayoutItem, RoadZoneCreate, RoadZoneItem | - | 跨层共享 Pydantic v2 契约模型（对标前端 TypeScript Interface）。 |
>>>>>>> ini

## Frontend (`frontend/src/`)

| File | Exports / Component |
| :--- | :--- |
| `frontend/src/App.vue` | App |
<<<<<<< HEAD
| `frontend/src/api/client.ts` | UserInfo, AuthResponse, RawApiResult, devLogin, registerUser, loginUser, seedDemoWarehouse, listCargoTypes, createCargoType, deleteCargoType, listRacks, createRack, updateRack, deleteRack, listRoads, createRoad, deleteRoad, listSlots, syncRackSlots, syncAllSlots, updateSlot, randomizeLayout, rawApiRequest |
| `frontend/src/api/warehouseTypes.ts` | CargoTypeItem, RackLayoutItem, RoadZoneItem, SlotItem, SlotUpdateBody, SlotStats, SlotSyncResult, LayoutRandomizeResult |
| `frontend/src/components/ApiTester.vue` | ApiTester |
| `frontend/src/components/CargoTypePanel.vue` | CargoTypePanel |
| `frontend/src/components/FactoryTwinView.vue` | FactoryTwinView |
| `frontend/src/components/ListPagination.vue` | ListPagination |
| `frontend/src/components/RackEditModal.vue` | RackEditModal |
| `frontend/src/components/RackFloorCanvas.vue` | RackFloorCanvas |
| `frontend/src/components/RackListPanel.vue` | RackListPanel |
| `frontend/src/components/RoadZonePanel.vue` | RoadZonePanel |
| `frontend/src/components/SlotLedgerPanel.vue` | SlotLedgerPanel |
| `frontend/src/components/WarehouseMaintenance.vue` | WarehouseMaintenance |
| `frontend/src/composables/useFactoryScene.ts` | useFactoryScene |
| `frontend/src/composables/useForkliftMoveDemo.ts` | useForkliftMoveDemo |
| `frontend/src/composables/usePagination.ts` | usePagination |
| `frontend/src/main.ts` | - |
| `frontend/src/utils/cableReels.ts` | buildCableReels |
| `frontend/src/utils/demoForklift.ts` | DemoForklift, buildDemoForklift |
| `frontend/src/utils/dynamicWarehouse3D.ts` | rebuildDynamicWarehouse3D |
| `frontend/src/utils/electricBox.ts` | buildCornerElectricBox |
| `frontend/src/utils/equipAgv.ts` | buildAgv |
| `frontend/src/utils/equipCableWinder.ts` | buildCableWinder |
| `frontend/src/utils/equipCnc.ts` | buildCncCenter |
| `frontend/src/utils/equipCompressor.ts` | buildAirCompressor |
| `frontend/src/utils/equipInspection.ts` | buildInspectionLine |
| `frontend/src/utils/equipRobotCell.ts` | buildRobotCell |
| `frontend/src/utils/equipScissorLift.ts` | buildScissorLift |
| `frontend/src/utils/equipWorkbench.ts` | buildWorkbench |
| `frontend/src/utils/equipmentMaterials.ts` | EM |
| `frontend/src/utils/equipmentTypes.ts` | EquipmentModel, addMesh, box, rbox, cyl, instancedBoxes, instancedCylinders, markAnimated, mergeStaticParts, finalize |
| `frontend/src/utils/factoryEquipment.ts` | getEquipmentZones, STATIC_ZONES, clearEquipmentGroup, buildDynamicFactoryEquipment |
| `frontend/src/utils/factoryMachines.ts` | buildFactoryMachines |
| `frontend/src/utils/factoryPerimeter.ts` | FactoryStats, buildFactoryPerimeter |
| `frontend/src/utils/forkliftDemo.ts` | ForkliftDemoCallbacks, ForkliftDemo |
| `frontend/src/utils/forkliftDemoRuntime.ts` | DemoStartResult, ForkliftDemoRuntime |
| `frontend/src/utils/forkliftPath.ts` | PathPoint, ForkliftPathPlan, planForkliftPathStrict, planForkliftPath |
| `frontend/src/utils/materialPool.ts` | MaterialPool |
| `frontend/src/utils/mathShaders.ts` | makeMathConcrete, makeMathWood |
| `frontend/src/utils/warehouseGeometry.ts` | PLANT_W, PLANT_L, RACK_MODEL_OPTIONS, CARGO_MODEL_OPTIONS, getRackFootprint, checkRackPlacementConflict |
| `frontend/src/utils/warehousePicking.ts` | rackWorldHalfExtents, createRackHighlight, applyRackHighlight, pickRackAtPointer |
=======
| `frontend/src/api/client.ts` | UserInfo, AuthResponse, RawApiResult, devLogin, registerUser, loginUser, seedDemoWarehouse, listCargoTypes, createCargoType, deleteCargoType, listRacks, createRack, updateRackPosition, deleteRack, listRoads, createRoad, deleteRoad, rawApiRequest |
| `frontend/src/api/warehouseTypes.ts` | CargoTypeItem, RackLayoutItem, RoadZoneItem |
| `frontend/src/components/ApiTester.vue` | ApiTester |
| `frontend/src/components/CargoTypePanel.vue` | CargoTypePanel |
| `frontend/src/components/FactoryTwinView.vue` | FactoryTwinView |
| `frontend/src/components/RackFloorCanvas.vue` | RackFloorCanvas |
| `frontend/src/components/RoadZonePanel.vue` | RoadZonePanel |
| `frontend/src/components/WarehouseMaintenance.vue` | WarehouseMaintenance |
| `frontend/src/composables/useFactoryScene.ts` | useFactoryScene |
| `frontend/src/main.ts` | - |
| `frontend/src/utils/cableReels.ts` | buildCableReels |
| `frontend/src/utils/dynamicWarehouse3D.ts` | rebuildDynamicWarehouse3D |
| `frontend/src/utils/electricBox.ts` | buildCornerElectricBox |
| `frontend/src/utils/factoryMachines.ts` | buildFactoryMachines |
| `frontend/src/utils/factoryPerimeter.ts` | FactoryStats, buildFactoryPerimeter |
| `frontend/src/utils/materialPool.ts` | MaterialPool |
| `frontend/src/utils/mathShaders.ts` | makeMathConcrete, makeMathWood |
| `frontend/src/utils/warehouseGeometry.ts` | PLANT_W, PLANT_L, RACK_MODEL_OPTIONS, CARGO_MODEL_OPTIONS, getRackFootprint, checkRackPlacementConflict |
>>>>>>> ini
| `frontend/src/utils/warehouseProps.ts` | buildWarehouseProps |
| `frontend/src/utils/warehouseRacks.ts` | buildWarehouseRacks |
