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

    it("surfaces the server error message from the response body", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
        json: vi.fn().mockResolvedValue({
          error: "Rate limit exceeded. Please wait and try again.",
        }),
      });

      await expect(submitPromptToApi("prompt", "task")).rejects.toThrow(
        "Rate limit exceeded. Please wait and try again."
      );
    });

    it("falls back to status code message when response body is not JSON", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: vi.fn().mockRejectedValue(new SyntaxError("not json")),
      });

      await expect(submitPromptToApi("prompt", "task")).rejects.toThrow(
        "Request failed (500)"
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

    it("throws immediately when prompt is empty", async () => {
      await expect(submitPromptToApi("", "task")).rejects.toThrow(
        "Prompt cannot be empty"
      );
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("throws immediately when prompt is whitespace only", async () => {
      await expect(submitPromptToApi("   ", "task")).rejects.toThrow(
        "Prompt cannot be empty"
      );
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
