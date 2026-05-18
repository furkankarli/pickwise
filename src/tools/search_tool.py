from langchain_core.tools import tool
from langchain_tavily.tavily_search import TavilySearch

from src.config import settings


@tool
def tavily_search(query: str) -> list[dict]:
    """Search the web using Tavily."""
    search = TavilySearch(api_key=settings.tavily_api_key)
    results = search.run(query)
    return results
