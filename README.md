# 厂区数字孪生与仓储维护平台（FastAPI + Vue 3 + Three.js）

极简全栈底座：保留 JWT 鉴权与接口测试台，集成 90m × 140m 工业厂区 3D 数字孪生与仓储维护模块。

## 1. 环境准备

- Python 3.11+、PostgreSQL（确保数据库服务已启动；若自定义账密请先配置 `backend/.env` 中的 `PG_DSN`）
- Node.js 18+ 与 `pnpm`（`npm i -g pnpm`）

## 2. 一键启动（Windows / macOS 通用）

在仓库根目录执行：

```bash
# 开发模式（自动建 venv/依赖、自动建库建表，并拉起后端 8000 + 前端 5173）
python run.py

# 生产/单机部署模式（自动构建 frontend/dist，由 FastAPI 单进程托管在 8000 端口）
python run.py --prod
```

## 3. 分终端手动启动（可选）

- 后端：`cd backend && python -m src.infra.migrate && uvicorn src.main:app --reload --port 8000`
- 前端：`cd frontend && pnpm install && pnpm dev`
