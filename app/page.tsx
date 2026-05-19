import { AppHeader } from "@/components/app-header";
import { AppChat } from "@/components/app-chat";

export default function Home() {
  return (
    <div className="h-screen overflow-hidden bg-[var(--pickwise-page)] text-[var(--pickwise-text)] transition-colors">
      <AppHeader />
      <AppChat />
    </div>
  );
}
