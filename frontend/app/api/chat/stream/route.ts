const backendUrl = process.env.PICKWISE_API_URL ?? "http://127.0.0.1:8000";

export async function POST(request: Request) {
  const response = await fetch(`${backendUrl}/api/chat/stream`, {
    body: await request.text(),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  return new Response(response.body, {
    headers: {
      "Cache-Control": "no-cache",
      "Content-Type": "text/event-stream",
    },
    status: response.status,
  });
}
