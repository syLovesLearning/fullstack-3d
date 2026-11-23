"""FastAPI 接口冒烟测试：覆盖健康检查、JWT 鉴权、一键导入与仓储维护 CRUD。"""

from uuid import UUID, uuid4

from fastapi.testclient import TestClient

from src.api.deps import create_access_token, get_warehouse_repo
from src.main import app
from src.schemas.models import AuthContext, CargoTypeCreate, RackLayoutCreate, RackPositionUpdate, RoadZoneCreate


class FakeWarehouseRepo:
    def __init__(self) -> None:
        self.cargos: list[dict] = []
        self.racks: list[dict] = []
        self.roads: list[dict] = [
            {"id": uuid4(), "code": "MAIN-AISLE", "name": "中央主干道", "pos_x": 0.0, "pos_z": 0.0, "length_m": 140.0, "width_m": 8.0, "is_locked": True, "drivable_forklift": True}
        ]

    async def seed_demo_layout(self):
        if not self.racks:
            self.racks.append({"id": uuid4(), "code": "RK-L1", "name": "西区1排", "length_m": 72, "width_m": 1.6, "height_m": 6.8, "bays": 18, "levels": 4, "slots_per_bay": 2, "total_slots": 144, "max_load_kg": 2000, "pos_x": -34, "pos_z": 0, "rotation_deg": 0, "model_key": "rack_heavy_4l", "cargo_type_code": "CARGO-BOX"})
        return {"seeded_racks": len(self.racks), "total_racks": len(self.racks)}

    async def list_cargo_types(self): return self.cargos
    async def create_cargo_type(self, b: CargoTypeCreate):
        item = {"id": uuid4(), **b.model_dump()}
        self.cargos.append(item)
        return item
    async def delete_cargo_type(self, cid: UUID): return True
    async def list_racks(self): return self.racks
    async def create_rack(self, b: RackLayoutCreate):
        item = {"id": uuid4(), **b.model_dump(), "total_slots": b.bays * b.levels * b.slots_per_bay}
        self.racks.append(item)
        return item
    async def update_rack_position(self, rid: UUID, b: RackPositionUpdate):
        for r in self.racks:
            if r["id"] == rid:
                r.update(b.model_dump())
                return r
        return None
    async def delete_rack(self, rid: UUID): return True
    async def list_roads(self): return self.roads
    async def create_road(self, b: RoadZoneCreate):
        item = {"id": uuid4(), **b.model_dump(), "is_locked": False}
        self.roads.append(item)
        return item
    async def delete_road(self, rid: UUID):
        for r in self.roads:
            if r["id"] == rid:
                return "locked" if r["is_locked"] else "deleted"
        return "not_found"


def test_warehouse_crud_and_seed_endpoints() -> None:
    fake_repo = FakeWarehouseRepo()
    app.dependency_overrides[get_warehouse_repo] = lambda: fake_repo
    try:
        client = TestClient(app, raise_server_exceptions=False)
        assert client.get("/health").status_code == 200
        token = create_access_token(AuthContext(user_id=uuid4(), username="admin_u", role="admin"))
        headers = {"Authorization": f"Bearer {token}"}

        seed_resp = client.post("/api/v1/warehouse/seed-demo", headers=headers)
        assert seed_resp.status_code == 200 and seed_resp.json()["total_racks"] >= 1
        assert client.post("/api/v1/warehouse/cargo-types", headers=headers, json={"code": "C1", "name": "电缆盘"}).status_code == 200
        rack_resp = client.post("/api/v1/warehouse/racks", headers=headers, json={"code": "RK-1", "name": "重型1排", "bays": 4, "levels": 4, "slots_per_bay": 2})
        assert rack_resp.status_code == 200 and rack_resp.json()["total_slots"] == 32
    finally:
        app.dependency_overrides.clear()
