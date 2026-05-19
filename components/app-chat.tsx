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
import {
  type ActivityItem,
  ChatChainOfThought,
  type SearchSource,
} from "@/components/chat-activity";
import { cn } from "@/lib/utils";
import { SearchCheck } from "lucide-react";
import type { StickToBottomContext } from "use-stick-to-bottom";
import { useCallback, useEffect, useReducer, useRef } from "react";

type ChatMessage = {
  activities?: ActivityItem[];
  content: string;
  id: string;
  role: "assistant" | "user";
};

type ChatStatus = "error" | "ready" | "streaming";

type ChatState = {
  error: string | null;
  messages: ChatMessage[];
  pendingActivities: ActivityItem[];
  status: ChatStatus;
  threadId: string | null;
};

type StreamPayload = {
  content?: string;
  label?: string;
  message?: string;
  node?: string;
  phase?: string;
  query?: string;
  question?: string;
  result_count?: number;
  sources?: SearchSource[];
  thread_id?: string;
  type?: string;
};

type StreamEvent = {
  data: StreamPayload;
  event: string;
};

type ChatAction =
  | { message: ChatMessage; type: "append-message" }
  | { content: string; type: "append-assistant" }
  | {
      label: string;
      node: string;
      type: "activity-status";
    }
  | {
      query: string;
      resultCount: number;
      sources: SearchSource[];
      type: "activity-search";
    }
  | { type: "clear-pending-activities" }
  | { type: "finish-activities" }
  | { status: ChatStatus; type: "set-status" }
  | { threadId: string | null; type: "set-thread" }
  | { error: string | null; type: "set-error" };

const initialState: ChatState = {
  error: null,
  messages: [],
  pendingActivities: [],
  status: "ready",
  threadId: null,
};

const nodeLabels: Record<string, string> = {
  analyze_intent: "İhtiyaçlarınız analiz ediliyor",
  answer_follow_up: "Yanıtınız hazırlanıyor",
  ask_human: "Eksik bilgiler tespit ediliyor",
  check_guardrails: "Mesajınız inceleniyor",
  extract_info: "Kriterleriniz güncelleniyor",
  extract_products: "Ürünler sizin için değerlendiriliyor",
  generate_query: "Web'de arama yapılıyor",
  guardrail_warning: "İşlem iptal ediliyor",
  plan_follow_up: "Yeni talebiniz inceleniyor",
  search_follow_up: "Güncel sonuçlar için araştırma yapılıyor",
};

const createId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

const markActivitiesDone = (activities: ActivityItem[]) =>
  activities.map((activity) => ({ ...activity, status: "done" as const }));

