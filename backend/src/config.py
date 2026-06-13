from dataclasses import dataclass
from functools import lru_cache
from os import getenv

from dotenv import load_dotenv

from src.errors import ConfigurationError

load_dotenv()


@dataclass(frozen=True)
class Settings:
    google_api_key: str | None = getenv("GOOGLE_API_KEY")
    tavily_api_key: str | None = getenv("TAVILY_API_KEY")
    jina_api_key: str | None = getenv("JINA_API_KEY")

    def require(self, name: str, value: str | None) -> str:
        if value:
            return value

        raise ConfigurationError(
            f"{name} tanımlı değil. Lütfen backend/.env dosyasını kontrol edin.",
            retryable=False,
        )

    @property
    def required_google_api_key(self) -> str:
        return self.require("GOOGLE_API_KEY", self.google_api_key)

    @property
    def required_tavily_api_key(self) -> str:
        return self.require("TAVILY_API_KEY", self.tavily_api_key)

    @property
    def required_jina_api_key(self) -> str:
        return self.require("JINA_API_KEY", self.jina_api_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
