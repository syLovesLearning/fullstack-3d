"""园区厂区位置与道路默认种子数据（680m × 420m）。"""

DEFAULT_CAMPUS_ZONES: list[dict] = [
    {"code": "RAW", "name": "1# 综合原料大仓", "zone_type": "warehouse", "x": 38, "y": 34, "w": 84, "h": 86, "color": "#1e3a8a",
     "sub_layout": [{"kind": "raw", "rx": 0.22, "ry": 0.78, "init": 1}, {"kind": "raw", "rx": 0.50, "ry": 0.58, "init": 0}, {"kind": "semi", "rx": 0.78, "ry": 0.78, "init": 2}, {"kind": "semi", "rx": 0.78, "ry": 0.39, "init": 5}, {"kind": "finished", "rx": 0.22, "ry": 0.40, "init": 3}],
     "doors": [{"id": "D1", "side": "bottom", "off": 0.25, "open": True}, {"id": "D2", "side": "bottom", "off": 0.72, "open": True}, {"id": "D3", "side": "left", "off": 0.55, "open": True}, {"id": "D4", "side": "right", "off": 0.55, "open": True}]},
    {"code": "SEMI_A", "name": "2# 加工制造大仓A", "zone_type": "warehouse", "x": 186, "y": 26, "w": 84, "h": 86, "color": "#0f766e",
     "sub_layout": [{"kind": "raw", "rx": 0.22, "ry": 0.78, "init": 2}, {"kind": "semi", "rx": 0.50, "ry": 0.58, "init": 4}, {"kind": "semi", "rx": 0.78, "ry": 0.78, "init": 1}, {"kind": "finished", "rx": 0.78, "ry": 0.39, "init": 6}, {"kind": "raw", "rx": 0.22, "ry": 0.40, "init": 0}],
     "doors": [{"id": "D1", "side": "bottom", "off": 0.2, "open": True}, {"id": "D2", "side": "bottom", "off": 0.5, "open": True}, {"id": "D3", "side": "bottom", "off": 0.8, "open": True}, {"id": "D4", "side": "left", "off": 0.55, "open": True}, {"id": "D5", "side": "right", "off": 0.55, "open": True}]},
    {"code": "SEMI_B", "name": "3# 绞线制造大仓B", "zone_type": "warehouse", "x": 382, "y": 28, "w": 84, "h": 86, "color": "#0369a1",
     "sub_layout": [{"kind": "raw", "rx": 0.22, "ry": 0.78, "init": 3}, {"kind": "semi", "rx": 0.50, "ry": 0.58, "init": 1}, {"kind": "finished", "rx": 0.78, "ry": 0.78, "init": 5}, {"kind": "semi", "rx": 0.78, "ry": 0.39, "init": 2}, {"kind": "finished", "rx": 0.22, "ry": 0.40, "init": 0}],
     "doors": [{"id": "D1", "side": "bottom", "off": 0.25, "open": True}, {"id": "D2", "side": "bottom", "off": 0.75, "open": True}, {"id": "D3", "side": "left", "off": 0.45, "open": True}, {"id": "D4", "side": "right", "off": 0.65, "open": True}, {"id": "D5", "side": "top", "off": 0.5, "open": True}]},
    {"code": "FINISHED", "name": "4# 成品集散大仓", "zone_type": "warehouse", "x": 544, "y": 36, "w": 88, "h": 86, "color": "#3730a3",
     "sub_layout": [{"kind": "semi", "rx": 0.22, "ry": 0.78, "init": 1}, {"kind": "finished", "rx": 0.50, "ry": 0.58, "init": 0}, {"kind": "finished", "rx": 0.78, "ry": 0.78, "init": 2}, {"kind": "finished", "rx": 0.78, "ry": 0.39, "init": 5}, {"kind": "raw", "rx": 0.22, "ry": 0.40, "init": 4}],
     "doors": [{"id": "D1", "side": "bottom", "off": 0.2, "open": True}, {"id": "D2", "side": "bottom", "off": 0.75, "open": True}, {"id": "D3", "side": "left", "off": 0.4, "open": True}, {"id": "D4", "side": "left", "off": 0.72, "open": True}, {"id": "D5", "side": "right", "off": 0.55, "open": True}, {"id": "D6", "side": "top", "off": 0.5, "open": True}]},
    {"code": "TRUCK", "name": "货车停放月台", "zone_type": "dock", "x": 34, "y": 292, "w": 96, "h": 86, "color": "#334155",
     "sub_layout": [],
     "doors": [{"id": "D1", "side": "top", "off": 0.22, "open": True}, {"id": "D2", "side": "top", "off": 0.45, "open": True}, {"id": "D3", "side": "top", "off": 0.68, "open": True}, {"id": "D4", "side": "right", "off": 0.5, "open": True}]},
    {"code": "WORKSHOP", "name": "5# 挤塑综合大仓", "zone_type": "warehouse", "x": 194, "y": 186, "w": 84, "h": 86, "color": "#7c2d12",
     "sub_layout": [{"kind": "raw", "rx": 0.22, "ry": 0.78, "init": 2}, {"kind": "semi", "rx": 0.50, "ry": 0.58, "init": 5}, {"kind": "semi", "rx": 0.78, "ry": 0.78, "init": 3}, {"kind": "finished", "rx": 0.78, "ry": 0.39, "init": 1}, {"kind": "raw", "rx": 0.22, "ry": 0.40, "init": 4}],
     "doors": [{"id": "D1", "side": "top", "off": 0.25, "open": True}, {"id": "D2", "side": "top", "off": 0.75, "open": True}, {"id": "D3", "side": "left", "off": 0.55, "open": True}, {"id": "D4", "side": "right", "off": 0.55, "open": True}, {"id": "D5", "side": "bottom", "off": 0.5, "open": True}]},
    {"code": "PACK", "name": "6# 包装暂存大仓", "zone_type": "warehouse", "x": 386, "y": 274, "w": 82, "h": 86, "color": "#4d7c0f",
     "sub_layout": [{"kind": "semi", "rx": 0.22, "ry": 0.78, "init": 0}, {"kind": "finished", "rx": 0.50, "ry": 0.58, "init": 3}, {"kind": "finished", "rx": 0.78, "ry": 0.78, "init": 6}, {"kind": "semi", "rx": 0.78, "ry": 0.39, "init": 2}, {"kind": "raw", "rx": 0.22, "ry": 0.40, "init": 1}],
     "doors": [{"id": "D1", "side": "top", "off": 0.3, "open": True}, {"id": "D2", "side": "top", "off": 0.7, "open": True}, {"id": "D3", "side": "left", "off": 0.55, "open": True}, {"id": "D4", "side": "right", "off": 0.55, "open": True}]},
    {"code": "AUX", "name": "7# 辅料周转大仓", "zone_type": "warehouse", "x": 552, "y": 236, "w": 78, "h": 86, "color": "#6d28d9",
     "sub_layout": [{"kind": "raw", "rx": 0.22, "ry": 0.78, "init": 4}, {"kind": "semi", "rx": 0.50, "ry": 0.58, "init": 1}, {"kind": "finished", "rx": 0.78, "ry": 0.78, "init": 2}, {"kind": "finished", "rx": 0.78, "ry": 0.39, "init": 0}, {"kind": "raw", "rx": 0.22, "ry": 0.40, "init": 5}],
     "doors": [{"id": "D1", "side": "top", "off": 0.25, "open": True}, {"id": "D2", "side": "top", "off": 0.75, "open": True}, {"id": "D3", "side": "left", "off": 0.5, "open": True}, {"id": "D4", "side": "right", "off": 0.5, "open": True}, {"id": "D5", "side": "bottom", "off": 0.5, "open": True}]},
]

DEFAULT_CAMPUS_ROADS: list[dict] = [
    {"code": "MAIN-AISLE", "name": "中央南北主干道", "x": 321, "y": 8, "w": 18, "h": 404, "is_locked": True},
    {"code": "RD-H1", "name": "北侧横向主干道", "x": 10, "y": 141, "w": 660, "h": 14, "is_locked": True},
    {"code": "RD-H2", "name": "南侧横向主干道", "x": 10, "y": 249, "w": 660, "h": 14, "is_locked": True},
    {"code": "RD-V1", "name": "东区纵向连接道", "x": 505, "y": 148, "w": 14, "h": 254, "is_locked": True},
    {"code": "WEST-RD", "name": "西侧环厂道", "x": 11, "y": 10, "w": 10, "h": 400, "is_locked": True},
    {"code": "EAST-RD", "name": "东侧环厂道", "x": 659, "y": 10, "w": 10, "h": 400, "is_locked": True},
    {"code": "NORTH-RD", "name": "北侧环厂道", "x": 12, "y": 9, "w": 656, "h": 10, "is_locked": True},
    {"code": "SOUTH-RD", "name": "南侧环厂道", "x": 12, "y": 391, "w": 656, "h": 10, "is_locked": True},
]
