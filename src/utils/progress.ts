const STORAGE_KEY = "promptarena_progress";

export interface Progress {
  completedScenarios: Record<string, number>;
}

export function loadProgress(): Progress {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored
    ? (JSON.parse(stored) as Progress)
    : { completedScenarios: {} };
}

export function saveProgress(progress: Progress): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function markScenarioComplete(scenarioId: string, score: number): void {
  const progress = loadProgress();
  progress.completedScenarios[scenarioId] = score;
  saveProgress(progress);
}

export function isScenarioCompleted(scenarioId: string): boolean {
  return scenarioId in loadProgress().completedScenarios;
}
