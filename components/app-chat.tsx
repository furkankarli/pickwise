"use client";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { AppChatInput } from "@/components/app-chat-input";
import { cn } from "@/lib/utils";
import { SearchCheck } from "lucide-react";
import { useCallback, useEffect, useReducer, useRef } from "react";

type ChatMessage = {
  content: string;
  id: string;
  role: "assistant" | "user";
};

type ChatStatus = "error" | "ready" | "streaming";

type ChatState = {
  error: string | null;
  messages: ChatMessage[];
  status: ChatStatus;
  statusLabel: string | null;
  threadId: string | null;
};

type StreamPayload = {
  content?: string;
  message?: string;
  node?: string;
  question?: string;
  thread_id?: string;
  type?: string;
};

type StreamEvent = {
  data: StreamPayload;
  event: string;
};

type ChatAction =
  | { message: ChatMessage; type: "append-message" }
  | { status: ChatStatus; type: "set-status" }
  | { label: string | null; type: "set-status-label" }
  | { threadId: string | null; type: "set-thread" }
  | { error: string | null; type: "set-error" };

const initialState: ChatState = {
  error: null,
  messages: [],
  status: "ready",
  statusLabel: null,
  threadId: null,
};

const nodeLabels: Record<string, string> = {
  analyze_intent: "İhtiyaç analiz ediliyor",
  answer_follow_up: "Yanıt hazırlanıyor",
  ask_human: "Eksik bilgi kontrol ediliyor",
  extract_info: "Kriterler güncelleniyor",
  extract_products: "Ürünler değerlendiriliyor",
  generate_query: "Güncel arama sorgusu oluşturuluyor",
  plan_follow_up: "Takip mesajı yorumlanıyor",
  search_follow_up: "Güncel sonuçlar aranıyor",
};

const createId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

const chatReducer = (state: ChatState, action: ChatAction): ChatState => {
  switch (action.type) {
    case "append-message":
      return {
        ...state,
        messages: [...state.messages, action.message],
      };
    case "set-error":
      return {
        ...state,
        error: action.error,
      };
    case "set-status":
      return {
        ...state,
        status: action.status,
      };
    case "set-status-label":
      return {
        ...state,
        statusLabel: action.label,
      };
    case "set-thread":
      return {
        ...state,
        threadId: action.threadId,
      };
    default:
      return state;
  }
};

const browserContext = () => ({
  current_datetime: new Date().toISOString(),
  locale: navigator.language,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
});

const parseSseBlock = (block: string): StreamEvent | null => {
  const event = block.match(/^event:\s*(.+)$/m)?.[1];
  const data = block.match(/^data:\s*(.+)$/m)?.[1];

  if (!event || !data) {
    return null;
  }

  try {
    return {
      data: JSON.parse(data) as StreamPayload,
      event,
    };
  } catch {
    return null;
  }
};

