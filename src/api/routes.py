import json
from collections.abc import Generator
from typing import Any
from uuid import uuid4

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage
from langgraph.types import Command
from pydantic import BaseModel, Field

from src.agent.graph import graph


router = APIRouter(prefix="/api")


class ChatStreamRequest(BaseModel):
    message: str = Field(min_length=1)
    thread_id: str | None = None
    current_datetime: str | None = None
    timezone: str | None = None
    locale: str | None = None


def sse(event: str, data: dict[str, Any]) -> str:
    payload = json.dumps(data, ensure_ascii=False)
    return f"event: {event}\ndata: {payload}\n\n"


def serialize_message(message: BaseMessage) -> dict[str, Any]:
    return {
        "type": message.type,
        "content": message.content,
    }


def serialize_value(value: Any) -> Any:
    if isinstance(value, BaseMessage):
        return serialize_message(value)

    if isinstance(value, list):
        return [serialize_value(item) for item in value]

    if isinstance(value, dict):
        return {key: serialize_value(item) for key, item in value.items()}

    return value


def get_interrupt_question(chunk: dict[str, Any]) -> str | None:
    interrupts = chunk.get("__interrupt__")
    if not interrupts:
        return None

    value = interrupts[0].value
    if isinstance(value, dict):
        return value.get("question")

    return str(value)


def get_latest_ai_message(update: dict[str, Any]) -> str | None:
    messages = update.get("messages", [])
    ai_messages = [message for message in messages if isinstance(message, AIMessage)]

    if not ai_messages:
        return None

    return str(ai_messages[-1].content)


def has_pending_interrupt(config: dict[str, Any]) -> bool:
    snapshot = graph.get_state(config)
    return bool(snapshot.interrupts)


def graph_input(request: ChatStreamRequest, config: dict[str, Any]) -> dict[str, Any] | Command:
    if has_pending_interrupt(config):
        return Command(resume=request.message)

    return {
        "messages": [HumanMessage(content=request.message)],
        "current_datetime": request.current_datetime,
        "timezone": request.timezone,
        "locale": request.locale,
    }


def stream_graph(request: ChatStreamRequest) -> Generator[str, None, None]:
    thread_id = request.thread_id or str(uuid4())
    config = {"configurable": {"thread_id": thread_id}}

    yield sse("thread", {"thread_id": thread_id})

    try:
        for chunk in graph.stream(
            graph_input(request, config),
            config=config,
            stream_mode="updates",
        ):
            question = get_interrupt_question(chunk)
            if question:
                yield sse("interrupt", {"question": question})
                continue

            for node_name, update in chunk.items():
                if not isinstance(update, dict):
                    continue

                yield sse("status", {"node": node_name})

                final_answer = update.get("final_answer")
                if final_answer:
                    yield sse("message", {"content": final_answer})
                    continue

                ai_message = get_latest_ai_message(update)
                if ai_message:
                    yield sse("message", {"content": ai_message})

        yield sse("done", {"thread_id": thread_id})

    except Exception as exc:
        yield sse(
            "error",
            {
                "message": str(exc),
                "type": exc.__class__.__name__,
            },
        )


@router.post("/chat/stream")
def chat_stream(request: ChatStreamRequest) -> StreamingResponse:
    return StreamingResponse(
        stream_graph(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
