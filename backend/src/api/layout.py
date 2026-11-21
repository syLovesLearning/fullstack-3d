"""演示布局随机重排路由：重建随机货架/道路，并随机化货位占用。"""

from fastapi import APIRouter, Depends

from src.api.deps import get_current_auth, get_layout_repo, get_slot_repo
from src.repositories.layout_repo import LayoutRepo
from src.repositories.slot_repo import SlotRepo
from src.schemas.models import AuthContext, LayoutRandomizeResponse

router = APIRouter(prefix="/api/v1/warehouse", tags=["warehouse"])


@router.post("/layout/randomize", response_model=LayoutRandomizeResponse)
async def randomize_layout(
    _auth: AuthContext = Depends(get_current_auth),
    layout_repo: LayoutRepo = Depends(get_layout_repo),
    slot_repo: SlotRepo = Depends(get_slot_repo),
) -> LayoutRandomizeResponse:
    layout = await layout_repo.replace_demo_layout()
    await slot_repo.sync_all()
    await slot_repo.randomize_demo_occupancy(layout["demo_rack_codes"])
    stats = await slot_repo.stats()
    return LayoutRandomizeResponse(
        racks=layout["racks"], roads=layout["roads"],
        total_slots=int(stats["total"]), occupied_slots=int(stats["occupied"]),
    )
