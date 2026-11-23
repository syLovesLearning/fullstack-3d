"""跨平台数据库自动建库与建表脚本（逐条执行 SQL 并校验关键表就绪）。"""

import sys
from pathlib import Path
from urllib.parse import urlparse, urlunparse

BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import psycopg  # noqa: E402
from src.config import settings  # noqa: E402


def _split_dsn(dsn: str) -> tuple[str, str]:
    parsed = urlparse(dsn)
    db_name = parsed.path.lstrip("/") or "warehouse_db"
    admin_dsn = urlunparse(parsed._replace(path="/postgres"))
    return admin_dsn, db_name


def run_migrate() -> None:
    admin_dsn, db_name = _split_dsn(settings.pg_dsn)
    with psycopg.connect(admin_dsn, autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM pg_database WHERE datname = %s;", (db_name,))
            if cur.fetchone() is None:
                safe_name = db_name.replace('"', '""')
                cur.execute(f'CREATE DATABASE "{safe_name}";')
                print(f"[migrate] 已自动创建数据库: {db_name}")

    sql_path = BACKEND_DIR / "scripts" / "init_db.sql"
    raw_lines = [ln for ln in sql_path.read_text(encoding="utf-8").splitlines() if not ln.lstrip().startswith("--")]
    stmts = [s.strip() for s in "\n".join(raw_lines).split(";") if s.strip()]

    with psycopg.connect(settings.pg_dsn, autocommit=True) as conn:
        with conn.cursor() as cur:
            for stmt in stmts:
                cur.execute(stmt + ";")
            cur.execute("SELECT to_regclass('public.warehouse_slots');")
            reg = cur.fetchone()
            if not reg or reg[0] is None:
                raise RuntimeError("warehouse_slots 建表校验失败，请检查 PG_DSN 权限")
    print(f"[migrate] 已完成表结构同步并校验 warehouse_slots ({db_name})")


if __name__ == "__main__":
    run_migrate()
