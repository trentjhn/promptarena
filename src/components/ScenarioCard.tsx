import type { Scenario } from "../types/scenario";
import "./ScenarioCard.css";

interface ScenarioCardProps {
  scenario: Scenario;
  isCompleted: boolean;
  isSelected: boolean;
  onClick: () => void;
}

export function ScenarioCard({
  scenario,
  isCompleted,
  isSelected,
  onClick,
}: ScenarioCardProps) {
  return (
    <button
      className="scenario-card"
      data-selected={isSelected}
      onClick={onClick}
      aria-pressed={isSelected}
    >
      <div className="scenario-card__header">
        <span className="scenario-card__number">#{scenario.number}</span>
        <span className={`scenario-card__difficulty difficulty--${scenario.difficulty}`}>
          {scenario.difficulty}
        </span>
      </div>
      <h3 className="scenario-card__title">{scenario.title}</h3>
      {isCompleted && (
        <span className="scenario-card__completed">Completed</span>
      )}
    </button>
  );
}
