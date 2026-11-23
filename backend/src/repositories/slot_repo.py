"""WMS 库位主数据仓库：自愈建表与列升级、相邻库位合并/拆分、状态与策略批量维护。"""

from typing import Any
from uuid import UUID

from psycopg_pool import AsyncConnectionPool

from src.schemas.models import SlotBatchRequest, SlotUpdateRequest

_MIGRATE_SLOTS_SQL = [
    """
    CREATE TABLE IF NOT EXISTS warehouse_slots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        rack_id UUID NOT NULL REFERENCES rack_layouts(id) ON DELETE CASCADE,
        bay_idx INTEGER NOT NULL CHECK (bay_idx >= 1),
        level_idx INTEGER NOT NULL CHECK (level_idx >= 1),
        slot_idx INTEGER NOT NULL CHECK (slot_idx >= 1),
        slot_code TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'available',
        span_slots INTEGER NOT NULL DEFAULT 1,
        merged_into_slot_id UUID REFERENCES warehouse_slots(id) ON DELETE SET NULL,
        slot_type TEXT NOT NULL DEFAULT 'storage',
        abc_class TEXT NOT NULL DEFAULT 'B',
        allow_mixed BOOLEAN NOT NULL DEFAULT TRUE,
        max_weight_kg DOUBLE PRECISION NOT NULL DEFAULT 1000,
        remark TEXT NOT NULL DEFAULT '',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (rack_id, bay_idx, level_idx, slot_idx)
    );
    """,
    "ALTER TABLE warehouse_slots DROP CONSTRAINT IF EXISTS warehouse_slots_status_check;",
    "ALTER TABLE warehouse_slots ADD COLUMN IF NOT EXISTS span_slots INTEGER NOT NULL DEFAULT 1;",
    "ALTER TABLE warehouse_slots ADD COLUMN IF NOT EXISTS merged_into_slot_id UUID;",
    "ALTER TABLE warehouse_slots ADD COLUMN IF NOT EXISTS slot_type TEXT NOT NULL DEFAULT 'storage';",
    "ALTER TABLE warehouse_slots ADD COLUMN IF NOT EXISTS abc_class TEXT NOT NULL DEFAULT 'B';",
    "ALTER TABLE warehouse_slots ADD COLUMN IF NOT EXISTS allow_mixed BOOLEAN NOT NULL DEFAULT TRUE;",
    "ALTER TABLE warehouse_slots ADD COLUMN IF NOT EXISTS max_weight_kg DOUBLE PRECISION NOT NULL DEFAULT 1000;",
    "ALTER TABLE warehouse_slots ADD COLUMN IF NOT EXISTS remark TEXT NOT NULL DEFAULT '';",
    "UPDATE warehouse_slots SET status = 'available' WHERE status IN ('empty', 'occupied');",
]

_COLS = "id, rack_id, bay_idx, level_idx, slot_idx, slot_code, status, span_slots, merged_into_slot_id, slot_type, abc_class, allow_mixed, max_weight_kg, remark"


