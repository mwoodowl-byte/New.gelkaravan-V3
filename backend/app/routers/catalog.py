"""Catalog router — sections, products, photos."""
import logging
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload

from app.deps import get_db
from app.models.catalog import CatalogSection, Product, ProductPhoto
from app.schemas.catalog import SectionOut, ProductListItem, ProductDetail, PhotoOut
from app.config import settings

log = logging.getLogger(__name__)
router = APIRouter()

PHOTOS_BASE = Path(settings.PHOTOS_DIR)
BACKEND_DIR = Path("/opt/gelkaravan-v2/backend")


def _photo_url(file_path: str) -> str:
    """Строим публичный URL для фото."""
    return "/api/catalog/photo/" + file_path.replace("uploads/photos/", "")


def _build_photo_out(p: ProductPhoto) -> PhotoOut:
    return PhotoOut(
        id=p.id,
        file_path=p.file_path,
        sort_order=p.sort_order,
        variant_label=p.variant_label,
        url=_photo_url(p.file_path),
    )


# ── Разделы ──────────────────────────────────────────────────────────────────

@router.get("/sections")
async def list_sections(db: AsyncSession = Depends(get_db)):
    """Дерево разделов каталога."""
    result = await db.execute(
        select(CatalogSection)
        .where(CatalogSection.is_active == True)
        .order_by(CatalogSection.sort_order)
        .options(selectinload(CatalogSection.children))
    )
    sections = result.scalars().all()

    # Возвращаем только корневые (parent_id=None), дети вложены
    roots = [s for s in sections if s.parent_id is None]

    def to_dict(s: CatalogSection):
        return {
            "id": s.id,
            "name": s.name,
            "slug": s.slug,
            "sort_order": s.sort_order,
            "children": [to_dict(c) for c in sorted(s.children, key=lambda x: x.sort_order)],
        }

    return {"sections": [to_dict(s) for s in roots]}


# ── Товары ───────────────────────────────────────────────────────────────────

@router.get("")
async def list_products(
    q: str = Query("", description="Поиск по артикулу или названию"),
    section_id: Optional[int] = Query(None, description="ID раздела"),
    has_photo: Optional[bool] = Query(None, description="Только с фото"),
    offset: int = Query(0, ge=0),
    limit: int = Query(24, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Список товаров с поиском и фильтрацией."""
    # Базовый фильтр
    filters = [Product.is_active == True]

    if q:
        like = f"%{q}%"
        filters.append(or_(
            Product.article.ilike(like),
            Product.name.ilike(like),
        ))

    if section_id is not None:
        # Рекурсивно собираем все дочерние разделы (все уровни)
        all_ids = [section_id]
        queue = [section_id]
        while queue:
            result = await db.execute(
                select(CatalogSection.id).where(CatalogSection.parent_id.in_(queue))
            )
            children = [r[0] for r in result.all()]
            all_ids.extend(children)
            queue = children
        filters.append(Product.section_id.in_(all_ids))

    # Подзапрос для фото
    photo_subq = (
        select(ProductPhoto.article, func.min(ProductPhoto.file_path).label("first_photo"))
        .group_by(ProductPhoto.article)
        .subquery()
    )

    # Запрос с JOIN на фото
    stmt = (
        select(Product, photo_subq.c.first_photo)
        .outerjoin(photo_subq, Product.article == photo_subq.c.article)
        .where(*filters)
        .order_by(Product.name)
    )

    if has_photo is True:
        stmt = stmt.where(photo_subq.c.first_photo.isnot(None))
    elif has_photo is False:
        stmt = stmt.where(photo_subq.c.first_photo.is_(None))

    # Считаем total
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar()

    # Пагинация
    stmt = stmt.offset(offset).limit(limit)
    rows = (await db.execute(stmt)).all()

    items = []
    for product, first_photo in rows:
        items.append(ProductListItem(
            article=product.article,
            name=product.name,
            unit=product.unit or "шт",
            price=product.price,
            stock=product.stock,
            pack_size=product.pack_size,
            box_size=product.box_size,
            has_photo=first_photo is not None,
            photo_url=_photo_url(first_photo) if first_photo else None,
            section_id=product.section_id,
        ))

    return {"items": items, "total": total, "offset": offset, "limit": limit}


@router.get("/{article}")
async def get_product(article: str, db: AsyncSession = Depends(get_db)):
    """Карточка товара с фото."""
    result = await db.execute(
        select(Product)
        .where(Product.article == article, Product.is_active == True)
        .options(selectinload(Product.photos))
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Товар не найден")

    photos = sorted(product.photos, key=lambda p: p.sort_order)

    return ProductDetail(
        article=product.article,
        name=product.name,
        full_name=product.full_name,
        unit=product.unit or "шт",
        price=product.price,
        stock=product.stock,
        pack_size=product.pack_size,
        box_size=product.box_size,
        barcode_ean13=product.barcode_ean13,
        note=product.note,
        has_photo=len(photos) > 0,
        photo_url=_photo_url(photos[0].file_path) if photos else None,
        section_id=product.section_id,
        photos=[_build_photo_out(p) for p in photos],
    )


# ── Фото ─────────────────────────────────────────────────────────────────────

@router.get("/photo/{article}/{filename}")
async def serve_photo(article: str, filename: str):
    """Отдаём файл фотографии."""
    file_path = BACKEND_DIR / "uploads" / "photos" / article / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Фото не найдено")
    return FileResponse(str(file_path))
