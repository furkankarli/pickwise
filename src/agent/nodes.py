import json
import re

from langchain_core.messages import AIMessage, HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.types import interrupt

from src.agent.state import AgentState
from src.config import settings
from src.tools.scraper_tool import jina_scraper
from src.tools.search_tool import tavily_search

llm = ChatGoogleGenerativeAI(model="gemini-3.1-flash-lite", google_api_key=settings.google_api_key)


def content_to_text(content: str | list) -> str:
    if isinstance(content, list):
        return "".join(
            item.get("text", str(item)) if isinstance(item, dict) else str(item)
            for item in content
        )

    return content


def parse_json_response(content: str | list) -> dict:
    content = content_to_text(content)
    content = content.strip()

    if content.startswith("```"):
        content = re.sub(r"^```(?:json)?\s*", "", content)
        content = re.sub(r"\s*```$", "", content)

    return json.loads(content)


def get_last_user_message(state: AgentState) -> str:
    for message in reversed(state["messages"]):
        if isinstance(message, HumanMessage):
            return message.content
    return ""


def extract_urls(value: object) -> list[str]:
    urls = []

    if isinstance(value, dict):
        if value.get("url"):
            urls.append(str(value["url"]))

        for nested_value in value.values():
            urls.extend(extract_urls(nested_value))

    elif isinstance(value, list):
        for item in value:
            urls.extend(extract_urls(item))

    elif isinstance(value, str):
        urls.extend(re.findall(r"https?://[^\s\])}]+", value))

    return list(dict.fromkeys(urls))


def analyze_intent(state: AgentState) -> AgentState:
    user_message = get_last_user_message(state)
    prompt = f"""Analyze the user's shopping request.

User message:
{user_message}

Respond in JSON format:
{{
  "category": "product category",
  "criteria": {{
    "criterion_name": "criterion value"
  }},
  "missing_criteria": ["missing criterion name"],
  "current_question": "the single most important question to ask the user"
}}

Rules:
- Return only JSON.
- Determine the category and criteria yourself.
- If the user has already provided information, do not include it in missing_criteria.
- Generate a maximum of 5 missing criteria.
- current_question should only be related to the first missing criterion.
"""
    response = llm.invoke(prompt)
    data = parse_json_response(response.content)

    return {
        **state,
        "category": data.get("category"),
        "criteria": data.get("criteria", {}),
        "missing_criteria": data.get("missing_criteria", []),
        "current_question": data.get("current_question"),
    }

def analyze_state(state: AgentState) -> str:
    if state.get("missing_criteria"):
        return "ask_human"
    return "generate_query"

def ask_human(state: AgentState) -> AgentState:
    question = state.get("current_question") or "Please provide more details for this as well."
    answer = interrupt({"question": question})

    return {
        **state,
        "messages": [
            AIMessage(content=question),
            HumanMessage(content=str(answer)),
        ],
    }

def extract_info(state: AgentState) -> AgentState:
    user_message = get_last_user_message(state)
    prompt = f"""
Update the current shopping criteria.

Current category:
{state.get("category")}

Current criteria:
{json.dumps(state.get("criteria", {}), ensure_ascii=False)}

Missing criteria:
{json.dumps(state.get("missing_criteria", []), ensure_ascii=False)}

User's latest answer:
{user_message}

Respond in JSON format:
{{
  "criteria": {{
    "criterion_name": "criterion value"
  }},
  "missing_criteria": ["still missing criterion name"],
  "current_question": "the single question to ask if anything is still missing, otherwise null"
}}

Rules:
- Return only JSON.
- Add the information you understood from the user's answer to criteria.
- Remove completed criteria from missing_criteria.
- If no criteria are missing, current_question must be null.
"""

    response = llm.invoke(prompt)
    data = parse_json_response(response.content)

    return {
        **state,
        "criteria": {**state.get("criteria", {}), **data.get("criteria", {})},
        "missing_criteria": data.get("missing_criteria", []),
        "current_question": data.get("current_question"),
    }

def generate_query(state: AgentState) -> AgentState:
    prompt = f"""
Generate an effective Turkish search query to search for products on the internet based on the following shopping criteria.

Category:
{state.get("category")}

Criteria:
{json.dumps(state.get("criteria", {}), ensure_ascii=False)}

Rules:
- Return only the search query.
- Do not write any explanations.
- It should be focused on e-commerce and price comparison.
"""

    response = llm.invoke(prompt)
    query = content_to_text(response.content).strip()

    search_results = tavily_search.invoke({"query": query})

    return {
        **state,
        "search_query": query,
        "search_results": search_results,
    }

def extract_products(state: AgentState) -> AgentState:
    urls = extract_urls(state.get("search_results", []))

    scraped_contents = jina_scraper.invoke({"urls": urls[:3]})

    prompt = f"""
Select the most suitable products from the following web page contents based on the user's shopping criteria.

Category:
{state.get("category")}

Criteria:
{json.dumps(state.get("criteria", {}), ensure_ascii=False)}

Web contents:
{json.dumps(scraped_contents, ensure_ascii=False)}

Response format:
- Recommend a maximum of 3 products.
- For each product, provide the name, why it is suitable, and price and link information if available.
- Do not state prices you are unsure of as definitive facts.
"""

    response = llm.invoke(prompt)

    return {
        **state,
        "scraped_contents": scraped_contents,
        "final_answer": content_to_text(response.content),
        "messages": [AIMessage(content=content_to_text(response.content))],
    }
