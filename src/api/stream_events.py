from typing import Any
from urllib.parse import urlparse

NODE_META: dict[str, dict[str, str]] = {
    "check_guardrails": {
        "label": "Checking your request",
        "phase": "agent",
    },
    "analyze_intent": {
        "label": "Understanding what you need",
        "phase": "agent",
    },
    "ask_human": {
        "label": "Identifying missing details",
        "phase": "agent",
    },
    "extract_info": {
        "label": "Updating your criteria",
        "phase": "agent",
    },
    "generate_query": {
        "label": "Preparing web search",
        "phase": "agent",
    },
    "extract_products": {
        "label": "Evaluating products for you",
        "phase": "agent",
    },
    "plan_follow_up": {
        "label": "Reviewing your follow-up",
        "phase": "agent",
    },
    "search_follow_up": {
        "label": "Searching for fresh results",
        "phase": "agent",
    },
    "answer_follow_up": {
        "label": "Preparing your answer",
        "phase": "agent",
    },
    "guardrail_warning": {
        "label": "Stopping request",
        "phase": "agent",
    },
}

SEARCH_NODES = frozenset({"generate_query", "search_follow_up"})


def domain_from_url(url: str) -> str:
    host = urlparse(url).netloc
    if host.startswith("www."):
        return host[4:]
    return host


def status_payload(node_name: str) -> dict[str, str]:
    meta = NODE_META.get(node_name, {"label": node_name, "phase": "agent"})
    return {
        "node": node_name,
        "label": meta["label"],
        "phase": meta["phase"],
    }


def search_payload(update: dict[str, Any]) -> dict[str, Any] | None:
    query = update.get("search_query") or update.get("follow_up_search_query")
    if not query:
        return None

    results = update.get("search_results")
    if not isinstance(results, list):
        results = []

    sources: list[dict[str, str]] = []
    seen_domains: set[str] = set()

    for item in results:
        if not isinstance(item, dict):
            continue

        url = str(item.get("url") or "")
        if not url:
            continue

        domain = domain_from_url(url)
        if domain in seen_domains:
            continue

        seen_domains.add(domain)
        sources.append(
            {
                "url": url,
                "domain": domain,
                "title": str(item.get("title") or domain),
            }
        )

        if len(sources) >= 5:
            break

    return {
        "query": str(query),
        "sources": sources,
        "result_count": len(results),
    }
