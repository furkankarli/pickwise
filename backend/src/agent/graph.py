from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, START, StateGraph

from src.agent.nodes import (
    analyze_intent,
    analyze_state,
    answer_follow_up,
    ask_human,
    check_guardrails,
    extract_info,
    extract_products,
    generate_query,
    guardrail_warning,
    plan_follow_up,
    route_after_guardrails,
    route_follow_up,
    search_follow_up,
)
from src.agent.state import AgentState


builder = StateGraph(AgentState)

builder.add_node("analyze_intent", analyze_intent)
builder.add_node("answer_follow_up", answer_follow_up)
builder.add_node("ask_human", ask_human)
builder.add_node("check_guardrails", check_guardrails)
builder.add_node("guardrail_warning", guardrail_warning)
builder.add_node("extract_info", extract_info)
builder.add_node("generate_query", generate_query)
builder.add_node("extract_products", extract_products)
builder.add_node("plan_follow_up", plan_follow_up)
builder.add_node("search_follow_up", search_follow_up)

builder.add_edge(START, "check_guardrails")

builder.add_conditional_edges(
    "check_guardrails",
    route_after_guardrails,
    {
        "analyze_intent": "analyze_intent",
        "plan_follow_up": "plan_follow_up",
        "guardrail_warning": "guardrail_warning",
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
builder.add_edge("guardrail_warning", END)

# Hackathon demo default: thread state is process-local and resets on restart.
# Move this to a durable SQLite/Postgres checkpointer before production use.
checkpointer = InMemorySaver()
graph = builder.compile(checkpointer=checkpointer)
