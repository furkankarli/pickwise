"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { RotateCcw } from "lucide-react";

type AppHeaderProps = {
  canReset?: boolean;
  onResetChat?: () => void;
};

export function AppHeader({ canReset = false, onResetChat }: AppHeaderProps) {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4 sm:top-6">
      <div className="pointer-events-auto flex h-16 w-full max-w-3xl items-center justify-between rounded-full border border-[var(--pickwise-glass-border)] bg-[var(--pickwise-glass)] px-5 pl-7 shadow-[var(--pickwise-glass-shadow)] backdrop-blur-2xl supports-[backdrop-filter]:bg-[var(--pickwise-glass)] sm:px-6 sm:pl-8">
        <a href="#" className="text-[1.65rem] font-extrabold leading-none tracking-normal">
          <span className="text-[var(--pickwise-navy)]">pick</span>
          <span className="bg-gradient-to-r from-[var(--pickwise-blue)] to-[var(--pickwise-cyan)] bg-clip-text text-transparent">
            wise
          </span>
        </a>

        <div className="flex items-center gap-1">
          {canReset ? (
            <button
              aria-label="Reset chat"
              className="grid size-10 place-items-center rounded-full text-[var(--pickwise-blue)] transition hover:bg-[var(--pickwise-glass-strong)] hover:text-[var(--pickwise-cyan)]"
              onClick={onResetChat}
              type="button"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
            </button>
          ) : null}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
