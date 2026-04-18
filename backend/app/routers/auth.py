"""Auth router — register, login, me, logout, invites."""
import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.deps import get_db, get_current_user
from app.models.user import User, Session as UserSession, UserRole, InviteCode
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, UserProfile
from app.config import settings

log = logging.getLogger(__name__)
router = APIRouter()


@router.post("/register")
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Регистрация нового покупателя (ожидает одобрения)."""
    result = await db.execute(select(User).where(User.phone == req.phone))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Пользователь с таким телефоном уже зарегистрирован")

    user = User(
        name=req.name,
        phone=req.phone,
        role=UserRole.buyer,
        is_active=False,
    )
    db.add(user)
    await db.commit()
    log.info(f"New user registered: {req.phone} ({req.name})")
    return {"ok": True, "message": "Регистрация отправлена, ожидайте одобрения администратором"}


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Вход по номеру телефона."""
    result = await db.execute(select(User).where(User.phone == req.phone))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден. Зарегистрируйтесь.")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Аккаунт ожидает одобрения администратором")

    # Создаём сессию
    token = secrets.token_urlsafe(48)
    expires = datetime.now(timezone.utc) + timedelta(hours=settings.JWT_EXPIRE_HOURS)
    session = UserSession(user_id=user.id, token=token, expires_at=expires)
    db.add(session)
    await db.commit()

    log.info(f"User logged in: {user.phone} (id={user.id})")
    return TokenResponse(token=token, user_id=user.id, name=user.name, role=user.role.value)


@router.get("/me", response_model=UserProfile)
async def me(user: User = Depends(get_current_user)):
    """Профиль текущего пользователя."""
    return UserProfile(
        id=user.id,
        name=user.name,
        phone=user.phone,
        role=user.role.value,
        is_active=user.is_active,
        created_at=user.created_at.isoformat() if user.created_at else None,
    )


@router.post("/logout")
async def logout(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Выход — удаляем текущую сессию."""
    result = await db.execute(select(UserSession).where(UserSession.user_id == user.id))
    sessions = result.scalars().all()
    for s in sessions:
        await db.delete(s)
    await db.commit()
    return {"ok": True}


# ── Инвайт-ссылки ────────────────────────────────────────────────────────────

class InviteCreateRequest(BaseModel):
    note: Optional[str] = None  # Примечание "Для Иван Петров из Краснодара"
    days: int = 7               # Срок действия в днях


class RegisterWithInviteRequest(BaseModel):
    name: str
    phone: str
    invite_code: str

    from pydantic import field_validator
    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v):
        from app.schemas.auth import normalize_phone
        return normalize_phone(v)


@router.post("/invite/create")
async def create_invite(
    req: InviteCreateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Создать инвайт-ссылку (только owner и manager)."""
    if user.role not in (UserRole.owner, UserRole.manager):
        raise HTTPException(status_code=403, detail="Недостаточно прав")

    code = secrets.token_urlsafe(16)
    expires = datetime.now(timezone.utc) + timedelta(days=req.days)

    invite = InviteCode(
        code=code,
        created_by=user.id,
        expires_at=expires,
        note=req.note,
    )
    db.add(invite)
    await db.commit()

    url = f"{settings.FRONTEND_URL}/register?invite={code}"
    log.info(f"Invite created by user {user.id}: {code}")
    return {
        "ok": True,
        "code": code,
        "url": url,
        "expires_at": expires.isoformat(),
        "note": req.note,
    }


@router.post("/invite/register", response_model=TokenResponse)
async def register_with_invite(
    req: RegisterWithInviteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Регистрация по инвайт-коду — аккаунт активен сразу."""
    # Проверяем инвайт
    result = await db.execute(
        select(InviteCode).where(InviteCode.code == req.invite_code)
    )
    invite = result.scalar_one_or_none()

    if not invite:
        raise HTTPException(status_code=404, detail="Инвайт-код не найден")
    if invite.used_at:
        raise HTTPException(status_code=400, detail="Инвайт уже использован")
    if invite.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Инвайт истёк")

    # Проверяем телефон
    result = await db.execute(select(User).where(User.phone == req.phone))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Пользователь с таким телефоном уже зарегистрирован")

    # Создаём активного пользователя
    user = User(
        name=req.name.strip(),
        phone=req.phone,
        role=UserRole.buyer,
        is_active=True,
    )
    db.add(user)
    await db.flush()

    # Помечаем инвайт использованным
    invite.used_by = user.id
    invite.used_at = datetime.now(timezone.utc)

    # Создаём сессию
    token = secrets.token_urlsafe(48)
    expires = datetime.now(timezone.utc) + timedelta(hours=settings.JWT_EXPIRE_HOURS)
    session = UserSession(user_id=user.id, token=token, expires_at=expires)
    db.add(session)
    await db.commit()

    log.info(f"User registered via invite {req.invite_code}: {req.phone} ({req.name})")
    return TokenResponse(token=token, user_id=user.id, name=user.name, role=user.role.value)


@router.get("/invite/{code}")
async def check_invite(code: str, db: AsyncSession = Depends(get_db)):
    """Проверить инвайт-код (для страницы регистрации)."""
    result = await db.execute(select(InviteCode).where(InviteCode.code == code))
    invite = result.scalar_one_or_none()

    if not invite:
        raise HTTPException(status_code=404, detail="Инвайт не найден")
    if invite.used_at:
        raise HTTPException(status_code=400, detail="Инвайт уже использован")
    if invite.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Инвайт истёк")

    return {"valid": True, "expires_at": invite.expires_at.isoformat()}
