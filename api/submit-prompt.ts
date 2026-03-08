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

  const { userPrompt, scenarioTask } = req.body as {
    userPrompt?: string;
    scenarioTask?: string;
  };

  if (!userPrompt?.trim() || !scenarioTask?.trim()) {
    res.status(400).json({ error: "Missing userPrompt or scenarioTask" });
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

  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: scenarioTask,
      messages: [{ role: "user", content: userPrompt }],
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

    res.status(200).json({
      success: true,
      response: firstBlock.text,
      tokensUsed: message.usage.input_tokens + message.usage.output_tokens,
    });
  } catch (error) {
    const entry = API_ERRORS.find((e) => e.match(error));
    if (entry) {
      console.error(`${entry.label}:`, error);
      res.status(entry.status).json({ error: entry.message });
    } else {
      console.error("Unexpected error in submit-prompt handler:", error);
      res.status(500).json({ error: "An unexpected error occurred. Please try again." });
    }
  }
}
