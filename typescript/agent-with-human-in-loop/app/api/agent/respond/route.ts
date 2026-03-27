import { resolveQuestion } from "../../../../lib/session-store";

export async function POST(req: Request) {
  const { id, response } = await req.json();

  if (!id || !response) {
    return Response.json(
      { error: "id and response are required" },
      { status: 400 }
    );
  }

  const resolved = resolveQuestion(id, response);

  if (!resolved) {
    return Response.json(
      { error: "No pending question for this session" },
      { status: 400 }
    );
  }

  return Response.json({ ok: true });
}
