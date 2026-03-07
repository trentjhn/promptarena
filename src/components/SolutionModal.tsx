import { useEffect } from "react";
import type { Scenario } from "../types/scenario";
import "./SolutionModal.css";

interface SolutionModalProps {
  scenario: Scenario;
  onClose: () => void;
}

export function SolutionModal({ scenario, onClose }: SolutionModalProps) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-content" role="dialog" aria-modal="true">
        <h2>Expert Solution</h2>
        <pre className="modal-expert-prompt">{scenario.expertPrompt}</pre>

        {scenario.hints && scenario.hints.length > 0 && (
          <div className="modal-insights">
            <h3>Key Insights</h3>
            <ul className="modal-hints">
              {scenario.hints.map((hint, idx) => (
                <li key={idx}>{hint}</li>
              ))}
            </ul>
          </div>
        )}

        <button className="btn-primary" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
