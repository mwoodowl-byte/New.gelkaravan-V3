"""
Миграция каталога из старого проекта (JSON) в PostgreSQL v2.
Запуск: python3 import_catalog.py
"""
import json
import os
import sys
import shutil
from pathlib import Path

import psycopg2
from psycopg2.extras import execute_values

# ── Пути ──────────────────────────────────────────────────────────────────────
OLD_CATALOG   = Path("/opt/order_bot/catalog_raw.json")
OLD_PRICES    = Path("/opt/order_bot/prices.json")
OLD_PHOTOS_1  = Path("/opt/order_bot/photos/photos")      # основные фото
OLD_PHOTOS_2  = Path("/opt/web_app/frontend/assets/photos")  # фото из веб-апп
NEW_PHOTOS    = Path("/opt/gelkaravan-v2/backend/uploads/photos")

DB_DSN = "host=localhost dbname=gelkaravan_v2 user=gelkaravan password=GelKaravanDB2026!"

# ── Категории → разделы ────────────────────────────────────────────────────────
# Маппинг из старых категорий в нормальные разделы каталога
CATEGORY_MAP = {
    "Магниты":   {"name": "Магниты",   "slug": "magnets"},
    "Брелки":    {"name": "Брелки",    "slug": "keychains"},
    "Браслеты":  {"name": "Браслеты",  "slug": "bracelets"},
    "Подвески":  {"name": "Подвески",  "slug": "pendants"},
    "Фигурки":   {"name": "Фигурки и статуэтки", "slug": "statuettes"},
    "Наборы":    {"name": "Наборы",    "slug": "sets"},
    "Ручки":     {"name": "Ручки",     "slug": "pens"},
    "Другое":    {"name": "Прочее",    "slug": "other"},
}


