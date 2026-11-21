<<<<<<< HEAD
"""仓储维护路由：提供概览、一键导入、货品类型、货架摆放与固定道路管理接口。"""
=======
"""仓储维护路由：提供概览、一键导入、货品类型、货架摆放及固定道路管理接口。"""
>>>>>>> ini

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

<<<<<<< HEAD
from src.api.deps import get_current_auth, get_slot_repo, get_warehouse_repo
from src.repositories.slot_repo import SlotRepo
=======
from src.api.deps import get_current_auth, get_warehouse_repo
>>>>>>> ini
from src.repositories.warehouse_repo import WarehouseRepo
from src.schemas.models import (
    AuthContext,
    CargoTypeCreate,
    CargoTypeItem,
    RackLayoutCreate,
    RackLayoutItem,
<<<<<<< HEAD
    RackLayoutUpdate,
    RoadZoneCreate,
    RoadZoneItem,
    SeedDemoResponse,
    SlotStats,
=======
    RackPositionUpdate,
    RoadZoneCreate,
    RoadZoneItem,
    SeedDemoResponse,
>>>>>>> ini
    WarehouseDimensions,
    WarehouseSummaryResponse,
    WarehouseZoneItem,
)

router = APIRouter(prefix="/api/v1/warehouse", tags=["warehouse"])


@router.get("/summary", response_model=WarehouseSummaryResponse)
async def get_warehouse_summary(
    _auth: AuthContext = Depends(get_current_auth),
    repo: WarehouseRepo = Depends(get_warehouse_repo),
<<<<<<< HEAD
    slot_repo: SlotRepo = Depends(get_slot_repo),
=======
>>>>>>> ini
) -> WarehouseSummaryResponse:
    racks = await repo.list_racks()
    roads = await repo.list_roads()
    total_slots = sum(r["total_slots"] for r in racks)
<<<<<<< HEAD
    slot_stats = await slot_repo.stats()
=======
>>>>>>> ini
    return WarehouseSummaryResponse(
        plant_name="90m × 140m 电缆智造厂区",
        dimensions_m=WarehouseDimensions(width=90, length=140, height=14, rail_height=10.5),
        zones=[
<<<<<<< HEAD
            WarehouseZoneItem(code="RACK-LAYOUT", name="已规划货架/库位", status="normal", capacity=max(total_slots, 1), occupied=int(slot_stats["occupied"])),
            WarehouseZoneItem(code="ROAD-FIXED", name="固定道路与叉车区", status="normal", capacity=len(roads), occupied=len(roads)),
        ],
        slot_stats=SlotStats(**slot_stats),
        pending_tasks=0,
        note="已接入 PostgreSQL 货品类型、货架拖拽布局、货位台账与固定道路表。",
=======
            WarehouseZoneItem(code="RACK-LAYOUT", name="已规划货架/库位", status="normal", capacity=max(total_slots, 1), occupied=len(racks)),
            WarehouseZoneItem(code="ROAD-FIXED", name="固定道路与叉车区", status="normal", capacity=len(roads), occupied=len(roads)),
        ],
        pending_tasks=0,
        note="已接入 PostgreSQL 货品类型、货架拖拽布局与固定道路表。",
>>>>>>> ini
    )


@router.post("/seed-demo", response_model=SeedDemoResponse)
async def seed_demo_warehouse(
    _auth: AuthContext = Depends(get_current_auth),
    repo: WarehouseRepo = Depends(get_warehouse_repo),
<<<<<<< HEAD
    slot_repo: SlotRepo = Depends(get_slot_repo),
) -> dict[str, int]:
    res = await repo.seed_demo_layout()
    await slot_repo.sync_all(inherit_cargo=True)
    await slot_repo.fill_demo_racks()
    return res
=======
) -> dict[str, int]:
    return await repo.seed_demo_layout()
>>>>>>> ini


@router.get("/cargo-types", response_model=list[CargoTypeItem])
async def list_cargo_types(_auth: AuthContext = Depends(get_current_auth), repo: WarehouseRepo = Depends(get_warehouse_repo)) -> list[dict]:
    return await repo.list_cargo_types()


