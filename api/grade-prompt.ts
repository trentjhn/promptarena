import Anthropic from "@anthropic-ai/sdk";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

type ErrorEntry = {
  match: (e: unknown) => boolean;
  status: number;
  message: string;
  label: string;
};

const API_ERRORS: ErrorEntry[] = [
  {
    match: (e) => e instanceof Anthropic.AuthenticationError,
    status: 500,
    message: "Service configuration error. Please contact support.",
    label: "Anthropic auth error — check ANTHROPIC_API_KEY",
  },
  {
    match: (e) => e instanceof Anthropic.RateLimitError,
    status: 429,
    message: "The AI service is rate-limited. Please wait a moment and try again.",
    label: "Anthropic rate limit exceeded",
  },
  {
    match: (e) => e instanceof Anthropic.BadRequestError,
    status: 400,
    message: "Your prompt could not be processed. It may be too long — try shortening it.",
    label: "Anthropic bad request",
  },
  {
    match: (e) =>
      e instanceof Anthropic.APIConnectionError ||
      e instanceof Anthropic.APIConnectionTimeoutError,
    status: 503,
    message: "Could not reach the AI service. Please try again in a moment.",
    label: "Anthropic connectivity error",
  },
];

const GRADING_SYSTEM_PROMPT = `You are an expert prompt engineering coach. Evaluate the user's prompt and give actionable feedback.

You are given:
- SCENARIO_TASK: The instructions Claude was given (defines what the task requires)
- USER_PROMPT: The prompt the learner wrote
- CLAUDE_RESPONSE: What Claude actually responded

Evaluate on TWO dimensions:

1. OBJECTIVE CHECK: Did Claude's response actually accomplish what SCENARIO_TASK required? Judge the response quality, completeness, and alignment with the task.

2. TECHNIQUE (prompt engineering best practices):
   - Persona: Did the user assign a role to Claude?
   - Specificity: Is the task clear and unambiguous?
   - Output Format: Did they specify structure, length, or format?
   - Examples: Did they include few-shot examples where helpful?
   - Context: Did they provide sufficient background?
   - Constraints: Did they define what NOT to do where relevant?

Respond with ONLY a valid JSON object. No markdown, no code fences, no extra text.

{
  "objectiveMet": boolean,
  "objectiveFeedback": "One sentence: did the response achieve the scenario goal, and why/why not?",
  "strengths": ["Each strength as a short, specific phrase"],
  "gaps": ["Each gap as a short phrase naming the missing technique — e.g. 'No persona assigned', 'Output format unspecified'"],
  "rewrittenPrompt": "A complete rewritten version of the user's prompt demonstrating all improvements. Empty string if prompt is already effective.",
  "isEffective": boolean
}

Set isEffective to true only if objectiveMet is true AND there are no significant gaps.
If isEffective is true, gaps must be empty array and rewrittenPrompt must be empty string.`;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!req.body || typeof req.body !== "object") {
    res.status(400).json({ error: "Invalid request body." });
    return;
  }

  const { userPrompt, scenarioTask, claudeResponse } = req.body as {
    userPrompt?: string;
    scenarioTask?: string;
    claudeResponse?: string;
  };

  if (!userPrompt?.trim() || !scenarioTask?.trim() || !claudeResponse?.trim()) {
    res.status(400).json({ error: "Missing userPrompt, scenarioTask, or claudeResponse" });
    return;
  }

  const userMessage = `SCENARIO_TASK:
${scenarioTask}

USER_PROMPT:
${userPrompt}

CLAUDE_RESPONSE:
${claudeResponse}`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: GRADING_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const firstBlock = message.content[0];
    if (!firstBlock || firstBlock.type !== "text") {
      console.error(
        "Unexpected content block from Anthropic API:",
        firstBlock?.type ?? "no content"
      );
      res.status(500).json({ error: "Received an unexpected response format. Please try again." });
      return;
    }

    let feedback: unknown;
    try {
      feedback = JSON.parse(firstBlock.text);
    } catch {
      console.error("Failed to parse grading JSON:", firstBlock.text);
      res.status(500).json({ error: "Could not parse grading response. Please try again." });
      return;
    }

    res.status(200).json(feedback);
  } catch (error) {
    const entry = API_ERRORS.find((e) => e.match(error));
    if (entry) {
      console.error(`${entry.label}:`, error);
      res.status(entry.status).json({ error: entry.message });
    } else {
      console.error("Unexpected error in grade-prompt handler:", error);
      res.status(500).json({ error: "An unexpected error occurred. Please try again." });
    }
  }
}
