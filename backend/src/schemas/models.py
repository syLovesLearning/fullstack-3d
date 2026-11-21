"""跨层共享 Pydantic v2 契约模型（对标前端 TypeScript Interface）。"""

from typing import Literal
from uuid import UUID
from pydantic import BaseModel, Field


class AuthContext(BaseModel):
    user_id: UUID
    username: str
    role: Literal["admin", "user", "readonly", "external_guest"] = "user"
    allowed_tools: list[str] = Field(default_factory=list)
    groups: list[str] = Field(default_factory=lambda: ["public"])


class DevLoginRequest(BaseModel):
    username: str = "shenyang"
    role: Literal["admin", "user", "readonly", "external_guest"] = "admin"
    groups: list[str] | None = None


class RegisterRequest(BaseModel):
    username: str = Field(min_length=2, max_length=64)
    password: str = Field(min_length=4, max_length=128)
    role: Literal["admin", "user", "readonly", "external_guest"] = "user"
    groups: list[str] = Field(default_factory=lambda: ["public"])


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=128)


class WarehouseDimensions(BaseModel):
    width: float
    length: float
    height: float
    rail_height: float


class WarehouseZoneItem(BaseModel):
    code: str
    name: str
    status: Literal["normal", "attention", "maintenance"]
    capacity: int
    occupied: int


<<<<<<< HEAD
SlotStatus = Literal["empty", "occupied", "maintenance", "locked"]


class SlotStats(BaseModel):
    total: int
    occupied: int
    empty: int
    maintenance: int
    locked: int
    occupancy_rate: float


=======
>>>>>>> ini
class WarehouseSummaryResponse(BaseModel):
    plant_name: str
    dimensions_m: WarehouseDimensions
    zones: list[WarehouseZoneItem]
<<<<<<< HEAD
    slot_stats: SlotStats
=======
>>>>>>> ini
    pending_tasks: int
    note: str


class SeedDemoResponse(BaseModel):
    seeded_racks: int
    total_racks: int


class CargoTypeCreate(BaseModel):
    code: str = Field(min_length=1, max_length=32)
    name: str = Field(min_length=1, max_length=64)
    length_m: float = Field(default=1.2, gt=0.1, le=20)
    width_m: float = Field(default=1.0, gt=0.1, le=20)
    height_m: float = Field(default=1.1, gt=0.1, le=20)
    weight_kg: float = Field(default=500, gt=0, le=50000)
    model_key: str = Field(default="cargo_carton", min_length=1, max_length=64)
    color_hex: str = Field(default="#d97706", min_length=4, max_length=16)


class CargoTypeItem(CargoTypeCreate):
    id: UUID


class RackLayoutCreate(BaseModel):
    code: str = Field(min_length=1, max_length=32)
    name: str = Field(min_length=1, max_length=64)
    length_m: float = Field(default=12.0, gt=0.5, le=80)
    width_m: float = Field(default=1.6, gt=0.5, le=20)
    height_m: float = Field(default=6.8, gt=0.5, le=14)
    bays: int = Field(default=3, ge=1, le=40)
    levels: int = Field(default=4, ge=1, le=10)
    slots_per_bay: int = Field(default=2, ge=1, le=6)
    max_load_kg: float = Field(default=2000, gt=0, le=50000)
    pos_x: float = Field(default=-18.0, ge=-45, le=45)
    pos_z: float = Field(default=0.0, ge=-70, le=70)
    rotation_deg: Literal[0, 90] = 0
    model_key: str = Field(default="rack_heavy_4l", min_length=1, max_length=64)
    cargo_type_code: str | None = None


<<<<<<< HEAD
class RackLayoutUpdate(BaseModel):
    """PATCH 部分更新：仅显式传入的字段生效（cargo_type_code 传 null 解绑货品）。"""
    name: str | None = Field(default=None, min_length=1, max_length=64)
    length_m: float | None = Field(default=None, gt=0.5, le=80)
    width_m: float | None = Field(default=None, gt=0.5, le=20)
    height_m: float | None = Field(default=None, gt=0.5, le=14)
    bays: int | None = Field(default=None, ge=1, le=40)
    levels: int | None = Field(default=None, ge=1, le=10)
    slots_per_bay: int | None = Field(default=None, ge=1, le=6)
    max_load_kg: float | None = Field(default=None, gt=0, le=50000)
    pos_x: float | None = Field(default=None, ge=-45, le=45)
    pos_z: float | None = Field(default=None, ge=-70, le=70)
    rotation_deg: Literal[0, 90] | None = None
    model_key: str | None = Field(default=None, min_length=1, max_length=64)
    cargo_type_code: str | None = None
=======
class RackPositionUpdate(BaseModel):
    pos_x: float = Field(ge=-45, le=45)
    pos_z: float = Field(ge=-70, le=70)
    rotation_deg: Literal[0, 90] = 0
>>>>>>> ini


class RackLayoutItem(RackLayoutCreate):
    id: UUID
    total_slots: int


<<<<<<< HEAD
class SlotItem(BaseModel):
    id: UUID
    rack_id: UUID
    rack_code: str
    code: str
    bay_no: int
    level_no: int
    slot_no: int
    status: SlotStatus
    cargo_type_code: str | None = None
    cargo_name: str | None = None
    cargo_color_hex: str | None = None
    batch_no: str | None = None


class SlotUpdate(BaseModel):
    """PATCH 部分更新：仅显式传入的字段生效（status=empty 会自动清空货品与批次）。"""
    status: SlotStatus | None = None
    cargo_type_code: str | None = Field(default=None, max_length=32)
    batch_no: str | None = Field(default=None, max_length=64)


class SlotSyncResponse(BaseModel):
    created: int
    removed: int
    total: int


class LayoutRandomizeResponse(BaseModel):
    racks: int
    roads: int
    total_slots: int
    occupied_slots: int


=======
>>>>>>> ini
class RoadZoneCreate(BaseModel):
    code: str = Field(min_length=1, max_length=32)
    name: str = Field(min_length=1, max_length=64)
    pos_x: float = Field(ge=-45, le=45)
    pos_z: float = Field(ge=-70, le=70)
    length_m: float = Field(gt=1, le=140)
    width_m: float = Field(gt=1, le=90)
    drivable_forklift: bool = True


class RoadZoneItem(RoadZoneCreate):
    id: UUID
    is_locked: bool
