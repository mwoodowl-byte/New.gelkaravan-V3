"""Импорт каталога из orders.db (старый сайт gelkaravan.ru) в PostgreSQL v2."""
import asyncio
import sqlite3
import shutil
import os
import sys
import re

sys.path.insert(0, '/opt/gelkaravan-v2/backend')

from app.database import AsyncSessionLocal
from app.models.catalog import CatalogSection, Product, ProductPhoto
from sqlalchemy import select, delete

SRC_DB     = '/opt/gelkaravan-v2/import/catalog/orders.db'
PHOTOS_SRC = '/opt/gelkaravan-v2/import/photos'
PHOTOS_DST = '/opt/gelkaravan-v2/backend/uploads/photos'

def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '-', text)
    return text[:80]

async def run():
    conn = sqlite3.connect(SRC_DB)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # Читаем разделы
    cur.execute('SELECT * FROM catalog_sections ORDER BY sort_order, id')
    src_sections = cur.fetchall()
    print(f'Sections in source: {len(src_sections)}')

    # Читаем товары
    cur.execute('SELECT * FROM products ORDER BY id')
    src_products = cur.fetchall()
    print(f'Products in source: {len(src_products)}')

    # Читаем фото
    cur.execute('SELECT * FROM product_photos ORDER BY article, sort_order')
    src_photos = cur.fetchall()
    print(f'Photos in source: {len(src_photos)}')

    conn.close()

    os.makedirs(PHOTOS_DST, exist_ok=True)

    # Фото из import/photos (по артикулу)
    local_photos = {}
    if os.path.exists(PHOTOS_SRC):
        for fname in sorted(os.listdir(PHOTOS_SRC)):
            if not fname.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
                continue
            base = fname.rsplit('_', 1)[0] if '_' in fname else fname.rsplit('.', 1)[0]
            if base not in local_photos:
                local_photos[base] = []
            local_photos[base].append(fname)

    async with AsyncSessionLocal() as session:
        print('\nОчищаем старые данные...')
        await session.execute(delete(ProductPhoto))
        await session.execute(delete(Product))
        await session.execute(delete(CatalogSection))
        await session.commit()

        # Импортируем разделы, сохраняем маппинг старый id → новый id
        print('Импортируем разделы...')
        # Сначала корневые (parent_id IS NULL)
        id_map = {}  # old_id -> new_id

        def clean_name(name: str) -> str:
            # Убираем префикс '── '
            return name.replace('── ', '').replace('─', '').strip()

        # Два прохода: сначала корневые, потом дочерние
        for pass_num in range(10):  # макс глубина 10
            added = 0
            for s in src_sections:
                old_id = s['id']
                if old_id in id_map:
                    continue
                old_parent = s['parent_id']
                if old_parent is None:
                    new_parent = None
                elif old_parent in id_map:
                    new_parent = id_map[old_parent]
                else:
                    continue  # родитель ещё не импортирован

                name = clean_name(s['name'])
                slug = slugify(name) + f'-{old_id}'  # уникальный slug через id
                sec = CatalogSection(
                    name=name,
                    slug=slug,
                    parent_id=new_parent,
                    sort_order=s['sort_order'] or 0,
                    is_active=True,
                )
                session.add(sec)
                await session.flush()
                id_map[old_id] = sec.id
                added += 1

            if added == 0:
                break

        await session.flush()
        print(f'Импортировано разделов: {len(id_map)}')

        # Импортируем товары
        print('Импортируем товары...')
        product_id_map = {}  # old_id -> article
        imported = 0
        skipped = 0

        for item in src_products:
            article = (item['article'] or '').strip()
            name = (item['name'] or '').strip()
            if not article or not name:
                skipped += 1
                continue

            old_section = item['section_id']
            new_section = id_map.get(old_section) if old_section else None

            price = item['price']
            if isinstance(price, str):
                try: price = float(price)
                except: price = None

            product = Product(
                article=article,
                name=name,
                unit=item['unit'] or 'шт',
                price=float(price) if price else None,
                barcode_ean13=item['barcode'],
                section_id=new_section,
                is_active=True,
            )
            session.add(product)
            await session.flush()
            product_id_map[item['id']] = article
            imported += 1

            if imported % 200 == 0:
                print(f'  {imported}/{len(src_products)}...')

        await session.flush()

        # Импортируем фото из БД
        print('Импортируем фото из БД...')
        photo_count = 0
        for ph in src_photos:
            article = ph['article']
            if not article:
                continue
            local_path = ph['local_path'] or ''
            # Копируем файл если есть
            fname = os.path.basename(local_path)
            src_file = os.path.join(PHOTOS_SRC, fname)
            if os.path.exists(src_file):
                dst_file = os.path.join(PHOTOS_DST, fname)
                if not os.path.exists(dst_file):
                    shutil.copy2(src_file, dst_file)
                file_path = f'/photos/{fname}'
            else:
                file_path = local_path  # сохраняем как есть

            photo = ProductPhoto(
                article=article,
                file_path=file_path,
                sort_order=ph['sort_order'] or 0,
                variant_label=ph['variant_label'],
                description=ph['description'],
            )
            session.add(photo)
            photo_count += 1

        # Добавляем фото из локальной папки
        print('Копируем локальные фото...')
        local_count = 0
        for article, fnames in local_photos.items():
            # Проверяем есть ли такой артикул
            if article not in product_id_map.values():
                continue
            for idx, fname in enumerate(sorted(fnames)):
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
                local_count += 1

        await session.commit()

        print(f'\n✅ Готово!')
        print(f'  Разделов: {len(id_map)}')
        print(f'  Товаров: {imported} (пропущено: {skipped})')
        print(f'  Фото из БД: {photo_count}')
        print(f'  Фото локальных: {local_count}')

        # Топ-категории
        result = await session.execute(
            select(CatalogSection).where(CatalogSection.parent_id == None)
            .order_by(CatalogSection.sort_order)
        )
        roots = result.scalars().all()
        print(f'\nКорневые разделы ({len(roots)}):')
        for r in roots:
            print(f'  {r.name}')

asyncio.run(run())
