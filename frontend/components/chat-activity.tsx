"use client";

import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtSearchResult,
  ChainOfThoughtSearchResults,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";
import { cn } from "@/lib/utils";
import { Search, Sparkles } from "lucide-react";

export type SearchSource = {
  domain: string;
  title?: string;
  url: string;
};

export type AgentActivityItem = {
  id: string;
  label: string;
  status: "active" | "done";
  type: "agent";
};

export type SearchActivityItem = {
  id: string;
  query: string;
  resultCount: number;
  sources: SearchSource[];
  status: "active" | "done";
  type: "search";
};

export type ActivityItem = AgentActivityItem | SearchActivityItem;

function truncate(text: string, max = 44) {
  if (text.length <= max) {
    return text;
  }

  return `${text.slice(0, max).trimEnd()}…`;
}

function faviconUrl(domain: string) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`;
}

function stepStatus(
  activity: ActivityItem,
  isLast: boolean,
  isStreaming: boolean
): "active" | "complete" | "pending" {
  if (activity.status === "active" || (isLast && isStreaming)) {
    return "active";
  }

  return "complete";
}

type ChatChainOfThoughtProps = {
  activities: ActivityItem[];
  className?: string;
  isStreaming?: boolean;
};

export function ChatChainOfThought({
  activities,
  className,
  isStreaming = false,
}: ChatChainOfThoughtProps) {
  if (!activities.length) {
    return null;
  }

  const hasActive = activities.some((activity) => activity.status === "active");
  const searchCount = activities.filter((activity) => activity.type === "search").length;

  const headerLabel = isStreaming
    ? "Pickwise araştırıyor..."
    : searchCount > 0
      ? `Araştırma · ${activities.length} adım`
      : `${activities.length} adım`;

  return (
    <ChainOfThought
      className={cn(
        "rounded-2xl border border-[var(--pickwise-glass-border)] bg-[var(--pickwise-glass)] p-4 shadow-sm backdrop-blur-xl",
        className
      )}
      defaultOpen={isStreaming || hasActive}
    >
      <ChainOfThoughtHeader className="font-medium text-[var(--pickwise-text)] hover:text-[var(--pickwise-blue)]">
        {headerLabel}
      </ChainOfThoughtHeader>

      <ChainOfThoughtContent>
        {activities.map((activity, index) => {
          const isLast = index === activities.length - 1;
          const status = stepStatus(activity, isLast, isStreaming);

          if (activity.type === "search") {
            return (
              <ChainOfThoughtStep
                description={
                  activity.resultCount > 0
                    ? `${activity.resultCount} sonuç`
                    : undefined
                }
                icon={Search}
                key={activity.id}
                label={
                  <span>
                    Arandı:{" "}
                    <span className="font-medium">
                      &apos;{truncate(activity.query)}&apos;
                    </span>
                  </span>
                }
                status={status}
              >
                {activity.sources.length > 0 ? (
                  <ChainOfThoughtSearchResults className="gap-1.5">
                    {activity.sources.map((source) => (
                      <ChainOfThoughtSearchResult
                        className="border-[var(--pickwise-glass-border)] bg-[var(--pickwise-glass-strong)] px-2 py-1 font-normal text-[var(--pickwise-text)]"
                        key={source.url}
                      >
                        <a
                          className="inline-flex items-center gap-1.5 hover:text-[var(--pickwise-blue)]"
                          href={source.url}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            alt=""
                            className="size-3.5 rounded-sm"
                            height={14}
                            src={faviconUrl(source.domain)}
                            width={14}
                          />
                          {source.domain}
                        </a>
                      </ChainOfThoughtSearchResult>
                    ))}
                  </ChainOfThoughtSearchResults>
                ) : null}
              </ChainOfThoughtStep>
            );
          }

          return (
            <ChainOfThoughtStep
              icon={Sparkles}
              key={activity.id}
              label={activity.label}
              status={status}
            />
          );
        })}
      </ChainOfThoughtContent>
    </ChainOfThought>
  );
}

/** @deprecated Use ChatChainOfThought */
export const ChatActivityList = ChatChainOfThought;
