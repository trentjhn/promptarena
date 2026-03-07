import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  loadProgress,
  saveProgress,
  markScenarioComplete,
  isScenarioCompleted,
} from "../utils/progress";

describe("Progress Tracking", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("loadProgress", () => {
    it("returns empty progress on first call", () => {
      const progress = loadProgress();
      expect(progress.completedScenarios).toEqual({});
    });

    it("returns saved progress from localStorage", () => {
      const testProgress = { completedScenarios: { "test-id": 85 } };
      localStorage.setItem("promptarena_progress", JSON.stringify(testProgress));

      const loaded = loadProgress();
      expect(loaded.completedScenarios["test-id"]).toBe(85);
    });
  });

  describe("saveProgress", () => {
    it("persists progress to localStorage", () => {
      const progress = { completedScenarios: { "scenario-1": 90 } };
      saveProgress(progress);

      const stored = JSON.parse(
        localStorage.getItem("promptarena_progress") ?? "{}"
      );
      expect(stored.completedScenarios["scenario-1"]).toBe(90);
    });
  });

  describe("markScenarioComplete", () => {
    it("updates score for scenario", () => {
      markScenarioComplete("scenario-1", 75);

      const progress = loadProgress();
      expect(progress.completedScenarios["scenario-1"]).toBe(75);
    });

    it("overwrites existing score when marked again", () => {
      markScenarioComplete("scenario-1", 60);
      markScenarioComplete("scenario-1", 95);

      const progress = loadProgress();
      expect(progress.completedScenarios["scenario-1"]).toBe(95);
    });
  });

  describe("isScenarioCompleted", () => {
    it("returns false for uncompleted scenario", () => {
      expect(isScenarioCompleted("nonexistent")).toBe(false);
    });

    it("returns true for completed scenario", () => {
      markScenarioComplete("scenario-1", 80);
      expect(isScenarioCompleted("scenario-1")).toBe(true);
    });
  });
});
