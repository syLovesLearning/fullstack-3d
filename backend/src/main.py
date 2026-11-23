"""FastAPI 应用入口：托管 Postgres 连接池、API 路由、全局异常日志及生产态前端静态产物。"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
import logging
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from src.api import auth, campus, slots, warehouse
from src.config import settings
from src.infra.postgres import close_pg_pool, create_pg_pool
from src.repositories.user_repo import UserRepo

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("fullstack3d")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    app.state.pg_pool = await create_pg_pool(settings.pg_dsn)
    await UserRepo(app.state.pg_pool).ensure_default_admin()
    try:
        yield
    finally:
        await close_pg_pool(app.state.pg_pool)


app = FastAPI(title="Factory Twin & Warehouse API", version="0.1.0", lifespan=lifespan)

origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def catch_exceptions_middleware(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as exc:
        logger.exception("Unhandled 500 on %s %s: %s", request.method, request.url.path, exc)
        return JSONResponse(
            status_code=500,
            content={"detail": f"{type(exc).__name__}: {exc}"},
        )


app.include_router(auth.router)
app.include_router(warehouse.router)
app.include_router(slots.router)
app.include_router(campus.router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


_dist_dir = Path(__file__).resolve().parents[2].parent / "frontend" / "dist"
if _dist_dir.is_dir():
    app.mount("/", StaticFiles(directory=str(_dist_dir), html=True), name="frontend")
