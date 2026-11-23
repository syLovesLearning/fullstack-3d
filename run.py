"""Windows / macOS 统一启动器：自动准备虚拟环境、建库建表并拉起前后端。

用法：
  python run.py           开发模式（后端 8000 热重载 + 前端 5173 Vite，自动免密登录）
  python run.py --prod    生产模式（构建 frontend/dist 并由 FastAPI 单进程托管于 8000，强制正式登录）
  python run.py --build   仅构建前端静态产物
"""

import argparse
import os
import shutil
import signal
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"
IS_WIN = sys.platform == "win32"


def _venv_python() -> Path:
    return BACKEND / ".venv" / ("Scripts/python.exe" if IS_WIN else "bin/python")


def _backend_env(dev_login: bool) -> dict[str, str]:
    env = os.environ.copy()
    prev = env.get("PYTHONPATH", "")
    env["PYTHONPATH"] = f"{BACKEND}{os.pathsep}{prev}" if prev else str(BACKEND)
    if dev_login:
        env["ENABLE_DEV_LOGIN"] = "true"
    return env


def _find_pnpm() -> str:
    cmd = shutil.which("pnpm") or (shutil.which("pnpm.cmd") if IS_WIN else None)
    if not cmd:
        raise RuntimeError("未检测到 pnpm，请先安装 Node.js 与 pnpm (npm i -g pnpm)")
    return cmd


def _ensure_backend_env() -> Path:
    env_file = BACKEND / ".env"
    example = BACKEND / ".env.example"
    if not env_file.exists() and not (ROOT.parent / ".env").exists() and example.exists():
        shutil.copyfile(example, env_file)
        print(f"[setup] 已生成 {env_file}，若使用自定义 PostgreSQL 密码请修改 PG_DSN")

    vpy = _venv_python()
    if not vpy.exists():
        print("[setup] 正在创建 backend/.venv ...")
        subprocess.run([sys.executable, "-m", "venv", str(BACKEND / ".venv")], check=True)
        subprocess.run([str(vpy), "-m", "pip", "install", "-e", ".[dev]"], cwd=BACKEND, check=True)
    return vpy


def _ensure_frontend_deps(pnpm: str) -> None:
    if not (FRONTEND / "node_modules").exists():
        print("[setup] 正在安装前端依赖 (pnpm install) ...")
        subprocess.run([pnpm, "install"], cwd=FRONTEND, check=True)


def _migrate_db(vpy: Path) -> None:
    print("[db] 正在校验数据库与表结构 ...")
    subprocess.run([str(vpy), str(BACKEND / "src" / "infra" / "migrate.py")], cwd=BACKEND, env=_backend_env(False), check=True)


def _terminate_procs(procs: list[subprocess.Popen[bytes]]) -> None:
    for p in procs:
        if p.poll() is None:
            p.terminate()
    for p in procs:
        if p.poll() is None:
            try:
                p.wait(timeout=5)
            except subprocess.TimeoutExpired:
                p.kill()


def main() -> None:
    parser = argparse.ArgumentParser(description="Factory Twin & Warehouse 跨平台启动器")
    parser.add_argument("--prod", action="store_true", help="构建前端并由 FastAPI 单进程托管")
    parser.add_argument("--build", action="store_true", help="仅执行前端构建")
    parser.add_argument("--skip-migrate", action="store_true", help="跳过自动建库建表")
    args = parser.parse_args()

    pnpm = _find_pnpm()
    _ensure_frontend_deps(pnpm)

    if args.build:
        subprocess.run([pnpm, "build"], cwd=FRONTEND, check=True)
        print("[build] 前端构建完成: frontend/dist")
        return

    vpy = _ensure_backend_env()
    if not args.skip_migrate:
        _migrate_db(vpy)

    if args.prod:
        b_env = _backend_env(False)
        f_env = os.environ.copy()
        f_env["VITE_ENABLE_DEV_LOGIN"] = "false"
        subprocess.run([pnpm, "build"], cwd=FRONTEND, env=f_env, check=True)
        print("[prod] 启动单进程服务: http://127.0.0.1:8000/3d/")
        subprocess.run([str(vpy), "-m", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"], cwd=BACKEND, env=b_env, check=True)
        return

    b_env = _backend_env(True)
    f_env = os.environ.copy()
    f_env["VITE_ENABLE_DEV_LOGIN"] = "true"
    procs: list[subprocess.Popen[bytes]] = []
    try:
        print("[dev] 启动后端 http://127.0.0.1:8000 与前端 http://127.0.0.1:5173/3d/ (Ctrl+C 退出)")
        procs.append(subprocess.Popen([str(vpy), "-m", "uvicorn", "src.main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"], cwd=BACKEND, env=b_env))
        procs.append(subprocess.Popen([pnpm, "dev"], cwd=FRONTEND, env=f_env))
        while all(p.poll() is None for p in procs):
            time.sleep(0.5)
    except KeyboardInterrupt:
        print("\n[stop] 正在关闭前后端进程 ...")
    finally:
        _terminate_procs(procs)


if __name__ == "__main__":
    if not IS_WIN:
        signal.signal(signal.SIGTERM, lambda *_: sys.exit(0))
    os.environ.setdefault("PYTHONUTF8", "1")
    main()
