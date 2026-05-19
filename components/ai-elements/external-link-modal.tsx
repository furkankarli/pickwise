"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Check, Copy, ExternalLink } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { LinkSafetyModalProps } from "streamdown";

function domainFromUrl(url: string) {
  try {
    const host = new URL(url).hostname;
    return host.startsWith("www.") ? host.slice(4) : host;
  } catch {
    return url;
  }
}

export function ExternalLinkModal({
  isOpen,
  onClose,
  onConfirm,
  url,
}: LinkSafetyModalProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setCopied(false);
    }
  }, [isOpen]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [url]);

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      open={isOpen}
    >
      <DialogContent
        className={cn(
          "gap-5 rounded-[1.75rem] border-[var(--pickwise-glass-border)] bg-[var(--pickwise-glass)] p-5 text-[var(--pickwise-text)] shadow-[var(--pickwise-glass-shadow)] ring-0 backdrop-blur-2xl sm:max-w-md",
          "**:data-[slot=dialog-close]:text-[var(--pickwise-blue)] **:data-[slot=dialog-close]:hover:bg-[var(--pickwise-glass-strong)]"
        )}
        showCloseButton
      >
        <DialogHeader className="gap-3 pr-8">
          <DialogTitle className="flex items-center gap-2.5 font-semibold text-[var(--pickwise-text)]">
            <span className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-[var(--pickwise-cyan)] to-[var(--pickwise-blue)] shadow-sm">
              <ExternalLink aria-hidden="true" className="size-4 text-white" />
            </span>
            Harici bağlantıyı aç?
          </DialogTitle>
          <DialogDescription className="text-[color-mix(in_srgb,var(--pickwise-text)_68%,transparent)]">
            <span className="font-medium text-[var(--pickwise-text)]">
              {domainFromUrl(url)}
            </span>{" "}
            Pickwise dışında bir siteye yönlendiriyor.
          </DialogDescription>
        </DialogHeader>

        <div
          className={cn(
            "break-all rounded-2xl border border-[var(--pickwise-glass-border)] bg-[var(--pickwise-glass-strong)] px-3.5 py-3 font-mono text-xs leading-5 text-[color-mix(in_srgb,var(--pickwise-text)_80%,transparent)]",
            url.length > 100 && "max-h-32 overflow-y-auto"
          )}
        >
          {url}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            className="h-11 flex-1 rounded-full border-[var(--pickwise-glass-border)] bg-[var(--pickwise-glass-strong)] text-[var(--pickwise-text)] hover:bg-[var(--pickwise-page)]"
            onClick={handleCopy}
            type="button"
            variant="outline"
          >
            {copied ? (
              <>
                <Check aria-hidden="true" />
                Kopyalandı
              </>
            ) : (
              <>
                <Copy aria-hidden="true" />
                Linki kopyala
              </>
            )}
          </Button>
          <Button
            className="h-11 flex-1 rounded-full border-transparent bg-[var(--pickwise-navy)] text-[var(--pickwise-page)] shadow-[var(--pickwise-action-shadow)] hover:bg-[var(--pickwise-blue)]"
            onClick={onConfirm}
            type="button"
          >
            <ExternalLink aria-hidden="true" />
            Bağlantıyı aç
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export const pickwiseLinkSafety = {
  enabled: true,
  renderModal: (props: LinkSafetyModalProps) => (
    <ExternalLinkModal {...props} />
  ),
} as const;
