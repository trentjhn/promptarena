import "./PromptEditor.css";

interface PromptEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

export function PromptEditor({
  value,
  onChange,
  onSubmit,
  isLoading,
}: PromptEditorProps) {
  return (
    <div className="prompt-editor">
      <label htmlFor="prompt-textarea" className="prompt-editor__label">
        Your Prompt
      </label>
      <textarea
        id="prompt-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Write your prompt here. Use Level 4 structure if possible: separate instruction, context, and expected output format."
        className="prompt-editor__textarea"
        rows={10}
      />
      <button
        onClick={onSubmit}
        disabled={isLoading || !value.trim()}
        className="btn-primary"
      >
        {isLoading ? "Submitting..." : "Submit Prompt to Claude"}
      </button>
    </div>
  );
}
