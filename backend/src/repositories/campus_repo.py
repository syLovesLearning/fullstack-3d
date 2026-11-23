"""园区厂区位置与道路维护数据仓库（显式异步 SQL + 自愈建表）。"""

import json
import random
from typing import Any
from uuid import UUID

from psycopg_pool import AsyncConnectionPool

from src.repositories.campus_defaults import DEFAULT_CAMPUS_ROADS, DEFAULT_CAMPUS_ZONES
from src.schemas.campus_models import CampusRoadCreate, CampusZoneUpdate


class CampusRepo:
    def __init__(self, pool: AsyncConnectionPool) -> None:
        self._pool = pool

    async def ensure_schema_and_defaults(self) -> None:
        async with self._pool.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS campus_zones (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        code TEXT NOT NULL UNIQUE,
                        name TEXT NOT NULL,
                        zone_type TEXT NOT NULL DEFAULT 'warehouse',
                        x DOUBLE PRECISION NOT NULL,
                        y DOUBLE PRECISION NOT NULL,
                        w DOUBLE PRECISION NOT NULL,
                        h DOUBLE PRECISION NOT NULL,
                        color TEXT NOT NULL DEFAULT '#1e3a8a',
                        doors_json JSONB NOT NULL DEFAULT '[]'::jsonb,
                        sub_layout_json JSONB NOT NULL DEFAULT '[]'::jsonb,
                        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    );
                    CREATE TABLE IF NOT EXISTS campus_roads (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        code TEXT NOT NULL UNIQUE,
                        name TEXT NOT NULL,
                        x DOUBLE PRECISION NOT NULL,
                        y DOUBLE PRECISION NOT NULL,
                        w DOUBLE PRECISION NOT NULL,
                        h DOUBLE PRECISION NOT NULL,
                        is_locked BOOLEAN NOT NULL DEFAULT FALSE,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    );
                    """
                )
                for z in DEFAULT_CAMPUS_ZONES:
                    await cur.execute(
                        """
                        INSERT INTO campus_zones (code, name, zone_type, x, y, w, h, color, doors_json, sub_layout_json)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb)
                        ON CONFLICT (code) DO NOTHING;
                        """,
                        (z["code"], z["name"], z["zone_type"], z["x"], z["y"], z["w"], z["h"], z["color"], json.dumps(z["doors"]), json.dumps(z["sub_layout"])),
                    )
                for r in DEFAULT_CAMPUS_ROADS:
                    await cur.execute(
                        """
                        INSERT INTO campus_roads (code, name, x, y, w, h, is_locked)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (code) DO NOTHING;
                        """,
                        (r["code"], r["name"], r["x"], r["y"], r["w"], r["h"], r["is_locked"]),
                    )

    @staticmethod
    def _row_to_zone(row: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": row["id"], "code": row["code"], "name": row["name"], "zone_type": row["zone_type"],
            "x": row["x"], "y": row["y"], "w": row["w"], "h": row["h"], "color": row["color"],
            "doors": row["doors_json"] or [], "sub_layout": row["sub_layout_json"] or [],
        }

    async def list_zones(self) -> list[dict[str, Any]]:
        await self.ensure_schema_and_defaults()
        async with self._pool.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute("SELECT id, code, name, zone_type, x, y, w, h, color, doors_json, sub_layout_json FROM campus_zones ORDER BY code;")
                return [self._row_to_zone(dict(r)) for r in await cur.fetchall()]

    async def update_zone(self, zone_id: UUID, body: CampusZoneUpdate) -> dict[str, Any] | None:
        await self.ensure_schema_and_defaults()
        fields, params = [], []
        if body.name is not None:
            fields.append("name = %s"); params.append(body.name)
        for key in ("x", "y", "w", "h"):
            val = getattr(body, key)
            if val is not None:
                fields.append(f"{key} = %s"); params.append(val)
        if body.doors is not None:
            fields.append("doors_json = %s::jsonb"); params.append(json.dumps([d.model_dump() for d in body.doors]))
        if not fields:
            fields.append("updated_at = NOW()")
        else:
            fields.append("updated_at = NOW()")
        params.append(zone_id)
        sql = f"UPDATE campus_zones SET {', '.join(fields)} WHERE id = %s RETURNING id, code, name, zone_type, x, y, w, h, color, doors_json, sub_layout_json;"
        async with self._pool.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(sql, tuple(params))
                row = await cur.fetchone()
                return self._row_to_zone(dict(row)) if row else None

    async def reset_zones(self, randomize: bool = False) -> list[dict[str, Any]]:
        await self.ensure_schema_and_defaults()
        roads = await self.list_roads()
        placed: list[dict[str, float]] = []
        async with self._pool.connection() as conn:
            async with conn.cursor() as cur:
                for z in DEFAULT_CAMPUS_ZONES:
                    nx, ny = float(z["x"]), float(z["y"])
                    if randomize:
                        for _ in range(300):
                            rx = (28 + random.random() * 160 if random.random() < 0.5 else 360 + random.random() * 190) if z["zone_type"] == "dock" else 28 + random.random() * (680 - z["w"] - 56)
                            ry = 276 + random.random() * (420 - z["h"] - 294) if z["zone_type"] == "dock" else 26 + random.random() * (420 - z["h"] - 52)
                            hit_road = any(rx < r["x"] + r["w"] + 4 and rx + z["w"] > r["x"] - 4 and ry < r["y"] + r["h"] + 4 and ry + z["h"] > r["y"] - 4 for r in roads)
                            hit_other = any(rx < p["x"] + p["w"] + 16 and rx + z["w"] + 16 > p["x"] and ry < p["y"] + p["h"] + 16 and ry + z["h"] + 16 > p["y"] for p in placed)
                            if not hit_road and not hit_other:
                                nx, ny = round(rx), round(ry)
                                break
                    placed.append({"x": nx, "y": ny, "w": z["w"], "h": z["h"]})
                    await cur.execute("UPDATE campus_zones SET x = %s, y = %s, updated_at = NOW() WHERE code = %s;", (nx, ny, z["code"]))
        return await self.list_zones()

    async def list_roads(self) -> list[dict[str, Any]]:
        await self.ensure_schema_and_defaults()
        async with self._pool.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute("SELECT id, code, name, x, y, w, h, is_locked FROM campus_roads ORDER BY is_locked DESC, created_at;")
                return [dict(r) for r in await cur.fetchall()]

    async def create_road(self, body: CampusRoadCreate) -> dict[str, Any]:
        await self.ensure_schema_and_defaults()
        sql = "INSERT INTO campus_roads (code, name, x, y, w, h, is_locked) VALUES (%s, %s, %s, %s, %s, %s, FALSE) RETURNING id, code, name, x, y, w, h, is_locked;"
        async with self._pool.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(sql, (body.code, body.name, body.x, body.y, body.w, body.h))
                row = await cur.fetchone()
                assert row is not None
                return dict(row)

    async def delete_road(self, road_id: UUID) -> str:
        async with self._pool.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute("SELECT is_locked FROM campus_roads WHERE id = %s;", (road_id,))
                row = await cur.fetchone()
                if row is None:
                    return "not_found"
                if row["is_locked"]:
                    return "locked"
                await cur.execute("DELETE FROM campus_roads WHERE id = %s;", (road_id,))
                return "deleted"
