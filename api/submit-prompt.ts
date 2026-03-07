import Anthropic from "@anthropic-ai/sdk";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { userPrompt, scenarioTask } = req.body as {
    userPrompt?: string;
    scenarioTask?: string;
  };

  if (!userPrompt || !scenarioTask) {
    res.status(400).json({ error: "Missing userPrompt or scenarioTask" });
    return;
  }

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: scenarioTask,
      messages: [{ role: "user", content: userPrompt }],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    res.status(200).json({
      success: true,
      response: responseText,
      tokensUsed: message.usage.input_tokens + message.usage.output_tokens,
    });
  } catch (error) {
    console.error("Claude API error:", error);
    res.status(500).json({ error: "Failed to process prompt" });
  }
}
