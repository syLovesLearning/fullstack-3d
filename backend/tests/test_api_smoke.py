<<<<<<< HEAD
"""FastAPI 接口冒烟测试：覆盖健康检查、JWT 鉴权、一键导入、仓储维护 CRUD 与货位台账。"""
=======
"""FastAPI 接口冒烟测试：覆盖健康检查、JWT 鉴权、一键导入与仓储维护 CRUD。"""
>>>>>>> ini

from uuid import UUID, uuid4

from fastapi.testclient import TestClient

<<<<<<< HEAD
from src.api.deps import create_access_token, get_layout_repo, get_slot_repo, get_warehouse_repo
from src.main import app
from src.schemas.models import (
    AuthContext,
    CargoTypeCreate,
    RackLayoutCreate,
    RackLayoutUpdate,
    RoadZoneCreate,
    SlotUpdate,
)
=======
from src.api.deps import create_access_token, get_warehouse_repo
from src.main import app
from src.schemas.models import AuthContext, CargoTypeCreate, RackLayoutCreate, RackPositionUpdate, RoadZoneCreate
>>>>>>> ini


class FakeWarehouseRepo:
    def __init__(self) -> None:
        self.cargos: list[dict] = []
        self.racks: list[dict] = []
        self.roads: list[dict] = [
            {"id": uuid4(), "code": "MAIN-AISLE", "name": "中央主干道", "pos_x": 0.0, "pos_z": 0.0, "length_m": 140.0, "width_m": 8.0, "is_locked": True, "drivable_forklift": True}
        ]

    async def seed_demo_layout(self):
<<<<<<< HEAD
        if not self.cargos:
            self.cargos.append({"id": uuid4(), "code": "CARGO-BOX", "name": "牛皮纸箱托盘", "length_m": 1.2, "width_m": 1.0, "height_m": 1.1, "weight_kg": 450, "model_key": "cargo_carton", "color_hex": "#d97706"})
=======
>>>>>>> ini
        if not self.racks:
            self.racks.append({"id": uuid4(), "code": "RK-L1", "name": "西区1排", "length_m": 72, "width_m": 1.6, "height_m": 6.8, "bays": 18, "levels": 4, "slots_per_bay": 2, "total_slots": 144, "max_load_kg": 2000, "pos_x": -34, "pos_z": 0, "rotation_deg": 0, "model_key": "rack_heavy_4l", "cargo_type_code": "CARGO-BOX"})
        return {"seeded_racks": len(self.racks), "total_racks": len(self.racks)}

    async def list_cargo_types(self): return self.cargos
    async def create_cargo_type(self, b: CargoTypeCreate):
        item = {"id": uuid4(), **b.model_dump()}
        self.cargos.append(item)
        return item
<<<<<<< HEAD
    async def delete_cargo_type(self, cid: UUID):
        code = next((c["code"] for c in self.cargos if c["id"] == cid), None)
        if code is None:
            return "not_found"
        used = any(r.get("cargo_type_code") == code for r in self.racks) or any(s.get("cargo_type_code") == code for s in self.slots)
        return "in_use" if used else "deleted"
=======
    async def delete_cargo_type(self, cid: UUID): return True
>>>>>>> ini
    async def list_racks(self): return self.racks
    async def create_rack(self, b: RackLayoutCreate):
        item = {"id": uuid4(), **b.model_dump(), "total_slots": b.bays * b.levels * b.slots_per_bay}
        self.racks.append(item)
        return item
<<<<<<< HEAD
    async def update_rack(self, rid: UUID, b: RackLayoutUpdate):
        for r in self.racks:
            if r["id"] == rid:
                r.update({k: v for k, v in b.model_dump(exclude_unset=True).items()})
                r["total_slots"] = r["bays"] * r["levels"] * r["slots_per_bay"]
=======
    async def update_rack_position(self, rid: UUID, b: RackPositionUpdate):
        for r in self.racks:
            if r["id"] == rid:
                r.update(b.model_dump())
>>>>>>> ini
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

<<<<<<< HEAD
    # 供 FakeSlotRepo 使用的货品引用表
    @property
    def slots(self) -> list[dict]:
        return getattr(self, "_slots", [])

    @slots.setter
    def slots(self, value: list[dict]) -> None:
        self._slots = value


