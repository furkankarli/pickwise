import { AppHeader } from "@/components/app-header";
import { AppChatInput } from "@/components/app-chat-input";

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--pickwise-page)] text-[var(--pickwise-text)] transition-colors">
      <AppHeader />
      <AppChatInput />
    </div>
  );
}
