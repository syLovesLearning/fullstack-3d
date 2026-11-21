# backend/CLAUDE.md — 后端记忆规范 (FastAPI + PostgreSQL)

> 先读顶层 `../CLAUDE.md` 与 `../docs/API_SPEC.md`。

## 1. 后端开发铁律

1. **禁止引入 ORM**：使用 `psycopg3` 原生异步连接池与显式 SQL。
2. **契约先行**：新增仓储维护接口前，先补充 `../docs/API_SPEC.md` 与 `src/schemas/models.py`。
3. **单文件 < 200 行**：保持路由、仓库、模型职责单一。
