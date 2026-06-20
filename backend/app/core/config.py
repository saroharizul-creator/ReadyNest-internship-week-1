import os
import secrets
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    DEBUG: bool = True
    
    # Database Settings - default to local sqlite
    DATABASE_URL: str = Field(default="sqlite:///./dataset_analysis.db")
    
    # JWT Settings - secrets must be loaded from environment in production
    SECRET_KEY: str = Field(default=None)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # CORS settings - comma separated string of origins
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://localhost:3000,http://127.0.0.1:3000"

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

# Secure fallback for SECRET_KEY if not provided in env
if not settings.SECRET_KEY:
    import logging
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger("backend")
    logger.warning("WARNING: SECRET_KEY environment variable is not set. Generating a dynamic key for session safety.")
    settings.SECRET_KEY = secrets.token_hex(32)

