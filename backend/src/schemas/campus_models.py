"""园区厂区位置与道路维护 Pydantic v2 契约模型。"""

from typing import Literal
from uuid import UUID
from pydantic import BaseModel, Field

DoorSide = Literal["top", "bottom", "left", "right"]
CampusZoneType = Literal["warehouse", "dock"]
SubZoneKind = Literal["raw", "semi", "finished"]


class CampusDoor(BaseModel):
    id: str = Field(min_length=1, max_length=16)
    side: DoorSide
    off: float = Field(ge=0.05, le=0.95)
    open: bool = True


class CampusSubSlot(BaseModel):
    kind: SubZoneKind
    rx: float = Field(ge=0.05, le=0.95)
    ry: float = Field(ge=0.05, le=0.95)
    init: int = Field(default=0, ge=0, le=50)


class CampusZoneItem(BaseModel):
    id: UUID
    code: str
    name: str
    zone_type: CampusZoneType
    x: float
    y: float
    w: float
    h: float
    color: str
    doors: list[CampusDoor] = Field(default_factory=list)
    sub_layout: list[CampusSubSlot] = Field(default_factory=list)


class CampusZoneUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=64)
    x: float | None = Field(default=None, ge=0, le=680)
    y: float | None = Field(default=None, ge=0, le=420)
    w: float | None = Field(default=None, ge=20, le=300)
    h: float | None = Field(default=None, ge=20, le=300)
    doors: list[CampusDoor] | None = None


class CampusZoneResetRequest(BaseModel):
    randomize: bool = False


class CampusRoadCreate(BaseModel):
    code: str = Field(min_length=1, max_length=32)
    name: str = Field(min_length=1, max_length=64)
    x: float = Field(ge=0, le=680)
    y: float = Field(ge=0, le=420)
    w: float = Field(gt=1, le=680)
    h: float = Field(gt=1, le=420)


class CampusRoadItem(CampusRoadCreate):
    id: UUID
    is_locked: bool = False
