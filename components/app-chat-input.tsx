"use client";

import { ArrowUp, Sparkles } from "lucide-react";
import {
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useRef,
} from "react";

type AppChatInputProps = {
  disabled?: boolean;
  onSubmit?: (message: string) => void;
};

export function AppChatInput({ disabled = false, onSubmit }: AppChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }, []);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const textarea = textareaRef.current;
      const message = textarea?.value.trim() ?? "";

      if (!message || disabled) {
        return;
      }

      onSubmit?.(message);

      if (textarea) {
        textarea.value = "";
        textarea.style.height = "";
      }
    },
    [disabled, onSubmit]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key !== "Enter" || event.shiftKey) {
        return;
      }

      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    },
    []
  );

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 sm:bottom-6">
      <form
        className="pointer-events-auto flex min-h-16 w-full max-w-3xl items-end gap-3 rounded-[2rem] border border-[var(--pickwise-glass-border)] bg-[var(--pickwise-glass)] px-4 py-3 shadow-[var(--pickwise-glass-shadow)] backdrop-blur-2xl supports-[backdrop-filter]:bg-[var(--pickwise-glass)]"
        onSubmit={handleSubmit}
      >
        <div className="grid size-10 shrink-0 place-items-center rounded-full text-[var(--pickwise-blue)]">
          <Sparkles className="size-4" aria-hidden="true" />
        </div>
        <textarea
          aria-label="Message"
          disabled={disabled}
          className="max-h-40 min-h-10 min-w-0 flex-1 resize-none overflow-y-auto bg-transparent py-2 text-base font-medium leading-6 text-[var(--pickwise-text)] outline-none placeholder:text-[color-mix(in_srgb,var(--pickwise-text)_45%,transparent)]"
          onKeyDown={handleKeyDown}
          onInput={resizeTextarea}
          placeholder="Ne almak istiyorsun?"
          ref={textareaRef}
          rows={1}
        />
        <button
          aria-label="Send message"
          className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--pickwise-navy)] text-[var(--pickwise-page)] shadow-[var(--pickwise-action-shadow)] transition hover:bg-[var(--pickwise-blue)] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled}
          type="submit"
        >
          <ArrowUp className="size-5" aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
