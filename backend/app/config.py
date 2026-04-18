"""App configuration via environment variables."""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://gelkaravan:password@localhost:5432/gelkaravan_v2"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # OpenAI
    OPENAI_API_KEY: str = ""

    # JWT
    SECRET_KEY: str = "change-me"
    JWT_EXPIRE_HOURS: int = 720

    # Telegram
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_ADMIN_CHAT_ID: str = ""

    # App
    APP_ENV: str = "development"
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8100
    FRONTEND_URL: str = "https://new.gelkaravan.ru"

    # Storage
    PHOTOS_DIR: str = "/opt/gelkaravan-v2/backend/uploads/photos"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
