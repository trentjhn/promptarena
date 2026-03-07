import { useState, useCallback } from "react";
import { scenarios } from "../data/scenarios";
import { submitPromptToApi } from "../utils/api-client";
import { loadProgress, markScenarioComplete } from "../utils/progress";
import { ScenarioCard } from "../components/ScenarioCard";
import { PromptEditor } from "../components/PromptEditor";
import { ResponseDisplay } from "../components/ResponseDisplay";
import { RubricDisplay } from "../components/RubricDisplay";
import { SolutionModal } from "../components/SolutionModal";
import "./Arena.css";

export function Arena() {
  const [selectedScenario, setSelectedScenario] = useState(scenarios[0]);
  const [userPrompt, setUserPrompt] = useState("");
  const [claudeResponse, setClaudeResponse] = useState("");
  const [tokensUsed, setTokensUsed] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSolution, setShowSolution] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [completedIds, setCompletedIds] = useState<Set<string>>(() => {
    const { completedScenarios } = loadProgress();
    return new Set(scenarios.filter((s) => s.id in completedScenarios).map((s) => s.id));
  });

  async function handleSubmitPrompt() {
    setIsLoading(true);
    setError("");

    try {
      const result = await submitPromptToApi(userPrompt, selectedScenario.task);
      setClaudeResponse(result.response);
      setTokensUsed(result.tokensUsed);
      setHasSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit prompt");
    } finally {
      setIsLoading(false);
    }
  }

  function handleGradeSubmit(score: number) {
    markScenarioComplete(selectedScenario.id, score);
    setCompletedIds((prev) => new Set([...prev, selectedScenario.id]));

    const nextIdx =
      scenarios.findIndex((s) => s.id === selectedScenario.id) + 1;
    if (nextIdx < scenarios.length) {
      selectScenario(scenarios[nextIdx].id);
    }
  }

  function selectScenario(id: string) {
    const scenario = scenarios.find((s) => s.id === id);
    if (!scenario) {
      console.error(
        `selectScenario: no scenario found with id "${id}". Available:`,
        scenarios.map((s) => s.id)
      );
      return;
    }
    setSelectedScenario(scenario);
    setUserPrompt("");
    setClaudeResponse("");
    setHasSubmitted(false);
    setError("");
    setShowSolution(false);
  }

  const handleCloseSolution = useCallback(() => setShowSolution(false), []);

  return (
    <div className="arena">
      <header className="arena__header">
        <h1>PromptArena</h1>
        <p className="arena__subtitle">
          Learn prompt engineering through hands-on practice with real Claude
          feedback.
        </p>
      </header>

      <div className="arena__layout">
        <aside className="arena__sidebar">
          <p className="sidebar-label">Scenarios</p>
          {scenarios.map((scenario) => (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              isCompleted={completedIds.has(scenario.id)}
              isSelected={selectedScenario.id === scenario.id}
              onClick={() => selectScenario(scenario.id)}
            />
          ))}
        </aside>

        <main className="arena__content">
          <div className="scenario-info">
            <h2 className="scenario-title">{selectedScenario.title}</h2>
            <p className="scenario-description">{selectedScenario.description}</p>
            <div className="scenario-task">
              <p className="task-label">Your Task</p>
              <pre className="task-block">{selectedScenario.task}</pre>
            </div>
          </div>

          <PromptEditor
            value={userPrompt}
            onChange={setUserPrompt}
            onSubmit={handleSubmitPrompt}
            isLoading={isLoading}
          />

          {error && <div className="arena__error">{error}</div>}

          {claudeResponse && (
            <ResponseDisplay response={claudeResponse} tokensUsed={tokensUsed} />
          )}

          {hasSubmitted && (
            <>
              <RubricDisplay
                scenario={selectedScenario}
                onGrade={handleGradeSubmit}
              />
              <button
                className="btn-solution"
                onClick={() => setShowSolution(true)}
              >
                See Expert Solution
              </button>
            </>
          )}
        </main>
      </div>

      {showSolution && (
        <SolutionModal
          scenario={selectedScenario}
          onClose={handleCloseSolution}
        />
      )}
    </div>
  );
}
