from dataclasses import dataclass
from functools import lru_cache
from os import getenv

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    google_api_key: str | None = getenv("GOOGLE_API_KEY")
    tavily_api_key: str | None = getenv("TAVILY_API_KEY")
    jina_api_key: str | None = getenv("JINA_API_KEY")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
