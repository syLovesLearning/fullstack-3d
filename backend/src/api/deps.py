"""FastAPI 依赖注入装配与 JWT 鉴权。"""

from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt

from src.config import settings
<<<<<<< HEAD
from src.repositories.layout_repo import LayoutRepo
from src.repositories.slot_repo import SlotRepo
=======
>>>>>>> ini
from src.repositories.user_repo import UserRepo
from src.repositories.warehouse_repo import WarehouseRepo
from src.schemas.models import AuthContext

_bearer = HTTPBearer(auto_error=False)


def create_access_token(auth: AuthContext) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {
        "sub": str(auth.user_id),
        "username": auth.username,
        "role": auth.role,
        "allowed_tools": auth.allowed_tools,
        "groups": auth.groups,
        "exp": expire,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def get_user_repo(request: Request) -> UserRepo:
    return UserRepo(request.app.state.pg_pool)


def get_warehouse_repo(request: Request) -> WarehouseRepo:
    return WarehouseRepo(request.app.state.pg_pool)


<<<<<<< HEAD
def get_slot_repo(request: Request) -> SlotRepo:
    return SlotRepo(request.app.state.pg_pool)


def get_layout_repo(request: Request) -> LayoutRepo:
    return LayoutRepo(request.app.state.pg_pool)


=======
>>>>>>> ini
async def get_current_auth(
    cred: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> AuthContext:
    if cred is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing Bearer token")
    try:
        payload = jwt.decode(cred.credentials, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        return AuthContext(
            user_id=UUID(payload["sub"]),
            username=payload["username"],
            role=payload.get("role", "user"),
            allowed_tools=payload.get("allowed_tools", []),
            groups=payload.get("groups", ["public"]),
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc
