"""Auth schemas."""
from pydantic import BaseModel, field_validator
from typing import Optional
import re


def normalize_phone(phone: str) -> str:
    p = re.sub(r"[\s\-\(\)]", "", phone.strip())
    if p.startswith("8") and len(p) == 11:
        p = "+7" + p[1:]
    if not p.startswith("+"):
        p = "+" + p
    return p


class RegisterRequest(BaseModel):
    name: str
    phone: str

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v):
        p = normalize_phone(v)
        if not re.match(r"^\+\d{10,15}$", p):
            raise ValueError("Неверный формат телефона")
        return p

    @field_validator("name")
    @classmethod
    def validate_name(cls, v):
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Имя слишком короткое")
        return v


class LoginRequest(BaseModel):
    phone: str

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v):
        return normalize_phone(v)


class TokenResponse(BaseModel):
    token: str
    user_id: int
    name: str
    role: str


class UserProfile(BaseModel):
    id: int
    name: str
    phone: str
    role: str
    is_active: bool
    created_at: Optional[str] = None
