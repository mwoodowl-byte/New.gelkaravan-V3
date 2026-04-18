"""Cart router."""
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.deps import get_db, get_current_user
from app.models.user import User
from app.models.orders import CartItem
from app.models.catalog import Product, ProductPhoto
from app.schemas.orders import CartAddRequest, CartUpdateRequest, CartItemOut
from app.routers.catalog import _photo_url

log = logging.getLogger(__name__)
router = APIRouter()


async def _enrich_cart_items(items: list[CartItem], db: AsyncSession) -> list[CartItemOut]:
    """Обогащаем позиции корзины данными из каталога."""
    result = []
    for item in items:
        # Берём товар
        prod = (await db.execute(
            select(Product).where(Product.article == item.article)
        )).scalar_one_or_none()

        name = prod.name if prod else item.article
        unit = prod.unit if prod else "шт"
        price = prod.price if prod else None

        # Первое фото
        photo = (await db.execute(
            select(ProductPhoto)
            .where(ProductPhoto.article == item.article)
            .order_by(ProductPhoto.sort_order)
            .limit(1)
        )).scalar_one_or_none()

        subtotal = round(price * item.qty, 2) if price else None

        result.append(CartItemOut(
            id=item.id,
            article=item.article,
            name=name,
            unit=unit,
            price=price,
            qty=item.qty,
            variant_label=item.variant_label,
            photo_url=_photo_url(photo.file_path) if photo else None,
            subtotal=subtotal,
        ))
    return result


@router.get("")
async def get_cart(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Содержимое корзины."""
    result = await db.execute(
        select(CartItem).where(CartItem.user_id == user.id).order_by(CartItem.id)
    )
    items = result.scalars().all()
    enriched = await _enrich_cart_items(list(items), db)

    total = sum(i.subtotal for i in enriched if i.subtotal)
    return {"items": enriched, "total": round(total, 2), "count": len(enriched)}


@router.post("")
async def add_to_cart(
    req: CartAddRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Добавить товар в корзину (или увеличить количество)."""
    if req.qty <= 0:
        raise HTTPException(status_code=400, detail="Количество должно быть больше 0")

    # Проверяем что товар существует
    prod = (await db.execute(
        select(Product).where(Product.article == req.article, Product.is_active == True)
    )).scalar_one_or_none()
    if not prod:
        raise HTTPException(status_code=404, detail="Товар не найден")

    # Ищем существующую позицию
    existing = (await db.execute(
        select(CartItem).where(
            CartItem.user_id == user.id,
            CartItem.article == req.article,
            CartItem.variant_label == req.variant_label,
        )
    )).scalar_one_or_none()

    if existing:
        existing.qty += req.qty
    else:
        db.add(CartItem(
            user_id=user.id,
            article=req.article,
            qty=req.qty,
            variant_label=req.variant_label,
        ))

    await db.commit()
    return {"ok": True}


@router.put("/{item_id}")
async def update_cart_item(
    item_id: int,
    req: CartUpdateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Изменить количество."""
    item = (await db.execute(
        select(CartItem).where(CartItem.id == item_id, CartItem.user_id == user.id)
    )).scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Позиция не найдена")

    if req.qty <= 0:
        await db.delete(item)
    else:
        item.qty = req.qty

    await db.commit()
    return {"ok": True}


@router.delete("/{item_id}")
async def remove_from_cart(
    item_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Удалить позицию из корзины."""
    result = await db.execute(
        delete(CartItem).where(CartItem.id == item_id, CartItem.user_id == user.id)
    )
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Позиция не найдена")
    await db.commit()
    return {"ok": True}


@router.post("/clear")
async def clear_cart(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Очистить корзину."""
    await db.execute(delete(CartItem).where(CartItem.user_id == user.id))
    await db.commit()
    return {"ok": True}
