import { useState } from "react";
import type { Scenario } from "../types/scenario";
import "./RubricDisplay.css";

interface RubricDisplayProps {
  scenario: Scenario;
  onGrade: (score: number) => void;
}

export function RubricDisplay({ scenario, onGrade }: RubricDisplayProps) {
  const [scores, setScores] = useState<Record<number, number>>({});

  const totalPossible = scenario.rubric.reduce((sum, r) => sum + r.points, 0);
  const earnedScore = Object.values(scores).reduce((sum, s) => sum + s, 0);
  const allGraded = Object.keys(scores).length === scenario.rubric.length;

  function handleCriterionGrade(idx: number, points: number) {
    setScores((prev) => ({ ...prev, [idx]: points }));
  }

  return (
    <div className="rubric-display">
      <h3>Evaluate Your Prompt</h3>
      <div className="rubric-display__items">
        {scenario.rubric.map((criterion, idx) => (
          <div key={idx} className="rubric-item">
            <div className="rubric-item__header">
              <span className="rubric-item__criterion">{criterion.criterion}</span>
              <span className="rubric-item__points">{criterion.points} pts</span>
            </div>
            <p className="rubric-item__description">{criterion.description}</p>
            <div className="rubric-item__actions">
              <button
                className={`btn-grade btn-grade--pass${scores[idx] === criterion.points ? " btn-grade--active" : ""}`}
                onClick={() => handleCriterionGrade(idx, criterion.points)}
              >
                Pass
              </button>
              <button
                className={`btn-grade btn-grade--fail${idx in scores && scores[idx] === 0 ? " btn-grade--active" : ""}`}
                onClick={() => handleCriterionGrade(idx, 0)}
              >
                Needs Work
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="rubric-display__total">
        <span>
          Score: {earnedScore} / {totalPossible} points
        </span>
      </div>

      {allGraded && (
        <button className="btn-primary" onClick={() => onGrade(earnedScore)}>
          Submit Score &amp; Continue
        </button>
      )}
    </div>
  );
}
