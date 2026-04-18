"""Импорт каталога из старых данных в PostgreSQL."""
import asyncio
import json
import shutil
import os
import sys

sys.path.insert(0, '/opt/gelkaravan-v2/backend')

from app.database import AsyncSessionLocal
from app.models.catalog import CatalogSection, Product, ProductPhoto
from sqlalchemy import select, delete

CATALOG_FILE = '/opt/gelkaravan-v2/import/catalog/catalog_raw.json'
PRICES_FILE  = '/opt/gelkaravan-v2/import/catalog/prices.json'
BARCODES_FILE = '/opt/gelkaravan-v2/import/catalog/barcodes.json'
PHOTOS_SRC   = '/opt/gelkaravan-v2/import/photos'
PHOTOS_DST   = '/opt/gelkaravan-v2/backend/uploads/photos'

# Маппинг категорий → slug и порядок
CATEGORY_ORDER = {
    'Магниты': (1, 'magnets'),
    'Брелки':  (2, 'keychains'),
    'Фигурки': (3, 'figures'),
    'Наборы':  (4, 'sets'),
    'Браслеты':(5, 'bracelets'),
    'Подвески':(6, 'pendants'),
    'Ручки':   (7, 'pens'),
    'Другое':  (8, 'other'),
}

async def run():
    with open(CATALOG_FILE, encoding='utf-8') as f:
        catalog = json.load(f)
    with open(PRICES_FILE, encoding='utf-8') as f:
        prices = json.load(f)
    with open(BARCODES_FILE, encoding='utf-8') as f:
        barcodes_raw = json.load(f)

    # Инвертируем штрихкоды: артикул → штрихкод
    barcodes = {}
    for code, article in barcodes_raw.items():
        if code.startswith('_'):
            continue
        if isinstance(article, str):
            barcodes[article] = code

    os.makedirs(PHOTOS_DST, exist_ok=True)

    # Копируем фото
    photo_files = os.listdir(PHOTOS_SRC) if os.path.exists(PHOTOS_SRC) else []
    # article → [sorted filenames]
    photos_map = {}
    for fname in sorted(photo_files):
        if not fname.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
            continue
        # Формат: ARTICLE_N.jpg
        base = fname.rsplit('_', 1)[0] if '_' in fname else fname.rsplit('.', 1)[0]
        if base not in photos_map:
            photos_map[base] = []
        photos_map[base].append(fname)

    async with AsyncSessionLocal() as session:
        # Очищаем старые данные
        print("Очищаем старые данные...")
        await session.execute(delete(ProductPhoto))
        await session.execute(delete(Product))
        await session.execute(delete(CatalogSection))
        await session.commit()

        # Создаём категории
        print("Создаём категории...")
        section_map = {}
        for cat_name, (order, slug) in CATEGORY_ORDER.items():
            sec = CatalogSection(name=cat_name, slug=slug, sort_order=order, is_active=True)
            session.add(sec)
            await session.flush()
            section_map[cat_name] = sec.id

        await session.flush()

        # Импортируем товары
        print(f"Импортируем {len(catalog)} товаров...")
        imported = 0
        skipped = 0

        for item in catalog:
            article = item.get('article', '').strip()
            name = item.get('name', '').strip()
            if not article or not name:
                skipped += 1
                continue

            # Цена: из prices.json по артикулу или из catalog
            price = prices.get(article) or item.get('price') or 0.0
            if isinstance(price, str):
                try:
                    price = float(price)
                except:
                    price = 0.0

            category = item.get('category', 'Другое')
            section_id = section_map.get(category, section_map.get('Другое'))
            barcode = barcodes.get(article)

            product = Product(
                article=article,
                name=name,
                unit=item.get('unit', 'шт'),
                price=float(price) if price else None,
                stock=item.get('stock'),
                barcode_ean13=barcode,
                section_id=section_id,
                is_active=True,
            )
            session.add(product)
            await session.flush()

            # Фото
            article_photos = photos_map.get(article, [])
            for idx, fname in enumerate(sorted(article_photos)):
                src = os.path.join(PHOTOS_SRC, fname)
                dst = os.path.join(PHOTOS_DST, fname)
                if not os.path.exists(dst):
                    shutil.copy2(src, dst)
                photo = ProductPhoto(
                    article=article,
                    file_path=f'/photos/{fname}',
                    sort_order=idx,
                )
                session.add(photo)

            imported += 1
            if imported % 100 == 0:
                print(f"  {imported}/{len(catalog)}...")

        await session.commit()
        print(f"\nГотово! Импортировано: {imported}, пропущено: {skipped}")
        print(f"Фото скопировано для {len(photos_map)} артикулов")

        # Статистика
        result = await session.execute(select(CatalogSection))
        sections = result.scalars().all()
        print(f"\nКатегорий: {len(sections)}")
        for s in sections:
            result2 = await session.execute(
                select(Product).where(Product.section_id == s.id)
            )
            prods = result2.scalars().all()
            print(f"  {s.name}: {len(prods)} товаров")

asyncio.run(run())
