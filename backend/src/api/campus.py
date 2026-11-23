"""园区厂区位置与道路维护路由：支持 680m×420m 厂区布局、门开关与道路 CRUD。"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from src.api.deps import get_campus_repo, get_current_auth
from src.repositories.campus_repo import CampusRepo
from src.schemas.campus_models import (
    CampusRoadCreate,
    CampusRoadItem,
    CampusZoneItem,
    CampusZoneResetRequest,
    CampusZoneUpdate,
)
from src.schemas.models import AuthContext

router = APIRouter(prefix="/api/v1/campus", tags=["campus"])


@router.get("/zones", response_model=list[CampusZoneItem])
async def list_campus_zones(
    _auth: AuthContext = Depends(get_current_auth),
    repo: CampusRepo = Depends(get_campus_repo),
) -> list[dict]:
    return await repo.list_zones()


@router.patch("/zones/{zone_id}", response_model=CampusZoneItem)
async def update_campus_zone(
    zone_id: UUID,
    body: CampusZoneUpdate,
    _auth: AuthContext = Depends(get_current_auth),
    repo: CampusRepo = Depends(get_campus_repo),
) -> dict:
    row = await repo.update_zone(zone_id, body)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="厂区功能区不存在")
    return row


@router.post("/zones/reset", response_model=list[CampusZoneItem])
async def reset_campus_zones(
    body: CampusZoneResetRequest,
    _auth: AuthContext = Depends(get_current_auth),
    repo: CampusRepo = Depends(get_campus_repo),
) -> list[dict]:
    return await repo.reset_zones(randomize=body.randomize)


@router.get("/roads", response_model=list[CampusRoadItem])
async def list_campus_roads(
    _auth: AuthContext = Depends(get_current_auth),
    repo: CampusRepo = Depends(get_campus_repo),
) -> list[dict]:
    return await repo.list_roads()


@router.post("/roads", response_model=CampusRoadItem)
async def create_campus_road(
    body: CampusRoadCreate,
    _auth: AuthContext = Depends(get_current_auth),
    repo: CampusRepo = Depends(get_campus_repo),
) -> dict:
    return await repo.create_road(body)


@router.delete("/roads/{road_id}")
async def delete_campus_road(
    road_id: UUID,
    _auth: AuthContext = Depends(get_current_auth),
    repo: CampusRepo = Depends(get_campus_repo),
) -> dict[str, bool]:
    res = await repo.delete_road(road_id)
    if res == "locked":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="园区主干道锁定，禁止删除")
    if res == "not_found":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="园区道路不存在")
    return {"deleted": True}
