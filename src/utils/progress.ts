const STORAGE_KEY = "promptarena_progress";

export interface Progress {
  completedScenarios: Record<string, number>;
}

export function loadProgress(): Progress {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { completedScenarios: {} };
    const parsed = JSON.parse(stored) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "completedScenarios" in parsed &&
      typeof (parsed as Record<string, unknown>).completedScenarios === "object" &&
      (parsed as Record<string, unknown>).completedScenarios !== null
    ) {
      return parsed as Progress;
    }
    console.error("progress: stored data had unexpected shape, resetting");
    return { completedScenarios: {} };
  } catch (err) {
    console.error("progress: failed to load from localStorage:", err);
    return { completedScenarios: {} };
  }
}

export function saveProgress(progress: Progress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (err) {
    console.error("progress: failed to save to localStorage:", err);
  }
}

export function markScenarioComplete(scenarioId: string, score: number): void {
  const progress = loadProgress();
  saveProgress({
    completedScenarios: { ...progress.completedScenarios, [scenarioId]: score },
  });
}

export function isScenarioCompleted(scenarioId: string): boolean {
  return scenarioId in loadProgress().completedScenarios;
}

export function clearProgress(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error("progress: failed to clear localStorage:", err);
  }
}
