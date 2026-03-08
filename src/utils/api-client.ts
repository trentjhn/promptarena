import type { GradeFeedback } from "../types/scenario";

export async function submitPromptToApi(
  userPrompt: string,
  scenarioTask: string
): Promise<{ response: string; tokensUsed: number }> {
  if (!userPrompt.trim()) throw new Error("Prompt cannot be empty");
  if (!scenarioTask.trim()) throw new Error("Scenario task is required");

  const res = await fetch("/api/submit-prompt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userPrompt, scenarioTask }),
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* response body not JSON — use status-based fallback */
    }
    throw new Error(message);
  }

  return res.json() as Promise<{ response: string; tokensUsed: number }>;
}

export async function gradePromptApi(
  userPrompt: string,
  scenarioTask: string,
  claudeResponse: string
): Promise<GradeFeedback> {
  const res = await fetch("/api/grade-prompt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userPrompt, scenarioTask, claudeResponse }),
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* response body not JSON — use status-based fallback */
    }
    throw new Error(message);
  }

  return res.json() as Promise<GradeFeedback>;
}
