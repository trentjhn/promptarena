import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { submitPromptToApi, gradePromptApi } from "../utils/api-client";
import type { GradeFeedback } from "../types/scenario";

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

  describe("gradePromptApi", () => {
    const mockFeedback: GradeFeedback = {
      objectiveMet: true,
      objectiveFeedback: "Response achieved the scenario goal.",
      strengths: ["Clear persona assigned", "Output format specified"],
      gaps: ["No examples provided"],
      rewrittenPrompt: "You are a senior analyst...",
      isEffective: false,
    };

    it("calls grade endpoint and returns feedback", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockFeedback),
      });

      const result = await gradePromptApi("my prompt", "scenario task", "claude response");

      expect(global.fetch).toHaveBeenCalledWith("/api/grade-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userPrompt: "my prompt",
          scenarioTask: "scenario task",
          claudeResponse: "claude response",
        }),
      });
      expect(result.objectiveMet).toBe(true);
      expect(result.strengths).toHaveLength(2);
    });

    it("surfaces server error message from response body", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: vi.fn().mockResolvedValue({ error: "Rate limit exceeded." }),
      });

      await expect(gradePromptApi("prompt", "task", "response")).rejects.toThrow(
        "Rate limit exceeded."
      );
    });

    it("falls back to status message when body is not JSON", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: vi.fn().mockRejectedValue(new SyntaxError("not json")),
      });

      await expect(gradePromptApi("prompt", "task", "response")).rejects.toThrow(
        "Request failed (500)"
      );
    });
  });
});
