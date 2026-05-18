from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, START, StateGraph

from src.agent.nodes import (
    analyze_intent,
    analyze_state,
    answer_follow_up,
    ask_human,
    extract_info,
    extract_products,
    generate_query,
    plan_follow_up,
    route_follow_up,
    route_start,
    search_follow_up,
)
from src.agent.state import AgentState


builder = StateGraph(AgentState)

builder.add_node("analyze_intent", analyze_intent)
builder.add_node("answer_follow_up", answer_follow_up)
builder.add_node("ask_human", ask_human)
builder.add_node("extract_info", extract_info)
builder.add_node("generate_query", generate_query)
builder.add_node("extract_products", extract_products)
builder.add_node("plan_follow_up", plan_follow_up)
builder.add_node("search_follow_up", search_follow_up)

builder.add_conditional_edges(
    START,
    route_start,
    {
        "analyze_intent": "analyze_intent",
        "plan_follow_up": "plan_follow_up",
    },
)

builder.add_conditional_edges(
    "analyze_intent",
    analyze_state,
    {
        "ask_human": "ask_human",
        "generate_query": "generate_query",
    },
)

builder.add_edge("ask_human", "extract_info")

builder.add_conditional_edges(
    "extract_info",
    analyze_state,
    {
        "ask_human": "ask_human",
        "generate_query": "generate_query",
    },
)

builder.add_edge("generate_query", "extract_products")
builder.add_edge("extract_products", END)
builder.add_conditional_edges(
    "plan_follow_up",
    route_follow_up,
    {
        "answer_follow_up": "answer_follow_up",
        "search_follow_up": "search_follow_up",
    },
)
builder.add_edge("search_follow_up", "answer_follow_up")
builder.add_edge("answer_follow_up", END)

checkpointer = InMemorySaver()
graph = builder.compile(checkpointer=checkpointer)
