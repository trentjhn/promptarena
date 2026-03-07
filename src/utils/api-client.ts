export async function submitPromptToApi(
  userPrompt: string,
  scenarioTask: string
): Promise<{ response: string; tokensUsed: number }> {
  const response = await fetch("/api/submit-prompt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userPrompt, scenarioTask }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<{ response: string; tokensUsed: number }>;
}
