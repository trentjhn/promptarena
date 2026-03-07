import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { submitPromptToApi } from "../utils/api-client";

describe("API Client", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("submitPromptToApi", () => {
    it("submits prompt and returns response with tokens", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          response: "Claude's response text",
          tokensUsed: 342,
        }),
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        mockResponse
      );

      const result = await submitPromptToApi("user prompt text", "scenario task");

      expect(global.fetch).toHaveBeenCalledWith("/api/submit-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userPrompt: "user prompt text",
          scenarioTask: "scenario task",
        }),
      });

      expect(result.response).toBe("Claude's response text");
      expect(result.tokensUsed).toBe(342);
    });

    it("throws error on API failure (non-ok response)", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      await expect(submitPromptToApi("prompt", "task")).rejects.toThrow(
        /API error/
      );
    });

    it("throws error on network failure", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("Network error")
      );

      await expect(submitPromptToApi("prompt", "task")).rejects.toThrow(
        /Network error/
      );
    });
  });
});
