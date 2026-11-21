<<<<<<< HEAD
"""FastAPI 应用入口：装配 Postgres 连接池、鉴权、仓储维护与货位台账路由。"""
=======
"""FastAPI 应用入口：仅保留 Postgres 连接池、鉴权与仓储维护骨架路由。"""
>>>>>>> ini

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

<<<<<<< HEAD
from src.api import auth, layout, slots, warehouse
=======
from src.api import auth, warehouse
>>>>>>> ini
from src.config import settings
from src.infra.postgres import close_pg_pool, create_pg_pool


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    app.state.pg_pool = await create_pg_pool(settings.pg_dsn)
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

app.include_router(auth.router)
app.include_router(warehouse.router)
<<<<<<< HEAD
app.include_router(slots.router)
app.include_router(layout.router)
=======
>>>>>>> ini


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
