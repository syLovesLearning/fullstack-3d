"""随机演示布局生成：重排演示货架与道路，保留用户自建数据并做几何避让。"""

import random
from typing import Any

from psycopg_pool import AsyncConnectionPool

PLANT_W, PLANT_L, MARGIN = 90.0, 140.0, 1.5
LEGACY_DEMO_CODES = ("RK-L1", "RK-L2", "RK-L3", "RK-L4", "RK-R1", "RK-R2", "RK-R3", "RK-R4")
DEMO_RACK_PREFIX = "RK-D"
DEMO_ROAD_PREFIX = "RD-"
CARGO_CODES = ("CARGO-BOX", "CARGO-CRATE", "CARGO-DRUM", "CARGO-REEL")
MODEL_KEYS = ("rack_heavy_4l", "rack_cantilever", "rack_drive_in")

Box = tuple[float, float, float, float]  # pos_x, pos_z, span_x, span_z


def _overlaps(a: Box, b: Box, gap: float = 0.8) -> bool:
    return abs(a[0] - b[0]) * 2 < a[2] + b[2] + gap and abs(a[1] - b[1]) * 2 < a[3] + b[3] + gap


def _rack_box(r: dict[str, Any]) -> Box:
    span = (r["length_m"], r["width_m"]) if r.get("rotation_deg") == 90 else (r["width_m"], r["length_m"])
    return (r["pos_x"], r["pos_z"], span[0], span[1])


def _road_box(r: dict[str, Any]) -> Box:
    return (r["pos_x"], r["pos_z"], r["width_m"], r["length_m"])


def _candidate(road: dict[str, Any], racks: list[dict[str, Any]]) -> bool:
    return all(not _overlaps(_road_box(road), _rack_box(r)) for r in racks)


