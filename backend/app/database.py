"""Database connection — PostgreSQL via SQLAlchemy async."""
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.config import settings


engine = create_async_engine(
    settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://"),
    pool_size=10,
    max_overflow=20,
    echo=settings.APP_ENV == "development",
)

AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session


async def init_db():
    """Create all tables on startup (dev only; use Alembic in prod)."""
    if settings.APP_ENV == "development":
        async with engine.begin() as conn:
            from app.models import user, catalog, orders, favorites, boris  # noqa
            await conn.run_sync(Base.metadata.create_all)
