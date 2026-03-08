import type { GradeFeedback } from "../types/scenario";
import "./FeedbackDisplay.css";

interface FeedbackDisplayProps {
  feedback: GradeFeedback;
}

export function FeedbackDisplay({ feedback }: FeedbackDisplayProps) {
  const { objectiveMet, objectiveFeedback, strengths, gaps, rewrittenPrompt, isEffective } = feedback;

  function handleCopyRewrite() {
    navigator.clipboard.writeText(rewrittenPrompt).catch(() => {
      /* clipboard unavailable — silently skip */
    });
  }

  return (
    <div className="feedback-display">
      <h3 className="feedback-display__heading">Prompt Feedback</h3>

      <div className={`feedback-objective ${objectiveMet ? "feedback-objective--pass" : "feedback-objective--fail"}`}>
        <span className="feedback-objective__badge">
          {objectiveMet ? "Objective Met" : "Objective Not Met"}
        </span>
        <p className="feedback-objective__text">{objectiveFeedback}</p>
      </div>

      {strengths.length > 0 && (
        <div className="feedback-section">
          <h4 className="feedback-section__title">Strengths</h4>
          <ul className="feedback-list feedback-list--strengths">
            {strengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {!isEffective && gaps.length > 0 && (
        <div className="feedback-section">
          <h4 className="feedback-section__title">Areas to Improve</h4>
          <ul className="feedback-list feedback-list--gaps">
            {gaps.map((g, i) => (
              <li key={i}>{g}</li>
            ))}
          </ul>
        </div>
      )}

      {isEffective && (
        <p className="feedback-effective">
          Your prompt demonstrates effective technique. Well done.
        </p>
      )}

      {!isEffective && rewrittenPrompt && (
        <div className="feedback-section">
          <h4 className="feedback-section__title">Improved Prompt</h4>
          <div className="feedback-rewrite">
            <pre className="feedback-rewrite__code">{rewrittenPrompt}</pre>
            <button className="feedback-rewrite__copy" onClick={handleCopyRewrite}>
              Copy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
