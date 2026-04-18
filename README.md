# GelKaravan v2 — B2B оптовая платформа

Платформа для оптовых покупателей сувениров. Геленджик, черноморское побережье.

## Стек
- **Backend:** Python 3.12 + FastAPI + PostgreSQL + Redis
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **AI:** OpenAI GPT-4o (Борис) + Whisper (голос)
- **Инфраструктура:** Nginx + systemd + Let's Encrypt

## Структура проекта
```
gelkaravan-v2/
├── backend/           FastAPI API сервер
│   ├── app/
│   │   ├── models/    SQLAlchemy модели (PostgreSQL)
│   │   ├── schemas/   Pydantic схемы (валидация)
│   │   ├── routers/   API эндпоинты
│   │   ├── services/  Бизнес-логика
│   │   └── ai/        Борис + AI логика
│   └── alembic/       Миграции БД
├── frontend/          React SPA
│   └── src/
│       ├── pages/     Страницы
│       ├── components/ Компоненты
│       ├── hooks/     React hooks
│       └── api/       API клиент
├── nginx/             Конфиги nginx
└── scripts/           deploy.sh, backup_db.sh
```

## Быстрый старт (локально)

```bash
# 1. Клонировать
git clone https://github.com/mwoodowl-byte/gelkaravan-v2.git
cd gelkaravan-v2

# 2. Backend
cd backend
cp ../.env.example .env
# Заполни .env (DATABASE_URL, OPENAI_API_KEY, ...)
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8100

# 3. Frontend (в другом терминале)
cd frontend
npm install
npm run dev
# Открыть: http://localhost:5173
```

## Деплой на сервер

```bash
./scripts/deploy.sh staging     # → new.gelkaravan.ru
./scripts/deploy.sh production  # → gelkaravan.ru
```

## Роли пользователей
| Роль | Доступ |
|------|--------|
| `owner` | Всё |
| `manager` | Заказы, сборка, накладные |
| `content` | Каталог, товары, фото |
| `buyer` | Покупки, корзина, Борис |
| `dealer` | Свой поддомен и каталог |

## AI-агент (программист сайта)
Для администрирования и доработок — отдельный OpenClaw агент.
Работает через git: читает код → правит → тестирует → деплоит.
