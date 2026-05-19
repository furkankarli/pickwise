"use client";

import { AppChat } from "@/components/app-chat";
import { AppHeader } from "@/components/app-header";
import { useState } from "react";

export function ChatShell() {
  const [sessionKey, setSessionKey] = useState(0);
  const [hasMessages, setHasMessages] = useState(false);

  const resetChat = () => {
    setSessionKey((current) => current + 1);
    setHasMessages(false);
  };

  return (
    <>
      <AppHeader
        canReset={hasMessages}
        onResetChat={resetChat}
      />
      <AppChat
        key={sessionKey}
        onMessagesChange={setHasMessages}
      />
    </>
  );
}
