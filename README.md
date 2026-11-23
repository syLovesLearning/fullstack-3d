# 厂区数字孪生与仓储维护平台（FastAPI + Vue 3 + Three.js）

极简全栈底座：集成 **3D 厂区孪生**（90m × 140m）、**2D 园区物流调度模拟**（680m × 420m 正交路网 + A* 寻路）、**仓储与厂区维护** 及 **接口测试台**。

## 1. 环境准备

- Python 3.11+（Ubuntu 24.04 自带 3.12，需 `sudo apt install python3-venv`）
- PostgreSQL 16+（本地开发配置 `backend/.env`；生产环境配置 `backend/.env.product`）
- Node.js 18+ 与 `pnpm`（`npm i -g pnpm`）

## 2. 本地开发启动（Windows / macOS 通用）

```bash
# 开发模式（自动建 venv/依赖、建库建表，拉起后端 8000 + 前端 5173/3d/，自动免密进入）
python3 run.py

# 本地单进程生产模拟（构建 /3d/ 静态产物并由 FastAPI 托管于 8000，强制正式登录）
python3 run.py --prod
```

## 3. 生产打包与一键部署（`build.py`）

1. 在本地新建 `backend/.env.product`（已被 `.gitignore` 忽略，不入库）：
   ```env
   PG_DSN=postgresql://appuser:你的数据库密码@127.0.0.1:5432/warehouse_db
   JWT_SECRET=与主系统一致的32位以上随机密钥
   CORS_ORIGINS=http://你的服务器IP
   ENABLE_DEV_LOGIN=false
   ```
2. 执行打包或一键部署：
   ```bash
   # 仅本地打包到 release/fullstack-3d-prod.zip（含 /3d/ 前端 + 精简后端 + .env）
   python3 build.py

   # 打包并自动 scp 上传到 aliyun3d:/tmp/fullstack-3d-prod.zip，触发服务器更新重启
   python3 build.py --deploy
   ```

## 4. 远程日志拉取（`getLogs.py`）

接口或服务异常时，直接在本地拉取服务器 Python 后端日志（`journalctl -u fullstack-3d`）与 Nginx 错误日志（`/var/log/nginx/error.log`），自动保存到 `logs/` 并在终端高亮报错行：

```bash
python3 getLogs.py              # 默认拉取最近 150 行
python3 getLogs.py --lines 300  # 指定行数
```

## 5. 服务器部署文件说明（`deploy/`）

| 文件 | 服务器目标路径 | 作用 |
| :--- | :--- | :--- |
| `deploy/nginx.main.conf` | `/etc/nginx/sites-available/default` | 主入口 Nginx（80 端口），通过 `include` 引入各子项目路由 |
| `deploy/nginx.location.conf` | `/opt/fullstack-3d-prod/nginx.location.conf` | 本项目 `/3d/`、`/3d/api/`、`/3d/health`、`/3d/textures/` 子路由（随 `build.py --deploy` 自动更新） |
| `deploy/fullstack-3d.service` | `/etc/systemd/system/fullstack-3d.service` | `uvicorn` 后台常驻进程配置（监听 `127.0.0.1:8001`） |
| `deploy/server_deploy.sh` | `/opt/deploy_3d.sh` | 服务器端一键解压、保留 `.venv`、建表迁移、重启服务与清理临时包 |

常用服务器运维命令：
- 重载 Nginx 路由：`sudo nginx -t && sudo systemctl reload nginx`
- 重启后端服务：`sudo systemctl restart fullstack-3d`

## 6. 登录模式与默认账号

- **本地 `run.py`**：自动免密以 `shenyang (admin)` 进入。
- **正式环境（有主框架）**：自动读取同域 `localStorage.getItem('token')`（并监听 `storage` 变化），免登直接进入。
- **正式环境（无父页面直访 `/3d/`）**：弹出登录框，默认自动维护管理员账号 **`admin` / `admin123456`**。

## 7. SSH 免密别名备忘（Mac `~/.ssh/config`）

```text
Host aliyun3d
    HostName 你的服务器公网IP
    User admin
    IdentityFile ~/.ssh/id_ed25519
```
可在 `~/.zshrc` 添加 `alias aliyun='ssh aliyun3d'`，终端直接输入 `aliyun` 登录服务器。
