const backendUrl = process.env.PICKWISE_API_URL ?? "http://127.0.0.1:8000";

const sse = (event: string, data: Record<string, unknown>) =>
  `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

const streamError = (message: string, status = 200) =>
  new Response(
    sse("error", {
      message,
      retryable: true,
      type: "BackendConnectionError",
    }),
    {
      headers: {
        "Cache-Control": "no-cache",
        "Content-Type": "text/event-stream",
      },
      status,
    }
  );

export async function POST(request: Request) {
  let response: Response;

  try {
    response = await fetch(`${backendUrl}/api/chat/stream`, {
      body: await request.text(),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
  } catch {
    return streamError(
      "Backend'e ulaşılamıyor. Lütfen Pickwise backend servisinin çalıştığını kontrol edin."
    );
  }

  if (!response.body) {
    return streamError("Backend yanıtı okunamadı. Lütfen tekrar deneyin.");
  }

  return new Response(response.body, {
    headers: {
      "Cache-Control": "no-cache",
      "Content-Type": "text/event-stream",
    },
    status: response.status,
  });
}
