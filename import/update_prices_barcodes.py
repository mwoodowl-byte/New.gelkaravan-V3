"""Обновляем цены и штрихкоды в PostgreSQL из prices.json и barcodes.json."""
import asyncio
import json
import sys

sys.path.insert(0, '/opt/gelkaravan-v2/backend')

from app.database import AsyncSessionLocal
from app.models.catalog import Product
from sqlalchemy import select, update

PRICES_FILE   = '/opt/gelkaravan-v2/import/catalog/prices.json'
BARCODES_FILE = '/opt/gelkaravan-v2/import/catalog/barcodes.json'

async def run():
    with open(PRICES_FILE, encoding='utf-8') as f:
        prices = json.load(f)
    with open(BARCODES_FILE, encoding='utf-8') as f:
        barcodes_raw = json.load(f)

    # Инвертируем: артикул → штрихкод
    bc_map = {}
    for code, article in barcodes_raw.items():
        if code.startswith('_'):
            continue
        if isinstance(article, str):
            bc_map[article] = code

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Product))
        products = result.scalars().all()
        print(f'Total products: {len(products)}')

        updated_price = 0
        updated_bc = 0

        for p in products:
            changed = False

            # Цена из prices.json (приоритет над старой)
            new_price = prices.get(p.article)
            if new_price is not None:
                try:
                    new_price = float(new_price)
                    if p.price != new_price:
                        p.price = new_price
                        changed = True
                        updated_price += 1
                except:
                    pass

            # Штрихкод
            new_bc = bc_map.get(p.article)
            if new_bc and p.barcode_ean13 != new_bc:
                p.barcode_ean13 = new_bc
                changed = True
                updated_bc += 1

        await session.commit()
        print(f'✅ Обновлено цен: {updated_price}')
        print(f'✅ Обновлено штрихкодов: {updated_bc}')

        # Статистика
        result = await session.execute(
            select(Product).where(Product.price > 0)
        )
        with_price = len(result.scalars().all())
        result2 = await session.execute(
            select(Product).where(Product.barcode_ean13 != None)
        )
        with_bc = len(result2.scalars().all())
        print(f'Итого с ценой: {with_price}')
        print(f'Итого со штрихкодом: {with_bc}')

asyncio.run(run())
