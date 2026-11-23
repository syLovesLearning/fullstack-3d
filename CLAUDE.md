# CLAUDE.md — Monorepo 全局记忆入口（唯一真相源）

> **所有 AI 编程助手必读**：动手改代码前，先读本文件与 `docs/CODE_INDEX.md` 精准定位目标文件，禁止全仓盲目扫描源码。

## 1. 仓库拓扑

- `run.py`：Windows / macOS 跨平台一键启动与单进程部署入口（`--prod`）。
- `backend/`：Python 3.12 + FastAPI + PostgreSQL (`psycopg3` 显式异步 SQL)。
- `frontend/`：Vue 3.5 + TypeScript + Vite + Three.js（3D 厂区数字孪生 + 仓储维护 + 接口测试台）。
- `docs/`：`ARCHITECTURE.md`（分层设计）、`API_SPEC.md`（前后端唯一契约）、`CODE_INDEX.md`（AST 自动代码地图）。
- `scripts/`：`gen_code_index.py`（刷新代码地图）。

## 2. 全局工程铁律

1. **先定位、后读码**：先查 `docs/CODE_INDEX.md` 找到导出符号与文件路径，只打开需要修改的 1~2 个文件。
2. **契约先行**：任何 REST 路由变更，必须先更新 `docs/API_SPEC.md`，再改 `backend/src/api/` 与 `frontend/src/api/`。
3. **禁止黑盒封装**：严禁引入 ORM；保持显式异步 SQL（`psycopg3`）与单文件 < 200 行。
4. **改后刷新索引**：新增或重命名文件/函数后，执行 `python3 scripts/gen_code_index.py` 刷新 `docs/CODE_INDEX.md`。

## 3. 常用命令

- 跨平台一键开发：`python run.py`
- 跨平台单进程部署：`python run.py --prod`
- 后端测试：`cd backend && make test`
- 刷新代码地图：`python3 scripts/gen_code_index.py`
