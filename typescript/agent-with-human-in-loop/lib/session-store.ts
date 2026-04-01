// Stagehand + Browserbase: Human-in-the-Loop Agent — session store
//
// In-memory session store that coordinates between the SSE stream (where the
// agent runs) and the /api/agent/respond endpoint (where human input arrives).
//
// How it works:
//   1. When the agent calls askHuman, it creates a Promise and stashes its
//      `resolve` function here via setQuestion().
//   2. The agent's execute() blocks on that Promise — the SSE stream stays open.
//   3. When the human submits an answer, the /api/agent/respond route calls
//      resolveQuestion(), which invokes the stashed `resolve` — unblocking the
//      agent so it can continue.
//
// In production you'd replace this with Postgres, Redis, or DynamoDB — the
// agent polls a row in the table for a response, and the frontend writes to
// that row when the human answers.

export interface SessionState {
  status: "running" | "waiting_for_human" | "complete" | "error";
  question?: string;
  resolver?: (response: string) => void;
  debuggerUrl?: string;
  sessionId?: string;
}

const sessions = new Map<string, SessionState>();

export function createSession(id: string, debuggerUrl: string, bbSessionId: string): SessionState {
  const state: SessionState = {
    status: "running",
    debuggerUrl,
    sessionId: bbSessionId,
  };
  sessions.set(id, state);
  return state;
}

export function getSession(id: string): SessionState | undefined {
  return sessions.get(id);
}

export function setQuestion(
  id: string,
  question: string,
  resolver: (response: string) => void
) {
  const session = sessions.get(id);
  if (session) {
    session.status = "waiting_for_human";
    session.question = question;
    session.resolver = resolver;
  }
}

export function resolveQuestion(id: string, response: string): boolean {
  const session = sessions.get(id);
  if (session?.resolver) {
    session.resolver(response);
    session.status = "running";
    session.question = undefined;
    session.resolver = undefined;
    return true;
  }
  return false;
}

export function completeSession(id: string) {
  const session = sessions.get(id);
  if (session) {
    session.status = "complete";
  }
}

export function errorSession(id: string) {
  const session = sessions.get(id);
  if (session) {
    session.status = "error";
  }
}