class SlotRepo:
    def __init__(self, pool: AsyncConnectionPool) -> None:
        self._pool = pool

    async def ensure_slots_for_all_racks(self, **_kwargs: Any) -> None:
        async with self._pool.connection() as conn:
            async with conn.cursor() as cur:
                for stmt in _MIGRATE_SLOTS_SQL:
                    await cur.execute(stmt)
                await cur.execute("SELECT id, code, bays, levels, slots_per_bay, max_load_kg FROM rack_layouts;")
                for rk in await cur.fetchall():
                    await cur.execute("SELECT COUNT(*) AS cnt FROM warehouse_slots WHERE rack_id = %s;", (rk["id"],))
                    if int((await cur.fetchone())["cnt"]) > 0:
                        continue
                    unit_w = round(float(rk["max_load_kg"]) / max(int(rk["slots_per_bay"]), 1), 1)
                    rows = []
                    for b in range(1, rk["bays"] + 1):
                        abc = "A" if b <= 4 else ("B" if b <= 10 else "C")
                        for lv in range(1, rk["levels"] + 1):
                            stype = "pick" if lv == 1 else "storage"
                            for s in range(1, rk["slots_per_bay"] + 1):
                                sc = f"{rk['code']}-B{b:02d}-L{lv}-P{s}"
                                rows.append((rk["id"], b, lv, s, sc, "available", 1, None, stype, abc, True, unit_w, ""))
                    await cur.executemany(
                        f"INSERT INTO warehouse_slots ({_COLS.removeprefix('id, ')}) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT (rack_id, bay_idx, level_idx, slot_idx) DO NOTHING;",
                        rows,
                    )

    async def list_slots(self, rack_id: UUID | None = None) -> list[dict[str, Any]]:
        await self.ensure_slots_for_all_racks()
        async with self._pool.connection() as conn:
            async with conn.cursor() as cur:
                if rack_id:
                    await cur.execute(f"SELECT {_COLS} FROM warehouse_slots WHERE rack_id = %s ORDER BY bay_idx, level_idx DESC, slot_idx;", (rack_id,))
                else:
                    await cur.execute(f"SELECT {_COLS} FROM warehouse_slots ORDER BY rack_id, bay_idx, level_idx DESC, slot_idx;")
                return [dict(r) for r in await cur.fetchall()]

    async def update_slot(self, slot_id: UUID, body: SlotUpdateRequest) -> tuple[dict[str, Any] | None, str | None]:
        async with self._pool.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute("SELECT status FROM warehouse_slots WHERE id = %s;", (slot_id,))
                cur_row = await cur.fetchone()
                if not cur_row:
                    return None, "库位不存在"
                if cur_row["status"] == "merged":
                    return None, "该库位已合并入主库位，请先在主库位执行拆分"
                await cur.execute(
                    f"UPDATE warehouse_slots SET status=%s, slot_type=%s, abc_class=%s, allow_mixed=%s, max_weight_kg=%s, remark=%s, updated_at=NOW() WHERE id=%s RETURNING {_COLS};",
                    (body.status, body.slot_type, body.abc_class, body.allow_mixed, body.max_weight_kg, body.remark, slot_id),
                )
                return dict(await cur.fetchone()), None

    async def merge_slot(self, slot_id: UUID) -> str | None:
        async with self._pool.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(f"SELECT {_COLS} FROM warehouse_slots WHERE id = %s;", (slot_id,))
                src = await cur.fetchone()
                if not src:
                    return "主库位不存在"
                if src["status"] != "available" or src["span_slots"] != 1:
                    return "仅可用且未合并的单库位允许发起合并"
                await cur.execute(
                    f"SELECT {_COLS} FROM warehouse_slots WHERE rack_id=%s AND bay_idx=%s AND level_idx=%s AND slot_idx=%s;",
                    (src["rack_id"], src["bay_idx"], src["level_idx"], src["slot_idx"] + 1),
                )
                nxt = await cur.fetchone()
                if not nxt:
                    return "同跨同层右侧无相邻库位，禁止跨立柱合并"
                if nxt["status"] != "available" or nxt["span_slots"] != 1:
                    return "相邻库位必须同为可用单库位才可合并"
                new_max = float(src["max_weight_kg"]) + float(nxt["max_weight_kg"])
                await cur.execute("UPDATE warehouse_slots SET span_slots=2, max_weight_kg=%s, remark=%s, updated_at=NOW() WHERE id=%s;", (new_max, f"合并含 {nxt['slot_code']}", slot_id))
                await cur.execute("UPDATE warehouse_slots SET status='merged', merged_into_slot_id=%s, updated_at=NOW() WHERE id=%s;", (slot_id, nxt["id"]))
                return None

    async def split_slot(self, slot_id: UUID) -> str | None:
        async with self._pool.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(f"SELECT {_COLS} FROM warehouse_slots WHERE id = %s;", (slot_id,))
                src = await cur.fetchone()
                if not src or src["span_slots"] != 2:
                    return "仅已合并的双格库位可执行拆分"
                half_w = round(float(src["max_weight_kg"]) / 2.0, 1)
                await cur.execute("UPDATE warehouse_slots SET span_slots=1, max_weight_kg=%s, remark='', updated_at=NOW() WHERE id=%s;", (half_w, slot_id))
                await cur.execute("UPDATE warehouse_slots SET status='available', merged_into_slot_id=NULL, max_weight_kg=%s, updated_at=NOW() WHERE merged_into_slot_id=%s;", (half_w, slot_id))
                return None

    async def batch_slots(self, body: SlotBatchRequest) -> int:
        conds = ["rack_id = %s", "status <> 'merged'"]
        params: list[Any] = [body.rack_id]
        if body.bay_idx is not None:
            conds.append("bay_idx = %s"); params.append(body.bay_idx)
        if body.level_idx is not None:
            conds.append("level_idx = %s"); params.append(body.level_idx)
        where = " AND ".join(conds)
        if body.action in ("lock", "unlock", "disable"):
            st = {"lock": "locked", "unlock": "available", "disable": "disabled"}[body.action]
            sql = f"UPDATE warehouse_slots SET status = %s, updated_at = NOW() WHERE {where};"
            q_params = [st, *params]
        elif body.action == "set_abc":
            sql = f"UPDATE warehouse_slots SET abc_class = %s, updated_at = NOW() WHERE {where};"
            q_params = [body.abc_class or "B", *params]
        else:
            sql = f"UPDATE warehouse_slots SET slot_type = %s, updated_at = NOW() WHERE {where};"
            q_params = [body.slot_type or "storage", *params]
        async with self._pool.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(sql, tuple(q_params))
                return cur.rowcount
