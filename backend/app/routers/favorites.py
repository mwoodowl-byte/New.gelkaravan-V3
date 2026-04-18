"""Favorites router."""
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.deps import get_db, get_current_user
from app.models.user import User
from app.models.favorites import Favorite
from app.models.catalog import Product, ProductPhoto
from app.schemas.orders import FavoriteAddRequest, FavoriteItemOut
from app.routers.catalog import _photo_url

log = logging.getLogger(__name__)
router = APIRouter()


@router.get("")
async def list_favorites(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Список избранного с данными товаров."""
    result = await db.execute(
        select(Favorite).where(Favorite.user_id == user.id).order_by(Favorite.added_at.desc())
    )
    favs = result.scalars().all()

    items = []
    for fav in favs:
        prod = (await db.execute(
            select(Product).where(Product.article == fav.article)
        )).scalar_one_or_none()
        if not prod:
            continue

        photo = (await db.execute(
            select(ProductPhoto)
            .where(ProductPhoto.article == fav.article)
            .order_by(ProductPhoto.sort_order)
            .limit(1)
        )).scalar_one_or_none()

        items.append(FavoriteItemOut(
            id=fav.id,
            article=fav.article,
            name=prod.name,
            unit=prod.unit or "шт",
            price=prod.price,
            has_photo=photo is not None,
            photo_url=_photo_url(photo.file_path) if photo else None,
            collection_name=fav.collection_name or "Избранное",
            added_at=fav.added_at.isoformat() if fav.added_at else "",
        ))

    return {"items": items, "total": len(items)}


@router.post("")
async def add_to_favorites(
    req: FavoriteAddRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Добавить товар в избранное."""
    prod = (await db.execute(
        select(Product).where(Product.article == req.article)
    )).scalar_one_or_none()
    if not prod:
        raise HTTPException(status_code=404, detail="Товар не найден")

    existing = (await db.execute(
        select(Favorite).where(
            Favorite.user_id == user.id,
            Favorite.article == req.article,
            Favorite.collection_name == req.collection_name,
        )
    )).scalar_one_or_none()

    if existing:
        return {"ok": True, "already": True}

    db.add(Favorite(
        user_id=user.id,
        article=req.article,
        collection_name=req.collection_name,
    ))
    await db.commit()
    return {"ok": True, "already": False}


@router.delete("/{favorite_id}")
async def remove_from_favorites(
    favorite_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Удалить из избранного."""
    result = await db.execute(
        delete(Favorite).where(Favorite.id == favorite_id, Favorite.user_id == user.id)
    )
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Не найдено")
    await db.commit()
    return {"ok": True}


@router.get("/collections")
async def list_collections(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Список коллекций избранного."""
    from sqlalchemy import func
    result = await db.execute(
        select(Favorite.collection_name, func.count(Favorite.id).label("count"))
        .where(Favorite.user_id == user.id)
        .group_by(Favorite.collection_name)
    )
    return {"collections": [{"name": r[0], "count": r[1]} for r in result.all()]}
