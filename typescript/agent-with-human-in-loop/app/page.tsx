// Stagehand + Browserbase: Human-in-the-Loop Agent — frontend UI
// Three-phase UI: form → agent running (with live browser view) → complete.
// When the agent calls askHuman, the UI switches to "waiting" phase and
// shows an input field. The human's response is POSTed to /api/agent/respond.

"use client";

import { useState, useRef, useCallback } from "react";

type LogEntry = {
  type: "status" | "question" | "complete" | "error" | "human";
  message: string;
  timestamp: Date;
};

export default function Home() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<"form" | "running" | "waiting" | "complete" | "error">("form");
  const [debuggerUrl, setDebuggerUrl] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [humanInput, setHumanInput] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [completionMessage, setCompletionMessage] = useState("");
  const [replayUrl, setReplayUrl] = useState("");
  const logsEndRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((type: LogEntry["type"], message: string) => {
    setLogs((prev) => [...prev, { type, message, timestamp: new Date() }]);
  }, []);

  const handleStart = async () => {
    if (!firstName.trim() || !lastName.trim() || !resumeFile) return;

    setPhase("running");
    addLog("status", `Starting agent for ${firstName} ${lastName}...`);

    // Convert resume to base64 for transport
    const resumeBase64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]); // strip data URL prefix
      };
      reader.readAsDataURL(resumeFile);
    });

    const res = await fetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        resumeBase64,
        resumeFileName: resumeFile.name,
      }),
    });

    if (!res.body) {
      setPhase("error");
      addLog("error", "Failed to connect to agent");
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    let eventType = "";
    let eventData = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Parse SSE events from the buffer
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("event: ")) {
          eventType = line.slice(7);
        } else if (line.startsWith("data: ")) {
          eventData = line.slice(6);
        } else if (line === "" && eventType && eventData) {
          try {
            const data = JSON.parse(eventData);
            handleSSEEvent(eventType, data);
          } catch {
            // skip malformed events
          }
          eventType = "";
          eventData = "";
        }
      }
    }
  };

  const handleSSEEvent = (event: string, data: Record<string, unknown>) => {
    switch (event) {
      case "session":
        setDebuggerUrl(data.debuggerUrl as string);
        setSessionId(data.id as string);
        addLog("status", "Browser session started");
        break;
      case "status":
        addLog("status", data.message as string);
        break;
      case "question":
        setCurrentQuestion(data.question as string);
        setPhase("waiting");
        addLog("question", data.question as string);
        break;
      case "complete":
        setPhase("complete");
        setCompletionMessage(data.message as string);
        setReplayUrl(data.sessionReplayUrl as string);
        addLog("complete", data.message as string);
        break;
      case "error":
        setPhase("error");
        addLog("error", data.message as string);
        break;
    }
  };

  const handleRespond = async () => {
    if (!humanInput.trim() || !sessionId) return;

    const response = humanInput.trim();
    setHumanInput("");
    setPhase("running");
    addLog("human", response);

    try {
      const res = await fetch("/api/agent/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sessionId, response }),
      });

      if (!res.ok) {
        // Restore the input so the user can retry
        setHumanInput(response);
        setPhase("waiting");
        addLog("error", "Failed to send response to agent. Please try again.");
      }
    } catch {
      setHumanInput(response);
      setPhase("waiting");
      addLog("error", "Network error sending response. Please try again.");
    }
  };

  // --- Form view ---
  if (phase === "form") {
    return (
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold tracking-tight">Human-in-the-Loop Agent</h1>
            <p className="text-sm text-neutral-400">
              Fill out your first and last name, upload a resume (you can use the{" "}
              <code className="text-neutral-300">template_resume.pdf</code> file in the project root
              as an example), and click <strong className="text-neutral-300">Start Agent</strong>.
              An AI agent will apply to a job on your behalf — when it needs more information, it
              will pause to ask you directly.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Jane"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Resume</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  if (file && file.size > 10 * 1024 * 1024) {
                    alert("File must be under 10MB");
                    e.target.value = "";
                    setResumeFile(null);
                    return;
                  }
                  setResumeFile(file);
                }}
                className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-neutral-700 file:px-3 file:py-1 file:text-sm file:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-neutral-500 mt-1">PDF, DOC, or DOCX up to 10MB</p>
            </div>
            <button
              onClick={handleStart}
              disabled={!firstName.trim() || !lastName.trim() || !resumeFile}
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Start Agent
            </button>
          </div>
        </div>
      </main>
    );
  }

  // --- Agent running / waiting / complete view ---
  return (
    <main className="flex-1 flex flex-col lg:flex-row h-screen overflow-hidden">
      {/* Left: Browser live view */}
      <div className="flex-1 flex flex-col min-h-0 bg-black">
        <div className="px-4 py-3 border-b border-neutral-800 flex items-center gap-2">
          <div
            className={`h-2 w-2 rounded-full ${
              phase === "running"
                ? "bg-green-500 animate-pulse"
                : phase === "waiting"
                  ? "bg-yellow-500 animate-pulse"
                  : phase === "complete"
                    ? "bg-green-500"
                    : "bg-red-500"
            }`}
          />
          <span className="text-xs text-neutral-400 font-mono">
            {phase === "running" && "Agent working..."}
            {phase === "waiting" && "Waiting for your input"}
            {phase === "complete" && "Complete"}
            {phase === "error" && "Error"}
          </span>
        </div>
        {debuggerUrl ? (
          <iframe
            src={debuggerUrl}
            className="flex-1 w-full border-0 pointer-events-none"
            sandbox="allow-same-origin allow-scripts"
            allow="clipboard-read; clipboard-write"
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-neutral-500 text-sm">
            Starting browser session...
          </div>
        )}
      </div>

      {/* Right: Activity log + human input */}
      <div className="w-full lg:w-96 border-l border-neutral-800 flex flex-col min-h-0">
        <div className="px-4 py-3 border-b border-neutral-800">
          <h2 className="text-sm font-semibold">Activity</h2>
        </div>

        {/* Scrollable log */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 text-sm min-h-0">
          {logs.map((log, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-neutral-600 text-xs font-mono shrink-0 mt-0.5">
                {log.timestamp.toLocaleTimeString()}
              </span>
              <span
                className={
                  log.type === "question"
                    ? "text-yellow-400"
                    : log.type === "human"
                      ? "text-blue-400"
                      : log.type === "error"
                        ? "text-red-400"
                        : log.type === "complete"
                          ? "text-green-400"
                          : "text-neutral-300"
                }
              >
                {log.type === "question" && "Agent asks: "}
                {log.type === "human" && "You: "}
                {log.message}
              </span>
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-neutral-800 p-4">
          {phase === "waiting" && (
            <div className="space-y-3">
              <div className="rounded-md bg-yellow-500/10 border border-yellow-500/30 p-3">
                <p className="text-xs text-yellow-400 font-medium mb-1">Agent needs your help:</p>
                <p className="text-sm text-yellow-200">{currentQuestion}</p>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={humanInput}
                  onChange={(e) => setHumanInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRespond()}
                  className="flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  placeholder="Type your response..."
                  autoFocus
                />
                <button
                  onClick={handleRespond}
                  disabled={!humanInput.trim()}
                  className="rounded-md bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-500 disabled:opacity-40 transition-colors"
                >
                  Send
                </button>
              </div>
            </div>
          )}

          {phase === "running" && (
            <p className="text-xs text-neutral-500 text-center">
              Agent is working autonomously. It will ask if it needs help.
            </p>
          )}

          {phase === "complete" && (
            <div className="space-y-2 text-center">
              <p className="text-sm text-green-400">{completionMessage}</p>
              {replayUrl && (
                <a
                  href={replayUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 underline"
                >
                  View session replay
                </a>
              )}
            </div>
          )}

          {phase === "error" && (
            <p className="text-sm text-red-400 text-center">
              Something went wrong. Check the logs above.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
