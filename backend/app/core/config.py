from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://crata:crata_local_password@localhost:5432/crata_ai_office"
    openai_api_key: str = ""
    openai_model: str = "gpt-4.1-mini"
    frontend_origin: str = "http://localhost:3005"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
