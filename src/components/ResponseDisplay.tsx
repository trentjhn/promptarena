import "./ResponseDisplay.css";

interface ResponseDisplayProps {
  response: string;
  tokensUsed: number;
}

export function ResponseDisplay({ response, tokensUsed }: ResponseDisplayProps) {
  return (
    <div className="response-display">
      <div className="response-display__header">
        <h3>Claude's Response</h3>
        <span className="response-display__tokens token-count">
          {tokensUsed} tokens used
        </span>
      </div>
      <pre className="response-display__content">{response}</pre>
    </div>
  );
}