class FakeSlotRepo:
    def __init__(self, warehouse: FakeWarehouseRepo) -> None:
        self.warehouse = warehouse
        self.slots: list[dict] = []
        warehouse.slots = self.slots

    def _rack(self, rack_id):
        return next((r for r in self.warehouse.racks if r["id"] == rack_id), None)

    def _cargo_fields(self, code: str | None) -> dict:
        cargo = next((c for c in self.warehouse.cargos if c["code"] == code), None)
        return {"cargo_name": cargo["name"] if cargo else None, "cargo_color_hex": cargo["color_hex"] if cargo else None}

    def _add_slots(self, rack: dict, inherit: bool) -> int:
        created = 0
        cargo = rack.get("cargo_type_code")
        for b in range(rack["bays"]):
            for l in range(rack["levels"]):
                for s in range(rack["slots_per_bay"]):
                    exists = any((x["rack_id"], x["bay_no"], x["level_no"], x["slot_no"]) == (rack["id"], b, l, s) for x in self.slots)
                    if exists:
                        continue
                    occupied = inherit and bool(cargo)
                    self.slots.append({
                        "id": uuid4(), "rack_id": rack["id"], "rack_code": rack["code"],
                        "code": f"{rack['code']}-B{b + 1:02d}-L{l + 1:02d}-S{s + 1:02d}",
                        "bay_no": b, "level_no": l, "slot_no": s,
                        "status": "occupied" if occupied else "empty",
                        "cargo_type_code": cargo if occupied else None,
                        "batch_no": "DEMO-SEED" if occupied else None,
                        **self._cargo_fields(cargo if occupied else None),
                    })
                    created += 1
        return created

    async def sync_for_rack(self, rack_id: UUID):
        rack = self._rack(rack_id)
        if rack is None:
            return {"created": 0, "removed": 0, "total": 0}
        created = self._add_slots(rack, inherit=False)
        total = sum(1 for x in self.slots if x["rack_id"] == rack_id)
        return {"created": created, "removed": 0, "total": total}

    async def sync_all(self, inherit_cargo: bool = False):
        created = sum(self._add_slots(r, inherit=inherit_cargo) for r in self.warehouse.racks)
        return {"created": created, "removed": 0, "total": len(self.slots)}

    async def list_slots(self, rack_id: UUID | None = None):
        return [s for s in self.slots if rack_id is None or s["rack_id"] == rack_id]

    async def fill_demo_racks(self) -> int:
        demo = ("RK-L1", "RK-L2", "RK-L3", "RK-L4", "RK-R1", "RK-R2", "RK-R3", "RK-R4")
        filled = 0
        for s in self.slots:
            rack = self._rack(s["rack_id"])
            if rack and rack["code"] in demo and rack.get("cargo_type_code") and s["status"] == "empty":
                s.update({"status": "occupied", "cargo_type_code": rack["cargo_type_code"], "batch_no": "DEMO-SEED", **self._cargo_fields(rack["cargo_type_code"])})
                filled += 1
        return filled

    async def update_slot(self, slot_id: UUID, body: SlotUpdate):
        slot = next((s for s in self.slots if s["id"] == slot_id), None)
        if slot is None:
            return "not_found", None
        data = body.model_dump(exclude_unset=True)
        status = data.get("status", slot["status"])
        cargo = data["cargo_type_code"] if "cargo_type_code" in data else slot["cargo_type_code"]
        batch = data["batch_no"] if "batch_no" in data else slot["batch_no"]
        if status == "empty":
            cargo, batch = None, None
        if cargo and not any(c["code"] == cargo for c in self.warehouse.cargos):
            return "cargo_not_found", None
        if status == "occupied" and not cargo:
            return "cargo_required", None
        slot.update({"status": status, "cargo_type_code": cargo, "batch_no": batch, **self._cargo_fields(cargo)})
        return "ok", slot

    async def stats(self):
        total = len(self.slots)
        occupied = sum(1 for s in self.slots if s["status"] == "occupied")
        return {
            "total": total, "occupied": occupied,
            "empty": sum(1 for s in self.slots if s["status"] == "empty"),
            "maintenance": sum(1 for s in self.slots if s["status"] == "maintenance"),
            "locked": sum(1 for s in self.slots if s["status"] == "locked"),
            "occupancy_rate": round(occupied * 100 / total, 1) if total else 0.0,
        }

    async def randomize_demo_occupancy(self, rack_codes: list[str]) -> tuple[int, int]:
        rows = [s for s in self.slots if s["rack_code"] in rack_codes]
        for i, s in enumerate(rows):
            occupied = i % 3 != 0
            s.update({"status": "occupied" if occupied else "empty", "cargo_type_code": "CARGO-BOX" if occupied else None})
        return sum(1 for s in rows if s["status"] == "occupied"), len(rows)


class FakeLayoutRepo:
    async def replace_demo_layout(self):
        return {"racks": 12, "roads": 3, "total_racks": 12, "demo_rack_codes": ["RK-D01"]}


def _client(fake_repo: FakeWarehouseRepo) -> tuple[TestClient, dict[str, str], FakeSlotRepo]:
    fake_slots = FakeSlotRepo(fake_repo)
    app.dependency_overrides[get_warehouse_repo] = lambda: fake_repo
    app.dependency_overrides[get_slot_repo] = lambda: fake_slots
    app.dependency_overrides[get_layout_repo] = lambda: FakeLayoutRepo()
    client = TestClient(app, raise_server_exceptions=False)
    token = create_access_token(AuthContext(user_id=uuid4(), username="admin_u", role="admin"))
    return client, {"Authorization": f"Bearer {token}"}, fake_slots


