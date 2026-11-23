"""WMS 库位主数据路由：支持查询、属性/状态维护、相邻合并/拆分与批量刷写。"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from src.api.deps import get_current_auth, get_slot_repo
from src.repositories.slot_repo import SlotRepo
from src.schemas.models import (
    AuthContext,
    SlotBatchRequest,
    SlotUpdateRequest,
    WarehouseSlotItem,
)

router = APIRouter(prefix="/api/v1/warehouse/slots", tags=["warehouse-slots"])


@router.get("", response_model=list[WarehouseSlotItem])
async def list_slots(
    rack_id: UUID | None = Query(default=None),
    _auth: AuthContext = Depends(get_current_auth),
    repo: SlotRepo = Depends(get_slot_repo),
) -> list[dict]:
    return await repo.list_slots(rack_id=rack_id)


@router.patch("/{slot_id}", response_model=WarehouseSlotItem)
async def update_slot(
    slot_id: UUID,
    body: SlotUpdateRequest,
    _auth: AuthContext = Depends(get_current_auth),
    repo: SlotRepo = Depends(get_slot_repo),
) -> dict:
    row, err = await repo.update_slot(slot_id, body)
    if err:
        code = status.HTTP_404_NOT_FOUND if "不存在" in err else status.HTTP_400_BAD_REQUEST
        raise HTTPException(status_code=code, detail=err)
    assert row is not None
    return row


@router.post("/{slot_id}/merge")
async def merge_slot(
    slot_id: UUID,
    _auth: AuthContext = Depends(get_current_auth),
    repo: SlotRepo = Depends(get_slot_repo),
) -> dict[str, bool]:
    err = await repo.merge_slot(slot_id)
    if err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err)
    return {"merged": True}


@router.post("/{slot_id}/split")
async def split_slot(
    slot_id: UUID,
    _auth: AuthContext = Depends(get_current_auth),
    repo: SlotRepo = Depends(get_slot_repo),
) -> dict[str, bool]:
    err = await repo.split_slot(slot_id)
    if err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err)
    return {"split": True}


@router.post("/batch")
async def batch_slots(
    body: SlotBatchRequest,
    _auth: AuthContext = Depends(get_current_auth),
    repo: SlotRepo = Depends(get_slot_repo),
) -> dict[str, int]:
    updated = await repo.batch_slots(body)
    return {"updated": updated}
