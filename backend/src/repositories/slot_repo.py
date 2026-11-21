"""货位台账数据仓库（显式异步 SQL：按货架尺寸同步、查询、占用变更与统计）。"""

import random
from typing import Any
from uuid import UUID

from psycopg_pool import AsyncConnectionPool

from src.schemas.models import SlotUpdate

_SLOT_SELECT = """
    SELECT s.id, s.rack_id, r.code AS rack_code, s.code, s.bay_no, s.level_no, s.slot_no,
           s.status, s.cargo_type_code, c.name AS cargo_name, c.color_hex AS cargo_color_hex, s.batch_no
    FROM rack_slots s
    JOIN rack_layouts r ON r.id = s.rack_id
    LEFT JOIN cargo_types c ON c.code = s.cargo_type_code
"""


class SlotRepo:
    def __init__(self, pool: AsyncConnectionPool) -> None:
        self._pool = pool

    async def _sync(self, rack_id: UUID | None, inherit_cargo: bool = False) -> dict[str, int]:
        """补齐缺失货位并回收超出当前跨/层/位的货位；inherit_cargo 仅用于 seed-demo。"""
        scope = "r.id = %(rack_id)s" if rack_id else "TRUE"
        extra = "AND r.id = %(rack_id)s" if rack_id else ""
        params: dict[str, Any] = {"inherit": inherit_cargo}
        if rack_id:
            params["rack_id"] = rack_id
        insert_sql = f"""
            INSERT INTO rack_slots (rack_id, code, bay_no, level_no, slot_no, status, cargo_type_code, batch_no)
            SELECT r.id,
                   r.code || '-B' || LPAD((gb.b + 1)::text, 2, '0')
                          || '-L' || LPAD((gl.l + 1)::text, 2, '0')
                          || '-S' || LPAD((gs.s + 1)::text, 2, '0'),
                   gb.b, gl.l, gs.s,
                   CASE WHEN %(inherit)s AND r.cargo_type_code IS NOT NULL THEN 'occupied' ELSE 'empty' END,
                   CASE WHEN %(inherit)s THEN r.cargo_type_code ELSE NULL END,
                   CASE WHEN %(inherit)s AND r.cargo_type_code IS NOT NULL THEN 'DEMO-SEED' ELSE NULL END
            FROM rack_layouts r
            CROSS JOIN LATERAL generate_series(0, r.bays - 1) AS gb(b)
            CROSS JOIN LATERAL generate_series(0, r.levels - 1) AS gl(l)
            CROSS JOIN LATERAL generate_series(0, r.slots_per_bay - 1) AS gs(s)
            WHERE {scope}
            ON CONFLICT (rack_id, bay_no, level_no, slot_no) DO NOTHING;
        """
        delete_sql = f"""
            DELETE FROM rack_slots s
            USING rack_layouts r
            WHERE r.id = s.rack_id
              AND (s.bay_no >= r.bays OR s.level_no >= r.levels OR s.slot_no >= r.slots_per_bay)
              {extra};
        """
        count_sql = "SELECT COUNT(*) AS cnt FROM rack_slots"
        if rack_id:
            count_sql += " WHERE rack_id = %(rack_id)s"
        async with self._pool.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(insert_sql, params)
                created = max(cur.rowcount, 0)
                delete_params = {"rack_id": rack_id} if rack_id else {}
                await cur.execute(delete_sql, delete_params)
                removed = max(cur.rowcount, 0)
                await cur.execute(count_sql, delete_params)
                row = await cur.fetchone()
                total = int(row["cnt"]) if row else 0
        return {"created": created, "removed": removed, "total": total}

    async def sync_for_rack(self, rack_id: UUID) -> dict[str, int]:
        return await self._sync(rack_id)

    async def sync_all(self, inherit_cargo: bool = False) -> dict[str, int]:
        return await self._sync(None, inherit_cargo=inherit_cargo)

    async def fill_demo_racks(self) -> int:
        """把默认 8 排演示货架的空货位置为占用（仅供 seed-demo 显式重置使用）。"""
        demo_codes = ("RK-L1", "RK-L2", "RK-L3", "RK-L4", "RK-R1", "RK-R2", "RK-R3", "RK-R4")
        sql = """
            UPDATE rack_slots s
            SET status = 'occupied', cargo_type_code = r.cargo_type_code,
                batch_no = 'DEMO-SEED', updated_at = NOW()
            FROM rack_layouts r
            WHERE s.rack_id = r.id
              AND r.code = ANY(%s)
              AND r.cargo_type_code IS NOT NULL
              AND s.status = 'empty';
        """
        async with self._pool.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(sql, (list(demo_codes),))
                return max(cur.rowcount, 0)

    async def randomize_demo_occupancy(self, rack_codes: list[str]) -> tuple[int, int]:
        """把指定演示货架的货位随机化为占用/空/维护/锁定，返回 (占用数, 总数)。"""
        if not rack_codes:
            return 0, 0
        async with self._pool.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "SELECT s.id, r.cargo_type_code FROM rack_slots s JOIN rack_layouts r ON r.id = s.rack_id "
                    "WHERE r.code = ANY(%s);",
                    (rack_codes,),
                )
                rows = await cur.fetchall()
                updates = []
                occupied = 0
                for row in rows:
                    roll = random.random()
                    if roll < 0.03:
                        status, cargo, batch = "maintenance", None, None
                    elif roll < 0.06:
                        status, cargo, batch = "locked", None, None
                    elif row["cargo_type_code"] and roll < 0.06 + random.uniform(0.45, 0.8):
                        status, batch = "occupied", f"LOT-{random.randint(1, 999):03d}"
                        cargo = row["cargo_type_code"]
                        occupied += 1
                    else:
                        status, cargo, batch = "empty", None, None
                    updates.append((status, cargo, batch, row["id"]))
                await cur.executemany(
                    "UPDATE rack_slots SET status = %s, cargo_type_code = %s, batch_no = %s, updated_at = NOW() WHERE id = %s;",
                    updates,
                )
        return occupied, len(rows)

    async def list_slots(self, rack_id: UUID | None = None) -> list[dict[str, Any]]:
        where = "WHERE s.rack_id = %(rack_id)s" if rack_id else ""
        sql = f"{_SLOT_SELECT} {where} ORDER BY r.code, s.level_no, s.bay_no, s.slot_no;"
        async with self._pool.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(sql, {"rack_id": rack_id} if rack_id else {})
                return [dict(r) for r in await cur.fetchall()]

    async def update_slot(self, slot_id: UUID, body: SlotUpdate) -> tuple[str, dict[str, Any] | None]:
        """按 PATCH 语义计算最终状态；返回 (状态码, 货位行)。"""
        data = body.model_dump(exclude_unset=True)
        async with self._pool.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "SELECT status, cargo_type_code, batch_no FROM rack_slots WHERE id = %s;",
                    (slot_id,),
                )
                current = await cur.fetchone()
                if not current:
                    return "not_found", None
                status = data.get("status", current["status"])
                cargo = data["cargo_type_code"] if "cargo_type_code" in data else current["cargo_type_code"]
                batch = data["batch_no"] if "batch_no" in data else current["batch_no"]
                if status == "empty":
                    cargo, batch = None, None
                if cargo:
                    await cur.execute("SELECT 1 FROM cargo_types WHERE code = %s;", (cargo,))
                    if not await cur.fetchone():
                        return "cargo_not_found", None
                if status == "occupied" and not cargo:
                    return "cargo_required", None
                await cur.execute(
                    """
                    UPDATE rack_slots
                    SET status = %s, cargo_type_code = %s, batch_no = %s, updated_at = NOW()
                    WHERE id = %s;
                    """,
                    (status, cargo, batch, slot_id),
                )
                await cur.execute(f"{_SLOT_SELECT} WHERE s.id = %s;", (slot_id,))
                row = await cur.fetchone()
                return "ok", dict(row) if row else None

    async def stats(self) -> dict[str, Any]:
        sql = """
            SELECT COUNT(*) AS total,
                   COUNT(*) FILTER (WHERE status = 'occupied') AS occupied,
                   COUNT(*) FILTER (WHERE status = 'empty') AS empty,
                   COUNT(*) FILTER (WHERE status = 'maintenance') AS maintenance,
                   COUNT(*) FILTER (WHERE status = 'locked') AS locked
            FROM rack_slots;
        """
        async with self._pool.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(sql)
                row = await cur.fetchone()
        total = int(row["total"]) if row else 0
        occupied = int(row["occupied"]) if row else 0
        return {
            "total": total,
            "occupied": occupied,
            "empty": int(row["empty"]) if row else 0,
            "maintenance": int(row["maintenance"]) if row else 0,
            "locked": int(row["locked"]) if row else 0,
            "occupancy_rate": round(occupied * 100 / total, 1) if total else 0.0,
        }