@router.post("/cargo-types", response_model=CargoTypeItem)
async def create_cargo_type(body: CargoTypeCreate, _auth: AuthContext = Depends(get_current_auth), repo: WarehouseRepo = Depends(get_warehouse_repo)) -> dict:
    return await repo.create_cargo_type(body)


@router.delete("/cargo-types/{cargo_id}")
async def delete_cargo_type(cargo_id: UUID, _auth: AuthContext = Depends(get_current_auth), repo: WarehouseRepo = Depends(get_warehouse_repo)) -> dict[str, bool]:
<<<<<<< HEAD
    res = await repo.delete_cargo_type(cargo_id)
    if res == "in_use":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="货品类型仍被货架或占用货位引用")
    if res != "deleted":
=======
    if not await repo.delete_cargo_type(cargo_id):
>>>>>>> ini
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="货品类型不存在")
    return {"deleted": True}


@router.get("/racks", response_model=list[RackLayoutItem])
async def list_racks(_auth: AuthContext = Depends(get_current_auth), repo: WarehouseRepo = Depends(get_warehouse_repo)) -> list[dict]:
    return await repo.list_racks()


@router.post("/racks", response_model=RackLayoutItem)
<<<<<<< HEAD
async def create_rack(body: RackLayoutCreate, _auth: AuthContext = Depends(get_current_auth), repo: WarehouseRepo = Depends(get_warehouse_repo), slot_repo: SlotRepo = Depends(get_slot_repo)) -> dict:
    row = await repo.create_rack(body)
    await slot_repo.sync_for_rack(row["id"])
    return row


@router.patch("/racks/{rack_id}", response_model=RackLayoutItem)
async def update_rack(rack_id: UUID, body: RackLayoutUpdate, _auth: AuthContext = Depends(get_current_auth), repo: WarehouseRepo = Depends(get_warehouse_repo), slot_repo: SlotRepo = Depends(get_slot_repo)) -> dict:
    row = await repo.update_rack(rack_id, body)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="货架不存在")
    await slot_repo.sync_for_rack(rack_id)
=======
async def create_rack(body: RackLayoutCreate, _auth: AuthContext = Depends(get_current_auth), repo: WarehouseRepo = Depends(get_warehouse_repo)) -> dict:
    return await repo.create_rack(body)


@router.patch("/racks/{rack_id}", response_model=RackLayoutItem)
async def update_rack_position(rack_id: UUID, body: RackPositionUpdate, _auth: AuthContext = Depends(get_current_auth), repo: WarehouseRepo = Depends(get_warehouse_repo)) -> dict:
    row = await repo.update_rack_position(rack_id, body)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="货架不存在")
>>>>>>> ini
    return row


@router.delete("/racks/{rack_id}")
async def delete_rack(rack_id: UUID, _auth: AuthContext = Depends(get_current_auth), repo: WarehouseRepo = Depends(get_warehouse_repo)) -> dict[str, bool]:
    if not await repo.delete_rack(rack_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="货架不存在")
    return {"deleted": True}


@router.get("/roads", response_model=list[RoadZoneItem])
async def list_roads(_auth: AuthContext = Depends(get_current_auth), repo: WarehouseRepo = Depends(get_warehouse_repo)) -> list[dict]:
    return await repo.list_roads()


@router.post("/roads", response_model=RoadZoneItem)
async def create_road(body: RoadZoneCreate, _auth: AuthContext = Depends(get_current_auth), repo: WarehouseRepo = Depends(get_warehouse_repo)) -> dict:
    return await repo.create_road(body)


@router.delete("/roads/{road_id}")
async def delete_road(road_id: UUID, _auth: AuthContext = Depends(get_current_auth), repo: WarehouseRepo = Depends(get_warehouse_repo)) -> dict[str, bool]:
    res = await repo.delete_road(road_id)
    if res == "locked":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="固定主干道宽度写死，禁止删除")
    if res == "not_found":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="道路区域不存在")
    return {"deleted": True}