def test_warehouse_crud_and_seed_endpoints() -> None:
    fake_repo = FakeWarehouseRepo()
    client, headers, fake_slots = _client(fake_repo)
    try:
        assert client.get("/health").status_code == 200
        seed_resp = client.post("/api/v1/warehouse/seed-demo", headers=headers)
        assert seed_resp.status_code == 200 and seed_resp.json()["total_racks"] >= 1
        assert len(fake_slots.slots) == 144 and all(s["status"] == "occupied" for s in fake_slots.slots)
        assert client.post("/api/v1/warehouse/cargo-types", headers=headers, json={"code": "C1", "name": "电缆盘"}).status_code == 200
        rack_resp = client.post("/api/v1/warehouse/racks", headers=headers, json={"code": "RK-1", "name": "重型1排", "bays": 4, "levels": 4, "slots_per_bay": 2})
        assert rack_resp.status_code == 200 and rack_resp.json()["total_slots"] == 32
        assert len(fake_slots.slots) == 144 + 32  # 创建货架自动生成台账

        rack_id = rack_resp.json()["id"]
        patch_resp = client.patch(
            f"/api/v1/warehouse/racks/{rack_id}", headers=headers,
            json={"name": "重型1排(改)", "bays": 6, "cargo_type_code": None},
        )
        assert patch_resp.status_code == 200
        patched = patch_resp.json()
        assert patched["name"] == "重型1排(改)"
        assert patched["bays"] == 6 and patched["total_slots"] == 48  # total_slots 重算
        assert patched["cargo_type_code"] is None  # 显式 null 解绑
        assert patched["length_m"] == 12.0  # 未传字段保持原值
        assert len(fake_slots.slots) == 144 + 48  # 尺寸变化自动补齐货位
        assert client.patch("/api/v1/warehouse/racks/00000000-0000-0000-0000-000000000000", headers=headers, json={"name": "x"}).status_code == 404
    finally:
        app.dependency_overrides.clear()


def test_slot_ledger_sync_and_occupancy() -> None:
    fake_repo = FakeWarehouseRepo()
    client, headers, fake_slots = _client(fake_repo)
    try:
        assert client.post("/api/v1/warehouse/seed-demo", headers=headers).status_code == 200
        rack_id = fake_repo.racks[0]["id"]
        slots = client.get("/api/v1/warehouse/slots", headers=headers, params={"rack_id": str(rack_id)}).json()
        assert len(slots) == 144
        assert slots[0]["status"] == "occupied" and slots[0]["batch_no"] == "DEMO-SEED"
        assert slots[0]["cargo_name"] == "牛皮纸箱托盘"

        target = slots[0]["id"]
        assert client.patch(f"/api/v1/warehouse/slots/{target}", headers=headers, json={"status": "empty"}).status_code == 200
        cleared = client.get("/api/v1/warehouse/slots", headers=headers, params={"rack_id": str(rack_id)}).json()[0]
        assert cleared["status"] == "empty" and cleared["cargo_type_code"] is None and cleared["batch_no"] is None

        assert client.patch(f"/api/v1/warehouse/slots/{target}", headers=headers, json={"status": "occupied"}).status_code == 400
        assert client.patch(f"/api/v1/warehouse/slots/{target}", headers=headers, json={"status": "occupied", "cargo_type_code": "CARGO-BOX", "batch_no": "B-001"}).status_code == 200
        assert client.patch(f"/api/v1/warehouse/slots/{uuid4()}", headers=headers, json={"status": "empty"}).status_code == 404

        summary = client.get("/api/v1/warehouse/summary", headers=headers).json()
        assert summary["slot_stats"]["total"] == 144 and summary["slot_stats"]["occupied"] == 144
        assert summary["slot_stats"]["occupancy_rate"] == 100.0
        assert client.post("/api/v1/warehouse/slots/sync-all", headers=headers).json()["created"] == 0

        cargo_id = fake_repo.cargos[0]["id"]
        assert client.delete(f"/api/v1/warehouse/cargo-types/{cargo_id}", headers=headers).status_code == 409
    finally:
        app.dependency_overrides.clear()


def test_layout_randomize_endpoint() -> None:
    fake_repo = FakeWarehouseRepo()
    client, headers, _fake_slots = _client(fake_repo)
    try:
        resp = client.post("/api/v1/warehouse/layout/randomize", headers=headers)
        assert resp.status_code == 200
        body = resp.json()
        assert body["racks"] == 12 and body["roads"] == 3
        assert body["total_slots"] >= 0 and body["occupied_slots"] <= body["total_slots"]
=======

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
>>>>>>> ini
    finally:
        app.dependency_overrides.clear()
