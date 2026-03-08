# LLM Grading Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace self-grading rubrics with automated LLM feedback that evaluates prompt technique and scenario objective, then shows strengths, gaps, and a rewritten prompt.

**Architecture:** A new `api/grade-prompt.ts` serverless function calls Haiku with a structured grading system prompt and returns JSON feedback. A new `FeedbackDisplay` component replaces `RubricDisplay` in `Arena.tsx`. The user submits their prompt, sees Claude's response, then clicks "Get Feedback" to trigger grading.

**Tech Stack:** TypeScript, React 18, Vite, Vitest + React Testing Library, Anthropic SDK (`claude-haiku-4-5-20251001`), Vercel Serverless Functions

---

### Task 1: Add `GradeFeedback` type and `--color-green` token

**Files:**
- Modify: `src/types/scenario.ts`
- Modify: `src/styles/globals.css`

**Step 1: Add `GradeFeedback` to types**

In `src/types/scenario.ts`, add after the existing exports:

```typescript
export interface GradeFeedback {
  objectiveMet: boolean;
  objectiveFeedback: string;
  strengths: string[];
  gaps: string[];
  rewrittenPrompt: string;
  isEffective: boolean;
}
```

Keep `RubricCriterion` and `Scenario` as-is — `Scenario.rubric` still exists (it's in the data), we just won't render it for self-grading.

**Step 2: Add `--color-green` token**

In `src/styles/globals.css`, inside the `:root` block, add alongside `--color-amber`:

```css
--color-green: #166534;
--color-green-bg: #f0fdf4;
```

**Step 3: No test needed** — type definitions and CSS tokens have no runtime behavior to unit test.

**Step 4: Commit**

```bash
git add src/types/scenario.ts src/styles/globals.css
git commit -m "feat: add GradeFeedback type and green color token"
```

---

### Task 2: Add `gradePromptApi()` to API client (TDD)

**Files:**
- Modify: `src/utils/api-client.ts`
- Modify: `src/__tests__/api-client.test.ts`

**Step 1: Write the failing tests**

Add a new `describe("gradePromptApi", ...)` block at the bottom of `src/__tests__/api-client.test.ts`:

```typescript
import { submitPromptToApi, gradePromptApi } from "../utils/api-client";
import type { GradeFeedback } from "../types/scenario";

// (add inside the existing describe("API Client") block, after submitPromptToApi tests)

describe("gradePromptApi", () => {
  const mockFeedback: GradeFeedback = {
    objectiveMet: true,
    objectiveFeedback: "Response achieved the scenario goal.",
    strengths: ["Clear persona assigned", "Output format specified"],
    gaps: ["No examples provided"],
    rewrittenPrompt: "You are a senior analyst...",
    isEffective: false,
  };

  it("calls grade endpoint and returns feedback", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue(mockFeedback),
    });

    const result = await gradePromptApi("my prompt", "scenario task", "claude response");

    expect(global.fetch).toHaveBeenCalledWith("/api/grade-prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userPrompt: "my prompt",
        scenarioTask: "scenario task",
        claudeResponse: "claude response",
      }),
    });
    expect(result.objectiveMet).toBe(true);
    expect(result.strengths).toHaveLength(2);
  });

  it("surfaces server error message from response body", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: vi.fn().mockResolvedValue({ error: "Rate limit exceeded." }),
    });

    await expect(gradePromptApi("prompt", "task", "response")).rejects.toThrow(
      "Rate limit exceeded."
    );
  });

  it("falls back to status message when body is not JSON", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: vi.fn().mockRejectedValue(new SyntaxError("not json")),
    });

    await expect(gradePromptApi("prompt", "task", "response")).rejects.toThrow(
      "Request failed (500)"
    );
  });
});
```

**Step 2: Run to verify tests fail**

```bash
cd /Users/t-rawww/promptarena && npx vitest run src/__tests__/api-client.test.ts
```

Expected: 3 new tests fail with `gradePromptApi is not a function` or similar.

**Step 3: Implement `gradePromptApi` in `src/utils/api-client.ts`**

Add after `submitPromptToApi`:

```typescript
import type { GradeFeedback } from "../types/scenario";

export async function gradePromptApi(
  userPrompt: string,
  scenarioTask: string,
  claudeResponse: string
): Promise<GradeFeedback> {
  const res = await fetch("/api/grade-prompt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userPrompt, scenarioTask, claudeResponse }),
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* response body not JSON — use status-based fallback */
    }
    throw new Error(message);
  }

  return res.json() as Promise<GradeFeedback>;
}
```

**Step 4: Run to verify tests pass**

```bash
npx vitest run src/__tests__/api-client.test.ts
```

Expected: All 9 tests pass (6 existing + 3 new).

**Step 5: Commit**

```bash
git add src/utils/api-client.ts src/__tests__/api-client.test.ts
git commit -m "feat: add gradePromptApi client helper with tests"
```

---

### Task 3: Create `api/grade-prompt.ts` serverless function

**Files:**
- Create: `api/grade-prompt.ts`

**Step 1: Create the file**

```typescript
import Anthropic from "@anthropic-ai/sdk";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

type ErrorEntry = {
  match: (e: unknown) => boolean;
  status: number;
  message: string;
  label: string;
};

const API_ERRORS: ErrorEntry[] = [
  {
    match: (e) => e instanceof Anthropic.AuthenticationError,
    status: 500,
    message: "Service configuration error. Please contact support.",
    label: "Anthropic auth error — check ANTHROPIC_API_KEY",
  },
  {
    match: (e) => e instanceof Anthropic.RateLimitError,
    status: 429,
    message: "The AI service is rate-limited. Please wait a moment and try again.",
    label: "Anthropic rate limit exceeded",
  },
  {
    match: (e) => e instanceof Anthropic.BadRequestError,
    status: 400,
    message: "Your prompt could not be processed. It may be too long — try shortening it.",
    label: "Anthropic bad request",
  },
  {
    match: (e) =>
      e instanceof Anthropic.APIConnectionError ||
      e instanceof Anthropic.APIConnectionTimeoutError,
    status: 503,
    message: "Could not reach the AI service. Please try again in a moment.",
    label: "Anthropic connectivity error",
  },
];

const GRADING_SYSTEM_PROMPT = `You are an expert prompt engineering coach. Evaluate the user's prompt and give actionable feedback.

You are given:
- SCENARIO_TASK: The instructions Claude was given (defines what the task requires)
- USER_PROMPT: The prompt the learner wrote
- CLAUDE_RESPONSE: What Claude actually responded

Evaluate on TWO dimensions:

1. OBJECTIVE CHECK: Did Claude's response actually accomplish what SCENARIO_TASK required? Judge the response quality, completeness, and alignment with the task.

2. TECHNIQUE (prompt engineering best practices):
   - Persona: Did the user assign a role to Claude?
   - Specificity: Is the task clear and unambiguous?
   - Output Format: Did they specify structure, length, or format?
   - Examples: Did they include few-shot examples where helpful?
   - Context: Did they provide sufficient background?
   - Constraints: Did they define what NOT to do where relevant?

Respond with ONLY a valid JSON object. No markdown, no code fences, no extra text.

{
  "objectiveMet": boolean,
  "objectiveFeedback": "One sentence: did the response achieve the scenario goal, and why/why not?",
  "strengths": ["Each strength as a short, specific phrase"],
  "gaps": ["Each gap as a short phrase naming the missing technique — e.g. 'No persona assigned', 'Output format unspecified'"],
  "rewrittenPrompt": "A complete rewritten version of the user's prompt demonstrating all improvements. Empty string if prompt is already effective.",
  "isEffective": boolean
}

Set isEffective to true only if objectiveMet is true AND there are no significant gaps.
If isEffective is true, gaps must be empty array and rewrittenPrompt must be empty string.`;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!req.body || typeof req.body !== "object") {
    res.status(400).json({ error: "Invalid request body." });
    return;
  }

  const { userPrompt, scenarioTask, claudeResponse } = req.body as {
    userPrompt?: string;
    scenarioTask?: string;
    claudeResponse?: string;
  };

  if (!userPrompt?.trim() || !scenarioTask?.trim() || !claudeResponse?.trim()) {
    res.status(400).json({ error: "Missing userPrompt, scenarioTask, or claudeResponse" });
    return;
  }

  const userMessage = `SCENARIO_TASK:
${scenarioTask}

USER_PROMPT:
${userPrompt}

CLAUDE_RESPONSE:
${claudeResponse}`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: GRADING_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const firstBlock = message.content[0];
    if (!firstBlock || firstBlock.type !== "text") {
      console.error(
        "Unexpected content block from Anthropic API:",
        firstBlock?.type ?? "no content"
      );
      res.status(500).json({ error: "Received an unexpected response format. Please try again." });
      return;
    }

    let feedback: unknown;
    try {
      feedback = JSON.parse(firstBlock.text);
    } catch {
      console.error("Failed to parse grading JSON:", firstBlock.text);
      res.status(500).json({ error: "Could not parse grading response. Please try again." });
      return;
    }

    res.status(200).json(feedback);
  } catch (error) {
    const entry = API_ERRORS.find((e) => e.match(error));
    if (entry) {
      console.error(`${entry.label}:`, error);
      res.status(entry.status).json({ error: entry.message });
    } else {
      console.error("Unexpected error in grade-prompt handler:", error);
      res.status(500).json({ error: "An unexpected error occurred. Please try again." });
    }
  }
}
```

**Step 2: No unit test for the serverless function** — it calls a live external API. The pattern is tested via `api-client.test.ts` mocking. Manual verification in Task 7.

**Step 3: Commit**

```bash
git add api/grade-prompt.ts
git commit -m "feat: add grade-prompt serverless function"
```

---

### Task 4: Create `FeedbackDisplay` component

**Files:**
- Create: `src/components/FeedbackDisplay.tsx`
- Create: `src/components/FeedbackDisplay.css`

**Step 1: Create `FeedbackDisplay.tsx`**

```typescript
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
```

**Step 2: Create `FeedbackDisplay.css`**

```css
.feedback-display {
  margin-top: var(--space-8);
  border: 1px solid var(--color-black);
}

.feedback-display__heading {
  font-family: var(--font-display);
  font-size: 18px;
  padding: var(--space-4) var(--space-6);
  border-bottom: 1px solid var(--color-black);
  margin: 0;
}

.feedback-objective {
  display: flex;
  align-items: flex-start;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-6);
  border-bottom: 1px solid var(--color-gray-border);
}

.feedback-objective--pass {
  background: var(--color-green-bg);
}

.feedback-objective--fail {
  background: #fff5f5;
}

.feedback-objective__badge {
  font-family: var(--font-body);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 2px var(--space-2);
  white-space: nowrap;
  border: 1px solid currentColor;
}

.feedback-objective--pass .feedback-objective__badge {
  color: var(--color-green);
}

.feedback-objective--fail .feedback-objective__badge {
  color: var(--color-red);
}

.feedback-objective__text {
  margin: 0;
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--color-black);
}

.feedback-section {
  padding: var(--space-4) var(--space-6);
  border-bottom: 1px solid var(--color-gray-border);
}

.feedback-section:last-child {
  border-bottom: none;
}

.feedback-section__title {
  font-family: var(--font-body);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-gray);
  margin: 0 0 var(--space-2) 0;
}

.feedback-list {
  margin: 0;
  padding-left: var(--space-6);
  font-family: var(--font-body);
  font-size: 14px;
  line-height: 1.6;
}

.feedback-list--strengths li::marker {
  color: var(--color-green);
}

.feedback-list--gaps li::marker {
  color: var(--color-red);
}

.feedback-effective {
  padding: var(--space-4) var(--space-6);
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--color-green);
  font-weight: 600;
  margin: 0;
}

.feedback-rewrite {
  position: relative;
}

.feedback-rewrite__code {
  font-family: var(--font-body);
  font-size: 13px;
  background: var(--color-gray-lighter);
  border: 1px solid var(--color-gray-border);
  padding: var(--space-4);
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  padding-right: 60px;
}

.feedback-rewrite__copy {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  font-family: var(--font-body);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: var(--color-black);
  color: var(--color-white);
  border: none;
  padding: var(--space-1) var(--space-2);
  cursor: pointer;
}

.feedback-rewrite__copy:hover {
  background: var(--color-blue);
}
```

**Step 3: Write a smoke test for `FeedbackDisplay`**

Add to `src/__tests__/components.test.tsx` (after the `SolutionModal` describe block):

```typescript
import { FeedbackDisplay } from "../components/FeedbackDisplay";
import type { GradeFeedback } from "../types/scenario";

const mockFeedback: GradeFeedback = {
  objectiveMet: true,
  objectiveFeedback: "The response covered all required points.",
  strengths: ["Clear persona assigned", "Output format specified"],
  gaps: ["No examples provided"],
  rewrittenPrompt: "You are a senior analyst...",
  isEffective: false,
};

describe("FeedbackDisplay", () => {
  it("renders objective feedback and badge", () => {
    render(<FeedbackDisplay feedback={mockFeedback} />);
    expect(screen.getByText("Objective Met")).toBeInTheDocument();
    expect(screen.getByText("The response covered all required points.")).toBeInTheDocument();
  });

  it("renders strengths list", () => {
    render(<FeedbackDisplay feedback={mockFeedback} />);
    expect(screen.getByText("Clear persona assigned")).toBeInTheDocument();
  });

  it("renders rewritten prompt when not effective", () => {
    render(<FeedbackDisplay feedback={mockFeedback} />);
    expect(screen.getByText("You are a senior analyst...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
  });

  it("shows effective message and hides rewrite when isEffective is true", () => {
    render(
      <FeedbackDisplay
        feedback={{ ...mockFeedback, isEffective: true, gaps: [], rewrittenPrompt: "" }}
      />
    );
    expect(
      screen.getByText(/demonstrates effective technique/i)
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /copy/i })).not.toBeInTheDocument();
  });
});
```

**Step 4: Run tests**

```bash
npx vitest run src/__tests__/components.test.tsx
```

Expected: New FeedbackDisplay tests pass. Existing tests still pass.

**Step 5: Commit**

```bash
git add src/components/FeedbackDisplay.tsx src/components/FeedbackDisplay.css src/__tests__/components.test.tsx
git commit -m "feat: add FeedbackDisplay component with tests"
```

---

### Task 5: Update `Arena.tsx` — wire up grading flow

**Files:**
- Modify: `src/pages/Arena.tsx`

**Step 1: Read the current file** — already known, shown above.

**Step 2: Replace the file content**

Key changes:
- Remove `RubricDisplay` import; add `FeedbackDisplay`
- Add `gradePromptApi` import
- Add `GradeFeedback` type import
- Add `feedbackLoading` and `feedback` state
- Replace `handleGradeSubmit(score)` → `handleContinue()` (no score parameter)
- Add `handleGetFeedback()` async function
- Replace `<RubricDisplay>` + manual grade button with "Get Feedback" button + `<FeedbackDisplay>`
- Add "Continue to Next Scenario" button after feedback

```typescript
import { useState, useCallback } from "react";
import { scenarios } from "../data/scenarios";
import { submitPromptToApi, gradePromptApi } from "../utils/api-client";
import { loadProgress, markScenarioComplete } from "../utils/progress";
import { ScenarioCard } from "../components/ScenarioCard";
import { PromptEditor } from "../components/PromptEditor";
import { ResponseDisplay } from "../components/ResponseDisplay";
import { FeedbackDisplay } from "../components/FeedbackDisplay";
import { SolutionModal } from "../components/SolutionModal";
import type { GradeFeedback } from "../types/scenario";
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
  const [feedback, setFeedback] = useState<GradeFeedback | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
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

  async function handleGetFeedback() {
    setFeedbackLoading(true);
    setError("");

    try {
      const result = await gradePromptApi(userPrompt, selectedScenario.task, claudeResponse);
      setFeedback(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get feedback");
    } finally {
      setFeedbackLoading(false);
    }
  }

  function handleContinue() {
    markScenarioComplete(selectedScenario.id, feedback?.isEffective ? 100 : 50);
    setCompletedIds((prev) => new Set([...prev, selectedScenario.id]));

    const nextIdx = scenarios.findIndex((s) => s.id === selectedScenario.id) + 1;
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
    setFeedback(null);
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

          {hasSubmitted && !feedback && (
            <button
              className="btn-feedback"
              onClick={handleGetFeedback}
              disabled={feedbackLoading}
            >
              {feedbackLoading ? "Analyzing..." : "Get Feedback"}
            </button>
          )}

          {feedback && (
            <>
              <FeedbackDisplay feedback={feedback} />
              <button
                className="btn-solution"
                onClick={() => setShowSolution(true)}
              >
                See Expert Solution
              </button>
              <button className="btn-primary" onClick={handleContinue}>
                Continue to Next Scenario
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
```

**Step 3: Add `.btn-feedback` style to `src/pages/Arena.css`**

Find the `.btn-solution` rule in `Arena.css` and add alongside it:

```css
.btn-feedback {
  display: block;
  margin-top: var(--space-6);
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  background: var(--color-blue);
  color: var(--color-white);
  border: 2px solid var(--color-blue);
  padding: var(--space-3) var(--space-6);
  cursor: pointer;
}

.btn-feedback:hover:not(:disabled) {
  background: var(--color-black);
  border-color: var(--color-black);
}

.btn-feedback:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
```

**Step 4: Run full test suite**

```bash
npx vitest run
```

Expected: All tests pass. (The `RubricDisplay` component tests will fail — that's expected, they get removed in Task 6.)

**Step 5: Commit**

```bash
git add src/pages/Arena.tsx src/pages/Arena.css
git commit -m "feat: wire grading flow into Arena — Get Feedback button and FeedbackDisplay"
```

---

### Task 6: Remove `RubricDisplay` and update component tests

**Files:**
- Delete: `src/components/RubricDisplay.tsx`
- Delete: `src/components/RubricDisplay.css`
- Modify: `src/__tests__/components.test.tsx`

**Step 1: Delete RubricDisplay files**

```bash
rm /Users/t-rawww/promptarena/src/components/RubricDisplay.tsx
rm /Users/t-rawww/promptarena/src/components/RubricDisplay.css
```

**Step 2: Remove RubricDisplay tests from `components.test.tsx`**

Remove these lines entirely:
- The `import { RubricDisplay }` line at the top
- The entire `describe("RubricDisplay", ...)` block (lines 116–148)

The remaining test file will import: `ScenarioCard`, `PromptEditor`, `ResponseDisplay`, `FeedbackDisplay`, `SolutionModal`.

**Step 3: Run full test suite**

```bash
npx vitest run
```

Expected: All tests pass. No references to RubricDisplay remain.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: remove RubricDisplay — replaced by LLM-powered FeedbackDisplay"
```

---

### Task 7: Deploy to Vercel and verify end-to-end

**Step 1: Build locally to catch any TypeScript errors**

```bash
cd /Users/t-rawww/promptarena && npm run build
```

Expected: Build succeeds with no errors.

**Step 2: Deploy**

```bash
vercel --prod
```

**Step 3: Manual verification**

1. Open the deployed URL
2. Select a scenario
3. Write a minimal prompt (e.g., just "summarize this") — submit
4. Verify Claude's response appears
5. Click "Get Feedback"
6. Verify feedback renders with Objective section, Strengths, Areas to Improve, and Improved Prompt
7. Click "Copy" on the rewritten prompt — verify it copies
8. Click "Continue to Next Scenario" — verify scenario advances and state resets
9. Write a high-quality prompt (use the expert prompt from the scenario) — submit
10. Click "Get Feedback" — verify `isEffective: true` feedback (no gaps, no rewrite, effective message shown)

**Step 4: Commit any final fixes, then done**
