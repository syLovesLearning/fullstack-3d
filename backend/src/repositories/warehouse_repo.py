"""仓储维护数据仓库（显式异步 SQL，支持默认货品、固定道路、货架元数据与幂等导入）。"""

from typing import Any
from uuid import UUID

from psycopg_pool import AsyncConnectionPool

from src.schemas.models import (
    CargoTypeCreate,
    RackLayoutCreate,
    RackMetaUpdate,
    RackPositionUpdate,
    RoadZoneCreate,
)


class WarehouseRepo:
    def __init__(self, pool: AsyncConnectionPool) -> None:
        self._pool = pool

    async def ensure_defaults(self) -> None:
        async with self._pool.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    INSERT INTO road_zones (code, name, pos_x, pos_z, length_m, width_m, is_locked, drivable_forklift)
                    VALUES ('MAIN-AISLE', '中央安全主干道（固定8m）', 0, 0, 140, 8, TRUE, TRUE)
                    ON CONFLICT (code) DO NOTHING;
                    """
                )
                await cur.execute(
                    """
                    INSERT INTO cargo_types (code, name, length_m, width_m, height_m, weight_kg, model_key, color_hex)
                    VALUES
                      ('CARGO-BOX', '牛皮纸箱托盘', 1.2, 1.0, 1.1, 450, 'cargo_carton', '#d97706'),
                      ('CARGO-CRATE', '蓝色周转箱组', 1.2, 1.0, 1.2, 600, 'cargo_crate', '#2563eb'),
                      ('CARGO-DRUM', '金属化工圆桶', 1.2, 1.0, 1.0, 850, 'cargo_drum', '#64748b'),
                      ('CARGO-REEL', '成品电缆木盘', 1.6, 1.4, 1.6, 1500, 'cargo_reel', '#b45309')
                    ON CONFLICT (code) DO NOTHING;
                    """
                )

    async def seed_demo_layout(self) -> dict[str, int]:
        await self.ensure_defaults()
        demo_racks = [
            ("RK-L1", "西区1排重型货架", -34.0, "CARGO-BOX"),
            ("RK-L2", "西区2排重型货架", -26.0, "CARGO-CRATE"),
            ("RK-L3", "西区3排重型货架", -18.0, "CARGO-DRUM"),
            ("RK-L4", "西区4排重型货架", -10.0, "CARGO-BOX"),
            ("RK-R1", "东区1排重型货架", 10.0, "CARGO-CRATE"),
            ("RK-R2", "东区2排重型货架", 18.0, "CARGO-REEL"),
            ("RK-R3", "东区3排重型货架", 26.0, "CARGO-DRUM"),
            ("RK-R4", "东区4排重型货架", 34.0, "CARGO-BOX"),
        ]
        seeded = 0
        sql = """
            INSERT INTO rack_layouts (code, name, length_m, width_m, height_m, bays, levels, slots_per_bay, max_load_kg, pos_x, pos_z, rotation_deg, model_key, cargo_type_code)
            VALUES (%s, %s, 72.0, 1.6, 6.8, 18, 4, 2, 2000.0, %s, 0.0, 0, 'rack_heavy_4l', %s)
            ON CONFLICT (code) DO NOTHING;
        """
        async with self._pool.connection() as conn:
            async with conn.cursor() as cur:
                for code, name, px, cargo_code in demo_racks:
                    await cur.execute(sql, (code, name, px, cargo_code))
                    seeded += cur.rowcount
                await cur.execute("SELECT COUNT(*) AS cnt FROM rack_layouts;")
                row = await cur.fetchone()
                total = int(row["cnt"]) if row else 0
        return {"seeded_racks": seeded, "total_racks": total}

    async def list_cargo_types(self) -> list[dict[str, Any]]:
        await self.ensure_defaults()
        sql = "SELECT id, code, name, length_m, width_m, height_m, weight_kg, model_key, color_hex FROM cargo_types ORDER BY created_at;"
        async with self._pool.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(sql)
                return [dict(r) for r in await cur.fetchall()]

    async def create_cargo_type(self, body: CargoTypeCreate) -> dict[str, Any]:
        sql = "INSERT INTO cargo_types (code, name, length_m, width_m, height_m, weight_kg, model_key, color_hex) VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id, code, name, length_m, width_m, height_m, weight_kg, model_key, color_hex;"
        async with self._pool.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(sql, (body.code, body.name, body.length_m, body.width_m, body.height_m, body.weight_kg, body.model_key, body.color_hex))
                row = await cur.fetchone()
                assert row is not None
                return dict(row)

    async def delete_cargo_type(self, cargo_id: UUID) -> bool:
        async with self._pool.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute("DELETE FROM cargo_types WHERE id = %s;", (cargo_id,))
                return cur.rowcount > 0

    async def list_racks(self) -> list[dict[str, Any]]:
        sql = "SELECT id, code, name, length_m, width_m, height_m, bays, levels, slots_per_bay, max_load_kg, pos_x, pos_z, rotation_deg, model_key, cargo_type_code, (bays * levels * slots_per_bay) AS total_slots FROM rack_layouts ORDER BY created_at;"
        async with self._pool.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(sql)
                return [dict(r) for r in await cur.fetchall()]

    async def create_rack(self, body: RackLayoutCreate) -> dict[str, Any]:
        sql = "INSERT INTO rack_layouts (code, name, length_m, width_m, height_m, bays, levels, slots_per_bay, max_load_kg, pos_x, pos_z, rotation_deg, model_key, cargo_type_code) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id, code, name, length_m, width_m, height_m, bays, levels, slots_per_bay, max_load_kg, pos_x, pos_z, rotation_deg, model_key, cargo_type_code, (bays * levels * slots_per_bay) AS total_slots;"
        async with self._pool.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(sql, (body.code, body.name, body.length_m, body.width_m, body.height_m, body.bays, body.levels, body.slots_per_bay, body.max_load_kg, body.pos_x, body.pos_z, body.rotation_deg, body.model_key, body.cargo_type_code))
                row = await cur.fetchone()
                assert row is not None
                return dict(row)

    async def update_rack_position(self, rack_id: UUID, body: RackPositionUpdate) -> dict[str, Any] | None:
        sql = "UPDATE rack_layouts SET pos_x = %s, pos_z = %s, rotation_deg = %s, updated_at = NOW() WHERE id = %s RETURNING id, code, name, length_m, width_m, height_m, bays, levels, slots_per_bay, max_load_kg, pos_x, pos_z, rotation_deg, model_key, cargo_type_code, (bays * levels * slots_per_bay) AS total_slots;"
        async with self._pool.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(sql, (body.pos_x, body.pos_z, body.rotation_deg, rack_id))
                row = await cur.fetchone()
                return dict(row) if row else None

    async def update_rack_meta(self, rack_id: UUID, body: RackMetaUpdate) -> dict[str, Any] | None:
        sql = "UPDATE rack_layouts SET name = %s, max_load_kg = %s, cargo_type_code = %s, updated_at = NOW() WHERE id = %s RETURNING id, code, name, length_m, width_m, height_m, bays, levels, slots_per_bay, max_load_kg, pos_x, pos_z, rotation_deg, model_key, cargo_type_code, (bays * levels * slots_per_bay) AS total_slots;"
        async with self._pool.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(sql, (body.name, body.max_load_kg, body.cargo_type_code, rack_id))
                row = await cur.fetchone()
                return dict(row) if row else None

    async def delete_rack(self, rack_id: UUID) -> bool:
        async with self._pool.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute("DELETE FROM rack_layouts WHERE id = %s;", (rack_id,))
                return cur.rowcount > 0

    async def list_roads(self) -> list[dict[str, Any]]:
        await self.ensure_defaults()
        sql = "SELECT id, code, name, pos_x, pos_z, length_m, width_m, is_locked, drivable_forklift FROM road_zones ORDER BY is_locked DESC, created_at;"
        async with self._pool.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(sql)
                return [dict(r) for r in await cur.fetchall()]

    async def create_road(self, body: RoadZoneCreate) -> dict[str, Any]:
        sql = "INSERT INTO road_zones (code, name, pos_x, pos_z, length_m, width_m, is_locked, drivable_forklift) VALUES (%s, %s, %s, %s, %s, %s, FALSE, %s) RETURNING id, code, name, pos_x, pos_z, length_m, width_m, is_locked, drivable_forklift;"
        async with self._pool.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(sql, (body.code, body.name, body.pos_x, body.pos_z, body.length_m, body.width_m, body.drivable_forklift))
                row = await cur.fetchone()
                assert row is not None
                return dict(row)

    async def delete_road(self, road_id: UUID) -> str:
        async with self._pool.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute("SELECT is_locked FROM road_zones WHERE id = %s;", (road_id,))
                row = await cur.fetchone()
                if not row:
                    return "not_found"
                if row["is_locked"]:
                    return "locked"
                await cur.execute("DELETE FROM road_zones WHERE id = %s;", (road_id,))
                return "deleted"
