# ARCHITECTURE.md — 系统分层架构（唯一真相源）

## 1. 后端分层单向解耦

| 层级 | 目录 | 核心职责 | 允许依赖 | 严禁依赖 |
| :--- | :--- | :--- | :--- | :--- |
| Controller | `backend/src/api/` | FastAPI 路由、JWT 鉴权、参数校验 | `repositories`, `schemas` | `infra` |
| Repositories | `backend/src/repositories/` | 显式异步 SQL（`psycopg3`）读写 | `infra`, `schemas` | `api` |
| Infra | `backend/src/infra/` | Postgres 连接池 | `config` | 任何上层模块 |
| Schemas | `backend/src/schemas/` | Pydantic v2 契约模型 | 标准库 | 上层业务 |

## 2. 前端职责边界

- `frontend/src/api/client.ts`：所有 REST 请求唯一收口（`fetch` + Bearer JWT），严禁 `.vue` 组件裸写 `fetch()`。
- `frontend/src/composables/useFactoryScene.ts`：唯一 Three.js 场景生命周期管理与渲染循环。
- `frontend/src/utils/`：纯 3D 几何体构建与共享材质池（与 Vue 解耦）。
- `frontend/src/components/*.vue`：纯 UI 展示与局部视图状态（单文件 `< 200` 行）。
