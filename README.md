# 厂区数字孪生与仓储维护平台（FastAPI + Vue 3 + Three.js）

极简全栈底座：保留 JWT 鉴权与接口测试台，集成 90m × 140m 工业厂区 3D 数字孪生与仓储维护占位模块。

## 1. 环境准备

- Python 3.11+、PostgreSQL（本地默认 `postgresql://shenyang@localhost:5432/rag_db`）
- Node.js 18+ 与 `pnpm`

## 2. 启动后端（终端 1）

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env
make migrate && make dev
```

后端默认监听 `http://127.0.0.1:8000`（`make test` 可运行接口冒烟测试）。

## 3. 启动前端（终端 2）

```bash
cd frontend
pnpm install
pnpm dev
```

打开浏览器访问 `http://localhost:5173`，页面会自动完成 `dev-login` 鉴权并进入：
<<<<<<< HEAD
1. **3D 厂区孪生**：90m × 140m 工业厂区、预留龙门吊轨道、货架与电缆盘场景；按货位台账真实占用渲染货物（空货位只留托盘），HUD 显示总库位与已占数量；空白区域按当前布局自动摆放机器人工作站、AGV、加工中心、电缆收放线机、视觉检测线、空压机、剪叉升降机与维修工作台；支持「搬运演示」自动规划 A* 避障路径，叉车从源货架取货、行驶到目标货架放货，并实时回写货位台账（切换 Tab 自动保活 WebGL 上下文）。
2. **仓储维护**：货品类型定义、货架尺寸/库位/承重与平面拖拽布局、货位台账（状态 / 货品 / 批次，支持按货架同步与占用统计）、固定道路维护；支持「随机重排布局」生成短货架与多方向叉车通道，并随机化占用/维护/锁定状态。
=======
1. **3D 厂区孪生**：90m × 140m 工业厂区、预留龙门吊轨道、货架与电缆盘场景（切换 Tab 自动保活 WebGL 上下文）。
2. **仓储维护**：已对接 `GET /api/v1/warehouse/summary` 骨架接口，后续增量接入货位台账与 3D 联动。
>>>>>>> ini
3. **接口测试台**：一键回归 `/health`、`/api/v1/auth/me` 与 `/api/v1/warehouse/summary`。
