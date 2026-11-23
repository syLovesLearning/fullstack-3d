"""仓储维护路由：提供概览、一键导入、货品类型、货架摆放及固定道路管理接口。"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from src.api.deps import get_current_auth, get_slot_repo, get_warehouse_repo
from src.repositories.slot_repo import SlotRepo
from src.repositories.warehouse_repo import WarehouseRepo
from src.schemas.models import (
    AuthContext,
    CargoTypeCreate,
    CargoTypeItem,
    RackLayoutCreate,
    RackLayoutItem,
    RackMetaUpdate,
    RackPositionUpdate,
    RoadZoneCreate,
    RoadZoneItem,
    SeedDemoResponse,
    WarehouseDimensions,
    WarehouseSummaryResponse,
    WarehouseZoneItem,
)

router = APIRouter(prefix="/api/v1/warehouse", tags=["warehouse"])


@router.get("/summary", response_model=WarehouseSummaryResponse)
async def get_warehouse_summary(
    _auth: AuthContext = Depends(get_current_auth),
    repo: WarehouseRepo = Depends(get_warehouse_repo),
) -> WarehouseSummaryResponse:
    racks = await repo.list_racks()
    roads = await repo.list_roads()
    total_slots = sum(r["total_slots"] for r in racks)
    return WarehouseSummaryResponse(
        plant_name="90m × 140m 电缆智造厂区",
        dimensions_m=WarehouseDimensions(width=90, length=140, height=14, rail_height=10.5),
        zones=[
            WarehouseZoneItem(code="RACK-LAYOUT", name="已规划货架/库位", status="normal", capacity=max(total_slots, 1), occupied=len(racks)),
            WarehouseZoneItem(code="ROAD-FIXED", name="固定道路与叉车区", status="normal", capacity=len(roads), occupied=len(roads)),
        ],
        pending_tasks=0,
        note="已接入 PostgreSQL 货品类型、货架布局、固定道路与库位级台账。",
    )


@router.post("/seed-demo", response_model=SeedDemoResponse)
async def seed_demo_warehouse(
    _auth: AuthContext = Depends(get_current_auth),
    repo: WarehouseRepo = Depends(get_warehouse_repo),
    slot_repo: SlotRepo = Depends(get_slot_repo),
) -> dict[str, int]:
    res = await repo.seed_demo_layout()
    await slot_repo.ensure_slots_for_all_racks(fill_ratio=0.75)
    return res


@router.get("/cargo-types", response_model=list[CargoTypeItem])
async def list_cargo_types(_auth: AuthContext = Depends(get_current_auth), repo: WarehouseRepo = Depends(get_warehouse_repo)) -> list[dict]:
    return await repo.list_cargo_types()


@router.post("/cargo-types", response_model=CargoTypeItem)
async def create_cargo_type(body: CargoTypeCreate, _auth: AuthContext = Depends(get_current_auth), repo: WarehouseRepo = Depends(get_warehouse_repo)) -> dict:
    return await repo.create_cargo_type(body)


@router.delete("/cargo-types/{cargo_id}")
async def delete_cargo_type(cargo_id: UUID, _auth: AuthContext = Depends(get_current_auth), repo: WarehouseRepo = Depends(get_warehouse_repo)) -> dict[str, bool]:
    if not await repo.delete_cargo_type(cargo_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="货品类型不存在")
    return {"deleted": True}


@router.get("/racks", response_model=list[RackLayoutItem])
async def list_racks(_auth: AuthContext = Depends(get_current_auth), repo: WarehouseRepo = Depends(get_warehouse_repo)) -> list[dict]:
    return await repo.list_racks()


@router.post("/racks", response_model=RackLayoutItem)
async def create_rack(body: RackLayoutCreate, _auth: AuthContext = Depends(get_current_auth), repo: WarehouseRepo = Depends(get_warehouse_repo), slot_repo: SlotRepo = Depends(get_slot_repo)) -> dict:
    row = await repo.create_rack(body)
    await slot_repo.ensure_slots_for_all_racks(fill_ratio=0.75)
    return row


@router.patch("/racks/{rack_id}", response_model=RackLayoutItem)
async def update_rack_position(rack_id: UUID, body: RackPositionUpdate, _auth: AuthContext = Depends(get_current_auth), repo: WarehouseRepo = Depends(get_warehouse_repo)) -> dict:
    row = await repo.update_rack_position(rack_id, body)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="货架不存在")
    return row


@router.patch("/racks/{rack_id}/meta", response_model=RackLayoutItem)
async def update_rack_meta(rack_id: UUID, body: RackMetaUpdate, _auth: AuthContext = Depends(get_current_auth), repo: WarehouseRepo = Depends(get_warehouse_repo)) -> dict:
    row = await repo.update_rack_meta(rack_id, body)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="货架不存在")
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
