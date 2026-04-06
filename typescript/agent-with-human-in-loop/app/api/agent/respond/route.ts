// POST /api/agent/respond — delivers the human's answer back to the agent.
// This unblocks the Promise that the askHuman tool is awaiting in the session
// store, allowing the agent to continue filling out the form.

import { resolveQuestion } from "../../../../lib/session-store";

export async function POST(req: Request) {
  const { id, response } = await req.json();

  if (!id || !response) {
    return Response.json({ error: "id and response are required" }, { status: 400 });
  }

  const resolved = resolveQuestion(id, response);

  if (!resolved) {
    return Response.json({ error: "No pending question for this session" }, { status: 400 });
  }

  return Response.json({ ok: true });
}
