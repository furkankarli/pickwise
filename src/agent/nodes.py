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
DEFAULT_MAX_QUESTIONS = 8
MAX_RECOMMENDATIONS = 5


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


def time_context(state: AgentState) -> str:
    current_datetime = state.get("current_datetime") or "unknown"
    timezone = state.get("timezone") or "unknown"
    locale = state.get("locale") or "unknown"

    return f"Current browser datetime: {current_datetime}\nTimezone: {timezone}\nLocale: {locale}"


def language_rule(state: AgentState) -> str:
    language = state.get("conversation_language")

    if language:
        return (
            f"Write all user-facing questions and answers in {language}. "
            "Only switch language if the user explicitly asks you to."
        )

    return (
        "Detect the language of the user's first shopping request and use it "
        "for all user-facing questions and answers. Only switch language if "
        "the user explicitly asks you to."
    )


def search_language_rule(state: AgentState) -> str:
    language = state.get("conversation_language")

    if language:
        return f"Write the search query in {language}."

    return "Write the search query in the language of the user's first shopping request."


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

{time_context(state)}

User message:
{user_message}

Respond in JSON format:
{{
  "conversation_language": "language name of the user's first shopping request, e.g. Turkish or English",
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
- Generate a maximum of 8 missing criteria, ordered by importance.
- current_question should only be related to the first missing criterion.
- current_question must ask for exactly one missing criterion. Never combine multiple criteria in one question.
- Do not ask for a criterion that is already present in criteria.
- {language_rule(state)}
"""
    response = llm.invoke(prompt)
    data = parse_json_response(response.content)

    return {
        **state,
        "conversation_language": data.get("conversation_language") or state.get("conversation_language"),
        "category": data.get("category"),
        "criteria": data.get("criteria", {}),
        "missing_criteria": data.get("missing_criteria", []),
        "current_question": data.get("current_question"),
        "question_count": state.get("question_count", 0),
        "max_questions": state.get("max_questions", DEFAULT_MAX_QUESTIONS),
    }

def analyze_state(state: AgentState) -> str:
    if state.get("missing_criteria") and state.get("question_count", 0) < state.get(
        "max_questions",
        DEFAULT_MAX_QUESTIONS,
    ):
        return "ask_human"
    return "generate_query"

def ask_human(state: AgentState) -> AgentState:
    question = state.get("current_question") or "Lütfen bu konuda biraz daha detay paylaşır mısınız?"
    answer = interrupt({"question": question})

    return {
        **state,
        "question_count": state.get("question_count", 0) + 1,
        "messages": [
            AIMessage(content=question),
            HumanMessage(content=str(answer)),
        ],
    }

def extract_info(state: AgentState) -> AgentState:
    user_message = get_last_user_message(state)
    prompt = f"""
Update the current shopping criteria.

{time_context(state)}

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
- Do not add new missing criteria unless they are essential for making a useful recommendation.
- If no criteria are missing, current_question must be null.
- current_question must ask for exactly one missing criterion. Never combine multiple criteria in one question.
- Do not ask for a criterion that is already present in criteria.
- Treat short answers, typos, and casual wording as valid information when they clearly answer a missing criterion.
- {language_rule(state)}
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

{time_context(state)}

Category:
{state.get("category")}

Criteria:
{json.dumps(state.get("criteria", {}), ensure_ascii=False)}

Rules:
- Return only the search query.
- Do not write any explanations.
- It should be focused on e-commerce and price comparison.
- Include freshness terms when the user is asking about current prices, stock, stores, or availability.
- {search_language_rule(state)}
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

{time_context(state)}

Category:
{state.get("category")}

Criteria:
{json.dumps(state.get("criteria", {}), ensure_ascii=False)}

Web contents:
{json.dumps(scraped_contents, ensure_ascii=False)}

Response format:
- Recommend a maximum of {MAX_RECOMMENDATIONS} products.
- For each product, provide the name, why it is suitable, and price and link information if available.
- If a product image URL is available in the scraped content, include it as a markdown image right after the product name, like: ![Product Name](image_url)
- Only use image URLs that appear in the scraped content. Do not invent or guess image URLs.
- Treat prices, stock, delivery, and seller availability as time-sensitive.
- Do not state prices you are unsure of as definitive facts.
- Keep the answer useful for follow-up comparisons.
- {language_rule(state)}
"""

    response = llm.invoke(prompt)
    answer = content_to_text(response.content)

    return {
        **state,
        "scraped_contents": scraped_contents,
        "recommended_products": answer,
        "final_answer": answer,
        "messages": [AIMessage(content=answer)],
    }


def route_start(state: AgentState) -> str:
    if state.get("final_answer"):
        return "plan_follow_up"

    return "analyze_intent"


def plan_follow_up(state: AgentState) -> AgentState:
    user_message = get_last_user_message(state)
    prompt = f"""
Decide whether the user's follow-up needs a fresh web search.

{time_context(state)}

User follow-up:
{user_message}

Current category:
{state.get("category")}

Current criteria:
{json.dumps(state.get("criteria", {}), ensure_ascii=False)}

Known recommendations:
{state.get("recommended_products") or state.get("final_answer")}

Respond in JSON format:
{{
  "route": "fresh_search" | "answer_from_context",
  "query": "search query to run when route is fresh_search, otherwise null",
  "reason": "short reason"
}}

Use fresh_search when the user asks about current price, stock, store-specific availability,
marketplace comparisons, links, coupons, recent reviews, or asks to check a product/site that
was not covered by the previous search.

Use answer_from_context for comparisons, explanations, trade-offs, setup advice, or choosing
between products already recommended.

Rules:
- Return only JSON.
- If fresh_search is selected, write a concise Turkish search query.
- Use the browser datetime and timezone when reasoning about words like now, today, current, latest, or this week.
- Write the reason in the same language as the user's latest message.
"""
    response = llm.invoke(prompt)
    data = parse_json_response(response.content)

    if data.get("route") == "fresh_search":
        return {
            **state,
            "follow_up_route": "search_follow_up",
            "follow_up_search_query": data.get("query") or user_message,
        }

    return {
        **state,
        "follow_up_route": "answer_follow_up",
        "follow_up_search_query": None,
    }


def route_follow_up(state: AgentState) -> str:
    return state.get("follow_up_route") or "answer_follow_up"


def search_follow_up(state: AgentState) -> AgentState:
    query = state.get("follow_up_search_query") or get_last_user_message(state)
    search_results = tavily_search.invoke({"query": query})
    urls = extract_urls(search_results)
    scraped_contents = jina_scraper.invoke({"urls": urls[:3]})

    return {
        **state,
        "follow_up_search_query": query,
        "search_results": search_results,
        "scraped_contents": [*state.get("scraped_contents", []), *scraped_contents],
    }


def answer_follow_up(state: AgentState) -> AgentState:
    user_message = get_last_user_message(state)
    prompt = f"""
You are continuing the same shopping assistant conversation.

{time_context(state)}

User's latest follow-up:
{user_message}

Current category:
{state.get("category")}

Current criteria:
{json.dumps(state.get("criteria", {}), ensure_ascii=False)}

Previously recommended products:
{state.get("recommended_products") or state.get("final_answer")}

Scraped page contents:
{json.dumps(state.get("scraped_contents", []), ensure_ascii=False)}

Fresh follow-up search query, if any:
{state.get("follow_up_search_query")}

Rules:
- Answer as part of the same ongoing chat.
- Answer only the user's latest follow-up request. Do not repeat the previous recommendation list unless the user explicitly asks you to list it again.
- If the user asks for a comparison, table, ranking, summary, or "these options", start directly with that comparison/table/summary using the previously recommended products.
- For comparison tables, include only the products needed for the comparison. Do not restate every prior product description before the table.
- If the user asks for a comparison, compare the recommended options clearly.
- If the user changes an important criterion, explain how that changes the recommendation.
- If fresh search data is available, use it and say when a price or availability should be verified on the seller page.
- Treat words like now, today, current, latest, and this week according to the browser datetime above.
- If the existing data is not enough for the follow-up, ask one focused question.
- Do not restart the product discovery flow unless the user clearly asks for a new search.
- Do not add a follow-up question at the end unless it is necessary to complete the user's latest request.
- {language_rule(state)}
"""
    response = llm.invoke(prompt)
    answer = content_to_text(response.content)

    return {
        **state,
        "final_answer": answer,
        "messages": [AIMessage(content=answer)],
    }
