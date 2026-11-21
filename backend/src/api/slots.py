"""货位台账路由：查询、按货架/批量同步与单货位占用维护。"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from src.api.deps import get_current_auth, get_slot_repo
from src.repositories.slot_repo import SlotRepo
from src.schemas.models import AuthContext, SlotItem, SlotSyncResponse, SlotUpdate

router = APIRouter(prefix="/api/v1/warehouse", tags=["warehouse"])


@router.get("/slots", response_model=list[SlotItem])
async def list_slots(
    rack_id: UUID | None = None,
    _auth: AuthContext = Depends(get_current_auth),
    repo: SlotRepo = Depends(get_slot_repo),
) -> list[dict]:
    return await repo.list_slots(rack_id)


@router.post("/slots/sync-all", response_model=SlotSyncResponse)
async def sync_all_slots(
    _auth: AuthContext = Depends(get_current_auth),
    repo: SlotRepo = Depends(get_slot_repo),
) -> dict[str, int]:
    return await repo.sync_all()


@router.post("/racks/{rack_id}/slots/sync", response_model=SlotSyncResponse)
async def sync_rack_slots(
    rack_id: UUID,
    _auth: AuthContext = Depends(get_current_auth),
    repo: SlotRepo = Depends(get_slot_repo),
) -> dict[str, int]:
    res = await repo.sync_for_rack(rack_id)
    if res["total"] == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="货架不存在")
    return res


@router.patch("/slots/{slot_id}", response_model=SlotItem)
async def update_slot(
    slot_id: UUID,
    body: SlotUpdate,
    _auth: AuthContext = Depends(get_current_auth),
    repo: SlotRepo = Depends(get_slot_repo),
) -> dict:
    code, row = await repo.update_slot(slot_id, body)
    if code == "not_found":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="货位不存在")
    if code == "cargo_required":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="占用货位必须绑定货品类型")
    if code == "cargo_not_found":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="货品类型不存在")
    assert row is not None
    return row
