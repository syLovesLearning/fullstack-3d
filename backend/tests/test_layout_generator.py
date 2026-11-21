"""随机布局生成器几何测试：围墙边界、货架/道路互不重叠、保留用户货架。"""

import random

from src.repositories.layout_repo import PLANT_L, PLANT_W, _overlaps, _rack_box, _road_box, build_random_layout

USER_RACK = {"code": "RK-A01", "pos_x": -18.0, "pos_z": 0.0, "length_m": 12.0, "width_m": 1.6, "rotation_deg": 0}
MAIN_ROAD = {"code": "MAIN-AISLE", "pos_x": 0.0, "pos_z": 0.0, "length_m": 140.0, "width_m": 8.0}


def test_random_layout_has_no_overlaps() -> None:
    for seed in range(300):
        layout = build_random_layout([USER_RACK], [MAIN_ROAD], random.Random(seed))
        racks = layout["racks"]
        roads = [MAIN_ROAD, *layout["new_roads"]]
        assert 10 <= len(racks) <= 14
        boxes = [_rack_box(r) for r in racks]
        for i, box in enumerate(boxes):
            assert abs(box[0]) + box[2] / 2 <= PLANT_W / 2
            assert abs(box[1]) + box[3] / 2 <= PLANT_L / 2
            assert not _overlaps(box, _rack_box(USER_RACK), gap=0)
            for other in boxes[i + 1:]:
                assert not _overlaps(box, other, gap=0)
            for road in roads:
                assert not _overlaps(box, _road_box(road), gap=0)
