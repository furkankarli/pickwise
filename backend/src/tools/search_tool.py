from langchain_core.tools import tool
from langchain_tavily.tavily_search import TavilySearch

from src.config import settings
from src.errors import ExternalToolError


@tool
def tavily_search(query: str) -> list[dict]:
    """Search the web using Tavily."""
    try:
        search = TavilySearch(api_key=settings.required_tavily_api_key, max_results=8)
        results = search.run(query)
    except Exception as exc:
        raise ExternalToolError(
            "Güncel web araması şu anda tamamlanamadı. Lütfen birazdan tekrar deneyin.",
            retryable=True,
        ) from exc

    return results if isinstance(results, list) else []
