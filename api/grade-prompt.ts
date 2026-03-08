import Anthropic from "@anthropic-ai/sdk";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { checkRateLimit } from "./_rateLimit";

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

const GRADING_SYSTEM_PROMPT = `You are an expert prompt engineering coach. You are grading a LEARNER'S PROMPT — not Claude's response.

The learner's goal is to write an effective prompt. Claude's response is evidence of how well the prompt worked, but the prompt itself is what you are evaluating.

You are given:
- SCENARIO_GOAL: What the learner is trying to accomplish (the scenario's objective)
- USER_PROMPT: The learner's prompt — THIS IS WHAT YOU ARE GRADING
- CLAUDE_RESPONSE: What Claude responded — use this as evidence of whether the prompt was clear and effective

Evaluate on TWO dimensions:

1. OBJECTIVE CHECK: Did the USER'S PROMPT successfully guide Claude toward the scenario's goal?
   - Ask: did the prompt give Claude the right instructions to accomplish this type of task?
   - Use Claude's response as evidence — if Claude went off-track, was it because the prompt lacked clarity or key instructions?
   - Do NOT penalize for Claude's knowledge gaps or general capabilities — only for what the prompt failed to specify or instruct.
   - If Claude partially met the goal, consider whether better prompt instructions would have produced a better result.

2. TECHNIQUE (prompt engineering best practices):
   - Persona: Did the user assign a role to Claude?
   - Specificity: Is the task instruction clear and unambiguous?
   - Output Format: Did they specify structure, length, or format?
   - Examples: Did they include few-shot examples where helpful?
   - Context: Did they provide sufficient background for the task?
   - Constraints: Did they define what NOT to do where relevant?

Respond with ONLY a valid JSON object. No markdown, no code fences, no extra text.

{
  "objectiveMet": boolean,
  "objectiveFeedback": "One sentence about whether the prompt effectively guided Claude toward the scenario's goal, and why/why not.",
  "strengths": ["Each strength as a short, specific phrase about what the prompt did well"],
  "gaps": ["Each gap as a short phrase naming the missing prompt technique — e.g. 'No persona assigned', 'Output format unspecified'"],
  "rewrittenPrompt": "A complete rewritten version of the user's prompt demonstrating all improvements. Empty string if prompt is already effective.",
  "isEffective": boolean
}

Set isEffective to true only if objectiveMet is true AND there are no significant gaps.
If isEffective is true, gaps must be empty array and rewrittenPrompt must be empty string.`;

function isValidFeedback(obj: unknown): obj is {
  objectiveMet: boolean;
  objectiveFeedback: string;
  strengths: string[];
  gaps: string[];
  rewrittenPrompt: string;
  isEffective: boolean;
} {
  if (!obj || typeof obj !== "object") return false;
  const f = obj as Record<string, unknown>;
  return (
    typeof f.objectiveMet === "boolean" &&
    typeof f.objectiveFeedback === "string" &&
    Array.isArray(f.strengths) &&
    Array.isArray(f.gaps) &&
    typeof f.rewrittenPrompt === "string" &&
    typeof f.isEffective === "boolean"
  );
}

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

  const rawIp = req.headers["x-forwarded-for"];
  const ip = Array.isArray(rawIp) ? rawIp[0] : (rawIp ?? "unknown");

  if (!checkRateLimit(ip)) {
    res.status(429).json({ error: "Too many requests. Please wait a moment and try again." });
    return;
  }

  if (userPrompt.trim().length > 4000) {
    res.status(400).json({ error: "Prompt exceeds 4000 character limit." });
    return;
  }

  if (claudeResponse.trim().length > 8000) {
    res.status(400).json({ error: "Response exceeds 8000 character limit." });
    return;
  }

  const userMessage = `SCENARIO_GOAL:
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
      const cleaned = firstBlock.text
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```\s*$/i, "")
        .trim();
      feedback = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse grading JSON:", firstBlock.text);
      res.status(500).json({ error: "Could not parse grading response. Please try again." });
      return;
    }

    if (!isValidFeedback(feedback)) {
      console.error("Grading response has unexpected shape:", feedback);
      res.status(500).json({ error: "Received an unexpected grading format. Please try again." });
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
