// POST /api/agent — kicks off the agent and returns an SSE stream.
// The frontend reads this stream for real-time status updates, questions
// from the agent, and the final completion/error event.

import { runAgent } from "../../../lib/agent";

// Increase the max duration for Vercel Pro (agent can take a few minutes)
export const maxDuration = 300;

export async function POST(req: Request) {
  const { firstName, lastName, resumeBase64, resumeFileName } = await req.json();

  if (!firstName || !lastName || !resumeBase64 || !resumeFileName) {
    return Response.json(
      { error: "firstName, lastName, resumeBase64, and resumeFileName are required" },
      { status: 400 },
    );
  }

  const id = crypto.randomUUID();

  const stream = new TransformStream<Uint8Array, Uint8Array>();
  const writer = stream.writable.getWriter();

  // Start the agent in the background — don't await it.
  // The stream stays open for the lifetime of the agent execution.
  runAgent({ firstName, lastName, resumeBase64, resumeFileName, id, writer }).catch(() => {
    // Error handling is done inside runAgent
  });

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