def _random_roads(rng: random.Random, preserved_racks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    roads: list[dict[str, Any]] = []
    z1, z2 = rng.uniform(-50, -30), rng.uniform(30, 50)
    for code, name, z in (("RD-H1", "北侧横向作业通道", z1), ("RD-H2", "南侧横向作业通道", z2)):
        for _ in range(40):
            road = {"code": code, "name": name, "pos_x": 0.0, "pos_z": z,
                    "length_m": 6.0, "width_m": rng.uniform(80, 86), "drivable_forklift": True}
            if _candidate(road, preserved_racks):
                roads.append(road)
                break
    side = -1 if rng.random() < 0.5 else 1
    for _ in range(40):
        road = {"code": "RD-V1", "name": "侧向叉车通道", "pos_x": side * rng.uniform(23, 32), "pos_z": rng.uniform(-20, 20),
                "length_m": rng.uniform(58, 84), "width_m": rng.uniform(5, 7), "drivable_forklift": True}
        if _candidate(road, preserved_racks):
            roads.append(road)
            break
    return roads


def _random_racks(rng: random.Random, preserved_racks: list[dict[str, Any]], roads: list[dict[str, Any]]) -> list[dict[str, Any]]:
    placed: list[dict[str, Any]] = []
    for _ in range(rng.randint(10, 14)):
        rotation = 0 if rng.random() < 0.65 else 90
        length, width = round(rng.uniform(10, 24), 1), round(rng.uniform(1.8, 3.0), 1)
        span_x, span_z = (length, width) if rotation == 90 else (width, length)
        rack = {
            "code": f"{DEMO_RACK_PREFIX}{len(placed) + 1:02d}",
            "name": f"随机货架 {len(placed) + 1:02d}",
            "length_m": length, "width_m": width,
            "height_m": round(rng.uniform(5.2, 8.0), 1),
            "bays": max(3, min(8, int(round(length / 3.2)))), "levels": rng.randint(3, 5),
            "slots_per_bay": rng.randint(2, 3), "max_load_kg": float(rng.randrange(1500, 3501, 100)),
            "pos_x": 0.0, "pos_z": 0.0, "rotation_deg": rotation,
            "model_key": rng.choice(MODEL_KEYS), "cargo_type_code": rng.choice(CARGO_CODES),
        }
        obstacles = [_rack_box(r) for r in preserved_racks + placed] + [_road_box(r) for r in roads]
        for _ in range(400):
            x = round(rng.uniform(-PLANT_W / 2 + MARGIN + span_x / 2, PLANT_W / 2 - MARGIN - span_x / 2), 1)
            z = round(rng.uniform(-PLANT_L / 2 + MARGIN + span_z / 2, PLANT_L / 2 - MARGIN - span_z / 2), 1)
            box = (x, z, span_x, span_z)
            if all(not _overlaps(box, o) for o in obstacles):
                rack["pos_x"], rack["pos_z"] = x, z
                placed.append(rack)
                break
    return placed


def build_random_layout(existing_racks: list[dict[str, Any]], existing_roads: list[dict[str, Any]],
                       rng: random.Random | None = None) -> dict[str, Any]:
    rng = rng or random.Random()
    preserved_racks = [r for r in existing_racks if not _is_demo_rack(r["code"])]
    preserved_roads = [r for r in existing_roads if not r["code"].startswith(DEMO_ROAD_PREFIX) and r["code"] != "MAIN-AISLE"]
    main = next((r for r in existing_roads if r["code"] == "MAIN-AISLE"), None)
    if main is None:
        main = {"code": "MAIN-AISLE", "name": "中央安全主干道（固定8m）", "pos_x": 0.0, "pos_z": 0.0,
                "length_m": 140.0, "width_m": 8.0, "is_locked": True, "drivable_forklift": True}
    new_roads = _random_roads(rng, preserved_racks)
    roads = [main, *preserved_roads, *new_roads]
    racks = _random_racks(rng, preserved_racks, roads)
    return {"racks": racks, "new_roads": new_roads, "main": main}


def _is_demo_rack(code: str) -> bool:
    return code in LEGACY_DEMO_CODES or code.startswith(DEMO_RACK_PREFIX)


class LayoutRepo:
    def __init__(self, pool: AsyncConnectionPool) -> None:
        self._pool = pool

    async def replace_demo_layout(self) -> dict[str, Any]:
        """删除旧演示货架/道路并按新随机布局重建；用户自建货架与道路保留。"""
        async with self._pool.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute("SELECT code, pos_x, pos_z, length_m, width_m, rotation_deg FROM rack_layouts;")
                existing_racks = [dict(r) for r in await cur.fetchall()]
                await cur.execute("SELECT code, name, pos_x, pos_z, length_m, width_m, is_locked, drivable_forklift FROM road_zones;")
                existing_roads = [dict(r) for r in await cur.fetchall()]
                layout = build_random_layout(existing_racks, existing_roads)

                await cur.execute("DELETE FROM rack_layouts WHERE code = ANY(%s) OR code LIKE 'RK-D%%';", (list(LEGACY_DEMO_CODES),))
                await cur.execute("DELETE FROM road_zones WHERE code LIKE 'RD-%';")
                if not any(r["code"] == "MAIN-AISLE" for r in existing_roads):
                    await cur.execute(
                        "INSERT INTO road_zones (code, name, pos_x, pos_z, length_m, width_m, is_locked, drivable_forklift) "
                        "VALUES ('MAIN-AISLE', '中央安全主干道（固定8m）', 0, 0, 140, 8, TRUE, TRUE);"
                    )
                for rd in layout["new_roads"]:
                    await cur.execute(
                        "INSERT INTO road_zones (code, name, pos_x, pos_z, length_m, width_m, is_locked, drivable_forklift) "
                        "VALUES (%s, %s, %s, %s, %s, %s, FALSE, %s);",
                        (rd["code"], rd["name"], rd["pos_x"], rd["pos_z"], rd["length_m"], rd["width_m"], rd["drivable_forklift"]),
                    )
                for rk in layout["racks"]:
                    await cur.execute(
                        "INSERT INTO rack_layouts (code, name, length_m, width_m, height_m, bays, levels, slots_per_bay, "
                        "max_load_kg, pos_x, pos_z, rotation_deg, model_key, cargo_type_code) "
                        "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);",
                        (rk["code"], rk["name"], rk["length_m"], rk["width_m"], rk["height_m"], rk["bays"], rk["levels"],
                         rk["slots_per_bay"], rk["max_load_kg"], rk["pos_x"], rk["pos_z"], rk["rotation_deg"],
                         rk["model_key"], rk["cargo_type_code"]),
                    )
                await cur.execute("SELECT COUNT(*) AS cnt FROM rack_layouts;")
                row = await cur.fetchone()
                total = int(row["cnt"]) if row else 0
        return {"racks": len(layout["racks"]), "roads": len(layout["new_roads"]), "total_racks": total,
                "demo_rack_codes": [r["code"] for r in layout["racks"]]}
