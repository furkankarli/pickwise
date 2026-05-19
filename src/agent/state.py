from typing import Annotated, TypedDict

from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages


class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    current_datetime: str | None
    timezone: str | None
    locale: str | None
    conversation_language: str | None
    is_valid_shopping_request: bool | None
    guardrail_warning_message: str | None
    category: str | None
    criteria: dict
    missing_criteria: list[str]
    current_question: str | None
    question_count: int
    max_questions: int
    search_query: str | None
    follow_up_route: str | None
    follow_up_search_query: str | None
    search_results: list[dict]
    scraped_contents: list[str]
    recommended_products: str | None
    final_answer: str | None