def main():
    print("=== Миграция каталога → PostgreSQL ===\n")

    # ── Загружаем JSON ─────────────────────────────────────────────────────────
    print("Загружаю catalog_raw.json...")
    catalog = json.loads(OLD_CATALOG.read_text(encoding="utf-8"))
    print(f"  Товаров в JSON: {len(catalog)}")

    print("Загружаю prices.json...")
    prices = json.loads(OLD_PRICES.read_text(encoding="utf-8"))
    # Нормализуем ключи к нижнему регистру для поиска
    prices_lower = {k.lower(): v for k, v in prices.items()}
    print(f"  Цен в JSON: {len(prices)}")

    # ── Подключение к БД ───────────────────────────────────────────────────────
    print("\nПодключаюсь к PostgreSQL...")
    conn = psycopg2.connect(DB_DSN)
    cur = conn.cursor()
    print("  OK")

    # ── Создаём разделы каталога ───────────────────────────────────────────────
    print("\nСоздаю разделы каталога...")
    section_ids = {}
    for old_cat, info in CATEGORY_MAP.items():
        cur.execute("""
            INSERT INTO catalog_sections (name, slug, sort_order, is_active)
            VALUES (%s, %s, %s, true)
            ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
            RETURNING id
        """, (info["name"], info["slug"], list(CATEGORY_MAP.keys()).index(old_cat)))
        row = cur.fetchone()
        if row:
            section_ids[old_cat] = row[0]
            print(f"  [{row[0]}] {info['name']}")

    conn.commit()

    # ── Импортируем товары ─────────────────────────────────────────────────────
    print(f"\nИмпортирую {len(catalog)} товаров...")

    inserted = 0
    updated = 0
    skipped = 0

    for item in catalog:
        article = item.get("article", "").strip()
        if not article:
            skipped += 1
            continue

        name = item.get("name", "").strip()
        category = item.get("category", "Другое")
        unit = item.get("unit", "шт")
        stock = item.get("stock")

        # Цена: из catalog_raw или из prices.json
        price = item.get("price")
        if not price:
            price = prices_lower.get(article.lower())
        if price:
            try:
                price = float(price)
            except (ValueError, TypeError):
                price = None

        section_id = section_ids.get(category, section_ids.get("Другое"))

        cur.execute("""
            INSERT INTO products (article, name, unit, price, stock, section_id, is_active)
            VALUES (%s, %s, %s, %s, %s, %s, true)
            ON CONFLICT (article) DO UPDATE SET
                name = EXCLUDED.name,
                unit = EXCLUDED.unit,
                price = EXCLUDED.price,
                stock = EXCLUDED.stock,
                section_id = EXCLUDED.section_id
        """, (article, name, unit, price, stock, section_id))

        if cur.rowcount:
            inserted += 1
        else:
            updated += 1

    conn.commit()
    print(f"  Добавлено: {inserted}, обновлено: {updated}, пропущено: {skipped}")

    # ── Копируем и регистрируем фотографии ────────────────────────────────────
    print("\nОбрабатываю фотографии...")
    NEW_PHOTOS.mkdir(parents=True, exist_ok=True)

    photo_sources = []
    if OLD_PHOTOS_1.exists():
        photo_sources.append(OLD_PHOTOS_1)
    if OLD_PHOTOS_2.exists():
        photo_sources.append(OLD_PHOTOS_2)

    photos_copied = 0
    photos_registered = 0

    for src_dir in photo_sources:
        for photo_file in sorted(src_dir.glob("*.jpg")) + sorted(src_dir.glob("*.jpeg")) + sorted(src_dir.glob("*.png")):
            filename = photo_file.name

            # Парсим артикул и номер из имени файла: "Mag4DGel_1.jpg" → article=Mag4DGel, idx=1
            stem = photo_file.stem  # "Mag4DGel_1"
            if "_" in stem:
                parts = stem.rsplit("_", 1)
                article = parts[0].strip()
                try:
                    sort_order = int(parts[1])
                except ValueError:
                    sort_order = 0
            else:
                article = stem
                sort_order = 0

            # Проверяем что товар существует в БД
            cur.execute("SELECT article FROM products WHERE article = %s", (article,))
            if not cur.fetchone():
                # Попробуем нечёткий поиск (без пробелов)
                cur.execute("SELECT article FROM products WHERE LOWER(article) = LOWER(%s)", (article,))
                row = cur.fetchone()
                if row:
                    article = row[0]
                else:
                    print(f"  ПРОПУСК (товар не найден): {filename}")
                    continue

            # Копируем файл
            dest_dir = NEW_PHOTOS / article
            dest_dir.mkdir(parents=True, exist_ok=True)
            dest_file = dest_dir / filename

            if not dest_file.exists():
                shutil.copy2(photo_file, dest_file)
                photos_copied += 1

            # Регистрируем в БД
            file_path = str(dest_file.relative_to(Path("/opt/gelkaravan-v2/backend")))
            cur.execute("""
                INSERT INTO product_photos (article, file_path, sort_order)
                VALUES (%s, %s, %s)
                ON CONFLICT DO NOTHING
            """, (article, file_path, sort_order))
            photos_registered += 1

    conn.commit()
    print(f"  Фото скопировано: {photos_copied}, зарегистрировано в БД: {photos_registered}")

    # ── Финальная статистика ───────────────────────────────────────────────────
    print("\n=== Итог ===")
    cur.execute("SELECT COUNT(*) FROM products")
    print(f"  Товаров в PostgreSQL: {cur.fetchone()[0]}")
    cur.execute("SELECT COUNT(*) FROM catalog_sections")
    print(f"  Разделов: {cur.fetchone()[0]}")
    cur.execute("SELECT COUNT(*) FROM product_photos")
    print(f"  Фото: {cur.fetchone()[0]}")
    cur.execute("""
        SELECT cs.name, COUNT(p.id) 
        FROM catalog_sections cs 
        LEFT JOIN products p ON p.section_id = cs.id 
        GROUP BY cs.name ORDER BY COUNT(p.id) DESC
    """)
    print("\n  По разделам:")
    for row in cur.fetchall():
        print(f"    {row[0]}: {row[1]} товаров")

    cur.close()
    conn.close()
    print("\n✅ Миграция завершена!")


if __name__ == "__main__":
    main()