const chatReducer = (state: ChatState, action: ChatAction): ChatState => {
  switch (action.type) {
    case "append-message":
      return {
        ...state,
        messages: [...state.messages, action.message],
      };
    case "append-assistant": {
      const activities = markActivitiesDone(state.pendingActivities);

      return {
        ...state,
        messages: [
          ...state.messages,
          {
            activities: activities.length ? activities : undefined,
            content: action.content,
            id: createId(),
            role: "assistant",
          },
        ],
        pendingActivities: [],
      };
    }
    case "activity-status": {
      const done = markActivitiesDone(state.pendingActivities);

      return {
        ...state,
        pendingActivities: [
          ...done,
          {
            id: createId(),
            label: action.label,
            status: "active",
            type: "agent",
          },
        ],
      };
    }
    case "activity-search": {
      const done = markActivitiesDone(state.pendingActivities);

      return {
        ...state,
        pendingActivities: [
          ...done,
          {
            id: createId(),
            query: action.query,
            resultCount: action.resultCount,
            sources: action.sources,
            status: "done",
            type: "search",
          },
        ],
      };
    }
    case "clear-pending-activities":
      return {
        ...state,
        pendingActivities: [],
      };
    case "finish-activities":
      return {
        ...state,
        pendingActivities: markActivitiesDone(state.pendingActivities),
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

type AppChatProps = {
  onMessagesChange?: (hasMessages: boolean) => void;
};

export function AppChat({ onMessagesChange }: AppChatProps) {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const abortRef = useRef<AbortController | null>(null);
  const activeThreadRef = useRef<string | null>(null);
  const stickToBottomRef = useRef<StickToBottomContext | null>(null);
  const messageCount = state.messages.length;
  const activityCount =
    state.pendingActivities.length +
    state.messages.reduce(
      (count, message) => count + (message.activities?.length ?? 0),
      0
    );

  const isStreaming = state.status === "streaming";

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    []
  );

  useEffect(() => {
    onMessagesChange?.(state.messages.length > 0);
  }, [onMessagesChange, state.messages.length]);

  const scrollToBottom = useCallback(() => {
    window.requestAnimationFrame(() => {
      stickToBottomRef.current?.scrollToBottom();
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messageCount, activityCount, scrollToBottom]);

  const appendMessage = useCallback((role: ChatMessage["role"], content: string) => {
    if (!content.trim()) {
      return;
    }

    if (role === "assistant") {
      dispatch({ content, type: "append-assistant" });
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
        const label =
          streamEvent.data.label ?? nodeLabels[node] ?? node.replaceAll("_", " ");

        dispatch({
          label,
          node,
          type: "activity-status",
        });
        return;
      }

      if (streamEvent.event === "search") {
        dispatch({
          query: streamEvent.data.query ?? "",
          resultCount: streamEvent.data.result_count ?? 0,
          sources: streamEvent.data.sources ?? [],
          type: "activity-search",
        });
        return;
      }

      if (streamEvent.event === "interrupt") {
        appendMessage("assistant", streamEvent.data.question ?? "");
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
        dispatch({ type: "clear-pending-activities" });
        dispatch({ status: "error", type: "set-status" });
        return;
      }

      if (streamEvent.event === "done") {
        dispatch({ type: "finish-activities" });
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
      dispatch({ type: "clear-pending-activities" });
      dispatch({
        label: "Pickwise hazırlanıyor",
        node: "start",
        type: "activity-status",
      });
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

        dispatch({ type: "finish-activities" });
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
        dispatch({ type: "clear-pending-activities" });
        dispatch({ status: "error", type: "set-status" });
      } finally {
        abortRef.current = null;
      }
    },
    [appendMessage, handleStreamEvent, isStreaming]
  );

  return (
    <>
      <main className="relative z-0 flex min-h-0 flex-1 flex-col bg-[var(--pickwise-page)]">
        <Conversation
          className="min-h-0 flex-1"
          contextRef={stickToBottomRef}
          resize="smooth"
        >
          <ConversationContent className="mx-auto w-full max-w-3xl gap-5 px-4 pb-[calc(8.5rem+var(--keyboard-offset,0px))] pt-24 sm:px-0 sm:pb-[calc(9.5rem+var(--keyboard-offset,0px))] sm:pt-28">
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
                  {message.role === "assistant" && message.activities?.length ? (
                    <ChatChainOfThought
                      activities={message.activities}
                      className="mb-3 w-full"
                    />
                  ) : null}
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

            {isStreaming && state.pendingActivities.length > 0 ? (
              <Message from="assistant">
                <ChatChainOfThought
                  activities={state.pendingActivities}
                  className="w-full"
                  isStreaming
                />
              </Message>
            ) : null}
          </ConversationContent>
          <ConversationScrollButton className="border-[var(--pickwise-glass-border)] bg-[var(--pickwise-glass)] text-[var(--pickwise-blue)] shadow-[var(--pickwise-glass-shadow)] backdrop-blur-2xl hover:bg-[var(--pickwise-glass-strong)]" />
        </Conversation>
      </main>
      <AppChatInput
        disabled={isStreaming}
        onFocus={scrollToBottom}
        onSubmit={handleSubmit}
      />
    </>
  );
}
