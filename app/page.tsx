import { ChatShell } from "@/components/chat-shell";

export default function Home() {
  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[var(--pickwise-page)] text-[var(--pickwise-text)] transition-colors">
      <ChatShell />
    </div>
  );
}
