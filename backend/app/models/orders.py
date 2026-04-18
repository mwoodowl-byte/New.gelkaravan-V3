"""Cart and Orders models."""
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Enum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class OrderStatus(str, enum.Enum):
    new = "new"                   # Новый
    accepted = "accepted"         # Взят в работу менеджером
    collecting = "collecting"     # Собирается
    ready = "ready"               # Готов к выдаче
    delivering = "delivering"     # В доставке
    delivered = "delivered"       # Доставлен
    cancelled = "cancelled"       # Отменён


class DeliveryType(str, enum.Enum):
    pickup = "pickup"             # Самовывоз
    delivery = "delivery"         # Доставка


class CartItem(Base):
    __tablename__ = "cart"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    article = Column(String(100), nullable=False)
    qty = Column(Integer, nullable=False, default=1)
    variant_label = Column(String(200), nullable=True)
    added_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="cart_items")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(Enum(OrderStatus), default=OrderStatus.new, nullable=False)
    delivery_type = Column(Enum(DeliveryType), default=DeliveryType.pickup)
    delivery_address = Column(String(500), nullable=True)
    note = Column(Text, nullable=True)
    total = Column(Float, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="orders", foreign_keys=[user_id])
    manager = relationship("User", foreign_keys=[manager_id])
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    status_log = relationship("OrderStatusLog", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    article = Column(String(100), nullable=False)
    name = Column(String(500), nullable=False)
    qty = Column(Integer, nullable=False)
    qty_collected = Column(Integer, nullable=True)   # Фактически собрано (менеджер)
    unit = Column(String(20), default="шт")
    price = Column(Float, nullable=True)
    variant_label = Column(String(200), nullable=True)
    photo_path = Column(String(500), nullable=True)  # Фото выбранного варианта

    order = relationship("Order", back_populates="items")


class OrderStatusLog(Base):
    __tablename__ = "order_status_log"

    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(50), nullable=False)
    changed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    order = relationship("Order", back_populates="status_log")