export function AppChat() {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const abortRef = useRef<AbortController | null>(null);
  const activeThreadRef = useRef<string | null>(null);
  const messageCount = state.messages.length;

  const isStreaming = state.status === "streaming";

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    []
  );

  useEffect(() => {
    window.requestAnimationFrame(() => {
      window.scrollTo({
        behavior: "smooth",
        top: document.documentElement.scrollHeight,
      });
    });
  }, [messageCount, state.statusLabel]);

  const appendMessage = useCallback((role: ChatMessage["role"], content: string) => {
    if (!content.trim()) {
      return;
    }

    dispatch({
      message: {
        content,
        id: createId(),
        role,
      },
      type: "append-message",
    });
  }, []);

  const handleStreamEvent = useCallback(
    (streamEvent: StreamEvent) => {
      if (streamEvent.event === "thread") {
        activeThreadRef.current = streamEvent.data.thread_id ?? null;
        dispatch({
          threadId: streamEvent.data.thread_id ?? null,
          type: "set-thread",
        });
        return;
      }

      if (streamEvent.event === "status") {
        const node = streamEvent.data.node ?? "";
        dispatch({
          label: nodeLabels[node] ?? node,
          type: "set-status-label",
        });
        return;
      }

      if (streamEvent.event === "interrupt") {
        appendMessage("assistant", streamEvent.data.question ?? "");
        dispatch({ label: null, type: "set-status-label" });
        dispatch({ status: "ready", type: "set-status" });
        return;
      }

      if (streamEvent.event === "message") {
        appendMessage("assistant", streamEvent.data.content ?? "");
        return;
      }

      if (streamEvent.event === "error") {
        const errorMessage =
          streamEvent.data.message ?? "Beklenmeyen bir hata oluştu.";

        dispatch({ error: errorMessage, type: "set-error" });
        appendMessage("assistant", errorMessage);
        dispatch({ status: "error", type: "set-status" });
        dispatch({ label: null, type: "set-status-label" });
        return;
      }

      if (streamEvent.event === "done") {
        dispatch({ label: null, type: "set-status-label" });
        dispatch({ status: "ready", type: "set-status" });
      }
    },
    [appendMessage]
  );

  const handleSubmit = useCallback(
    async (message: string) => {
      if (isStreaming) {
        return;
      }

      abortRef.current?.abort();
      const abortController = new AbortController();
      abortRef.current = abortController;

      appendMessage("user", message);
      dispatch({ error: null, type: "set-error" });
      dispatch({ label: "Pickwise hazırlanıyor", type: "set-status-label" });
      dispatch({ status: "streaming", type: "set-status" });

      try {
        const response = await fetch("/api/chat/stream", {
          body: JSON.stringify({
            ...browserContext(),
            message,
            thread_id: activeThreadRef.current,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
          signal: abortController.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error("Backend akışı başlatılamadı.");
        }

        const decoder = new TextDecoder();
        const reader = response.body.getReader();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const blocks = buffer.split("\n\n");
          buffer = blocks.pop() ?? "";

          for (const block of blocks) {
            const streamEvent = parseSseBlock(block);

            if (streamEvent) {
              handleStreamEvent(streamEvent);
            }
          }
        }

        if (buffer.trim()) {
          const streamEvent = parseSseBlock(buffer);

          if (streamEvent) {
            handleStreamEvent(streamEvent);
          }
        }

        dispatch({ label: null, type: "set-status-label" });
        dispatch({ status: "ready", type: "set-status" });
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }

        const errorMessage =
          error instanceof Error
            ? error.message
            : "Beklenmeyen bir hata oluştu.";

        dispatch({ error: errorMessage, type: "set-error" });
        appendMessage("assistant", errorMessage);
        dispatch({ label: null, type: "set-status-label" });
        dispatch({ status: "error", type: "set-status" });
      } finally {
        abortRef.current = null;
      }
    },
    [appendMessage, handleStreamEvent, isStreaming]
  );

  return (
    <>
      <main className="relative z-0 min-h-screen bg-[var(--pickwise-page)]">
        <Conversation className="min-h-screen !overflow-visible">
          <ConversationContent className="mx-auto w-full max-w-3xl gap-5 px-4 pb-32 pt-24 sm:px-0 sm:pb-36 sm:pt-28">
            {state.messages.length === 0 ? (
              <ConversationEmptyState
                className="min-h-[52vh] text-[var(--pickwise-text)]"
                description="Ne almak istediğini yaz. Pickwise ihtiyacını netleştirip güncel ürünleri araştırır."
                icon={
                  <div className="grid size-14 place-items-center rounded-full border border-[var(--pickwise-glass-border)] bg-[var(--pickwise-glass)] text-[var(--pickwise-blue)] backdrop-blur-2xl">
                    <SearchCheck className="size-6" />
                  </div>
                }
                title="Bugün ne seçiyoruz?"
              />
            ) : (
              state.messages.map((message) => (
                <Message
                  className={message.role === "assistant" ? "max-w-full" : ""}
                  from={message.role}
                  key={message.id}
                >
                  <MessageContent
                    className={cn(
                      "text-[15px] leading-7 shadow-none",
                      message.role === "user"
                        ? "max-w-[min(34rem,85%)] break-words rounded-[1.6rem] !bg-[var(--pickwise-blue)] px-5 py-3 !text-white"
                        : "w-full max-w-full rounded-none !bg-transparent px-0 py-1 text-[var(--pickwise-text)] !overflow-x-auto"
                    )}
                  >
                    {message.role === "assistant" ? (
                      <MessageResponse className="pickwise-message-response max-w-full">
                        {message.content}
                      </MessageResponse>
                    ) : (
                      message.content
                    )}
                  </MessageContent>
                </Message>
              ))
            )}

            {state.statusLabel ? (
              <Message from="assistant">
                <MessageContent className="rounded-none !bg-transparent px-0 py-1 text-sm font-medium text-[var(--pickwise-text)] shadow-none">
                  {state.statusLabel}
                </MessageContent>
              </Message>
            ) : null}
          </ConversationContent>
          <ConversationScrollButton className="border-[var(--pickwise-glass-border)] bg-[var(--pickwise-glass)] text-[var(--pickwise-blue)] shadow-[var(--pickwise-glass-shadow)] backdrop-blur-2xl hover:bg-[var(--pickwise-glass-strong)]" />
        </Conversation>
      </main>
      <AppChatInput disabled={isStreaming} onSubmit={handleSubmit} />
    </>
  );
}
