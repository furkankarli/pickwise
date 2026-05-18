from uuid import uuid4

from langchain_core.messages import AIMessage, HumanMessage
from langgraph.types import Command

from src.agent.graph import graph


def get_interrupt_question(result: dict) -> str | None:
    interrupts = result.get("__interrupt__")
    if not interrupts:
        return None

    interrupt = interrupts[0]
    value = interrupt.value

    if isinstance(value, dict):
        return value.get("question")

    return str(value)


def print_final_answer(result: dict) -> None:
    final_answer = result.get("final_answer")
    if final_answer:
        print(f"\nAssistant:\n{final_answer}")
        return

    messages = result.get("messages", [])
    ai_messages = [message for message in messages if isinstance(message, AIMessage)]

    if ai_messages:
        print(f"\nAssistant:\n{ai_messages[-1].content}")


def main() -> None:
    print("Pickwise shopping assistant")
    print("Send an empty message to exit.\n")

    user_message = input("You: ").strip()
    if not user_message:
        return

    config = {"configurable": {"thread_id": str(uuid4())}}
    result = graph.invoke(
        {"messages": [HumanMessage(content=user_message)]},
        config=config,
    )

    while True:
        question = get_interrupt_question(result)
        if not question:
            break

        answer = input(f"\nAssistant: {question}\nYou: ").strip()
        if not answer:
            print("\nConversation ended.")
            return

        result = graph.invoke(Command(resume=answer), config=config)

    print_final_answer(result)


if __name__ == "__main__":
    main()
