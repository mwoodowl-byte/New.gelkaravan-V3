"""Cart, Orders, Favorites schemas."""
from pydantic import BaseModel
from typing import Optional, List


# ── Корзина ──────────────────────────────────────────────────────────────────

class CartAddRequest(BaseModel):
    article: str
    qty: int
    variant_label: Optional[str] = None


class CartUpdateRequest(BaseModel):
    qty: int


class CartItemOut(BaseModel):
    id: int
    article: str
    name: str
    unit: str
    price: Optional[float] = None
    qty: int
    variant_label: Optional[str] = None
    photo_url: Optional[str] = None
    subtotal: Optional[float] = None


# ── Заказы ───────────────────────────────────────────────────────────────────

class OrderCreateRequest(BaseModel):
    note: Optional[str] = ""
    delivery_type: Optional[str] = "pickup"
    delivery_address: Optional[str] = None


class OrderItemOut(BaseModel):
    article: str
    name: str
    qty: int
    qty_collected: Optional[int] = None
    unit: str
    price: Optional[float] = None
    variant_label: Optional[str] = None
    photo_url: Optional[str] = None


STATUS_LABELS = {
    "new": "🆕 Новый",
    "accepted": "✅ Принят",
    "collecting": "📦 Собирается",
    "ready": "✔️ Готов",
    "delivering": "🚚 В доставке",
    "delivered": "🏠 Доставлен",
    "cancelled": "❌ Отменён",
}


class OrderOut(BaseModel):
    id: int
    status: str
    status_label: str
    note: Optional[str] = None
    delivery_type: str
    delivery_address: Optional[str] = None
    total: float
    items: List[OrderItemOut] = []
    created_at: str


# ── Избранное ─────────────────────────────────────────────────────────────────

class FavoriteAddRequest(BaseModel):
    article: str
    collection_name: str = "Избранное"


class FavoriteItemOut(BaseModel):
    id: int
    article: str
    name: str
    unit: str
    price: Optional[float] = None
    has_photo: bool
    photo_url: Optional[str] = None
    collection_name: str
    added_at: str
