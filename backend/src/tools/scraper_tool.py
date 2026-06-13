import httpx
from langchain_core.tools import tool

from src.config import settings

MAX_SCRAPED_CONTENT_CHARS = 12000


@tool
def jina_scraper(urls: list[str]) -> list[str]:
    """Scrape webpages using Jina."""
    headers = {"Authorization": f"Bearer {settings.required_jina_api_key}"}
    responses = []

    for url in urls:
        try:
            response = httpx.get(
                f"https://r.jina.ai/{url}",
                headers=headers,
                timeout=20,
            )
            response.raise_for_status()
        except httpx.HTTPError:
            continue

        responses.append(response.text[:MAX_SCRAPED_CONTENT_CHARS])

    return responses
