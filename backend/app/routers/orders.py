"""Orders router."""
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload

from app.deps import get_db, get_current_user
from app.models.user import User
from app.models.orders import Order, OrderItem, OrderStatusLog, CartItem, OrderStatus
from app.models.catalog import Product, ProductPhoto
from app.schemas.orders import OrderCreateRequest, OrderOut, OrderItemOut, STATUS_LABELS
from app.routers.catalog import _photo_url

log = logging.getLogger(__name__)
router = APIRouter()


async def _order_to_out(order: Order, db: AsyncSession) -> OrderOut:
    items_out = []
    for item in order.items:
        photo = (await db.execute(
            select(ProductPhoto)
            .where(ProductPhoto.article == item.article)
            .order_by(ProductPhoto.sort_order)
            .limit(1)
        )).scalar_one_or_none()

        items_out.append(OrderItemOut(
            article=item.article,
            name=item.name,
            qty=item.qty,
            qty_collected=item.qty_collected,
            unit=item.unit or "шт",
            price=item.price,
            variant_label=item.variant_label,
            photo_url=_photo_url(photo.file_path) if photo else None,
        ))

    return OrderOut(
        id=order.id,
        status=order.status.value,
        status_label=STATUS_LABELS.get(order.status.value, order.status.value),
        note=order.note,
        delivery_type=order.delivery_type.value if order.delivery_type else "pickup",
        delivery_address=order.delivery_address,
        total=order.total or 0,
        items=items_out,
        created_at=order.created_at.isoformat() if order.created_at else "",
    )


@router.get("")
async def list_orders(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """История заказов покупателя."""
    result = await db.execute(
        select(Order)
        .where(Order.user_id == user.id)
        .options(selectinload(Order.items))
        .order_by(Order.created_at.desc())
    )
    orders = result.scalars().all()
    return {"orders": [await _order_to_out(o, db) for o in orders]}


@router.post("")
async def create_order(
    req: OrderCreateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Оформить заказ из корзины."""
    # Берём корзину
    result = await db.execute(
        select(CartItem).where(CartItem.user_id == user.id)
    )
    cart = result.scalars().all()
    if not cart:
        raise HTTPException(status_code=400, detail="Корзина пуста")

    # Считаем сумму и формируем позиции
    order_items = []
    total = 0.0

    for cart_item in cart:
        prod = (await db.execute(
            select(Product).where(Product.article == cart_item.article)
        )).scalar_one_or_none()

        name = prod.name if prod else cart_item.article
        unit = prod.unit if prod else "шт"
        price = prod.price if prod else None

        if price:
            total += price * cart_item.qty

        order_items.append(OrderItem(
            article=cart_item.article,
            name=name,
            qty=cart_item.qty,
            unit=unit,
            price=price,
            variant_label=cart_item.variant_label,
        ))

    # Создаём заказ
    from app.models.orders import DeliveryType
    delivery = DeliveryType.delivery if req.delivery_type == "delivery" else DeliveryType.pickup

    order = Order(
        user_id=user.id,
        status=OrderStatus.new,
        delivery_type=delivery,
        delivery_address=req.delivery_address,
        note=req.note,
        total=round(total, 2),
    )
    db.add(order)
    await db.flush()

    for item in order_items:
        item.order_id = order.id
        db.add(item)

    # Лог статуса
    db.add(OrderStatusLog(
        order_id=order.id,
        status=OrderStatus.new.value,
        changed_by=user.id,
        comment="Заказ создан",
    ))

    # Очищаем корзину
    await db.execute(delete(CartItem).where(CartItem.user_id == user.id))
    await db.commit()

    log.info(f"Order #{order.id} created by user {user.id}, total={total:.2f}")
    return {"ok": True, "order_id": order.id, "total": round(total, 2)}


@router.get("/{order_id}")
async def get_order(
    order_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Детали заказа."""
    result = await db.execute(
        select(Order)
        .where(Order.id == order_id, Order.user_id == user.id)
        .options(selectinload(Order.items))
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")
    return await _order_to_out(order, db)


@router.post("/{order_id}/repeat")
async def repeat_order(
    order_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Повторить заказ — добавить все позиции в корзину."""
    result = await db.execute(
        select(Order)
        .where(Order.id == order_id, Order.user_id == user.id)
        .options(selectinload(Order.items))
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")

    added = 0
    for item in order.items:
        # Проверяем что товар ещё активен
        prod = (await db.execute(
            select(Product).where(Product.article == item.article, Product.is_active == True)
        )).scalar_one_or_none()
        if not prod:
            continue

        existing = (await db.execute(
            select(CartItem).where(
                CartItem.user_id == user.id,
                CartItem.article == item.article,
                CartItem.variant_label == item.variant_label,
            )
        )).scalar_one_or_none()

        if existing:
            existing.qty += item.qty
        else:
            db.add(CartItem(
                user_id=user.id,
                article=item.article,
                qty=item.qty,
                variant_label=item.variant_label,
            ))
        added += 1

    await db.commit()
    return {"ok": True, "items_added": added}
