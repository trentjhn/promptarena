# Production Readiness Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add rate limiting, input validation, a 15-scenario curriculum, UX polish, and a README to make PromptArena shareable.

**Architecture:** Rate limiting uses an in-memory sliding window utility shared by both Vercel serverless handlers. Scenarios are static data in `src/data/scenarios.ts`. UX changes are confined to `src/pages/Arena.tsx` and `src/pages/Arena.css`. No new dependencies required.

**Tech Stack:** React 18, TypeScript, Vite, Vitest + @testing-library/react, Vercel Serverless Functions, @anthropic-ai/sdk, custom CSS

---

## Background (read before starting)

PromptArena is a prompt engineering learning app. The user writes prompts, Claude responds, and an LLM grader evaluates the prompt quality.

Key files:
- `api/submit-prompt.ts` — Vercel serverless handler: receives `userPrompt` + `scenarioTask`, calls Claude, returns response
- `api/grade-prompt.ts` — Vercel serverless handler: receives `userPrompt` + `scenarioTask` + `claudeResponse`, calls Claude to grade the prompt
- `src/data/scenarios.ts` — Static array of 3 scenarios (expanding to 15)
- `src/types/scenario.ts` — TypeScript interfaces: `Scenario`, `RubricCriterion` (unused), `GradeFeedback`
- `src/pages/Arena.tsx` — Main page component, all state management
- `src/pages/Arena.css` — Arena layout styles (already has 768px breakpoint)
- `src/components/PromptEditor.css` — Textarea has `min-height: 200px`, no mobile override yet
- `src/utils/progress.ts` — localStorage utilities: `loadProgress`, `saveProgress`, `markScenarioComplete`, `isScenarioCompleted`. No `clearProgress` yet.
- `src/__tests__/api-client.test.ts` — 9 tests for API client functions
- `src/__tests__/components.test.tsx` — 13 smoke tests for components

Run tests: `npm test`
Check TypeScript: `npx tsc --noEmit`

---

### Task 1: Rate Limiting Utility

**Files:**
- Create: `api/_rateLimit.ts`
- Create: `src/__tests__/rate-limit.test.ts`

**Step 1: Write the failing tests**

```typescript
// src/__tests__/rate-limit.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { checkRateLimit } from "../../api/_rateLimit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests under the limit", () => {
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit("1.2.3.4")).toBe(true);
    }
  });

  it("rejects the 6th request from the same IP", () => {
    for (let i = 0; i < 5; i++) checkRateLimit("10.0.0.1");
    expect(checkRateLimit("10.0.0.1")).toBe(false);
  });

  it("allows requests again after the window expires", () => {
    for (let i = 0; i < 5; i++) checkRateLimit("5.5.5.5");
    vi.advanceTimersByTime(61_000);
    expect(checkRateLimit("5.5.5.5")).toBe(true);
  });

  it("does not share limits between different IPs", () => {
    for (let i = 0; i < 5; i++) checkRateLimit("1.1.1.1");
    expect(checkRateLimit("2.2.2.2")).toBe(true);
  });
});
```

**Step 2: Run to verify they fail**

```bash
npm test src/__tests__/rate-limit.test.ts
```

Expected: FAIL — `checkRateLimit` not found.

**Step 3: Implement `api/_rateLimit.ts`**

```typescript
// api/_rateLimit.ts
const windows = new Map<string, number[]>();

export function checkRateLimit(
  ip: string,
  limit = 5,
  windowMs = 60_000
): boolean {
  const now = Date.now();
  const timestamps = (windows.get(ip) ?? []).filter((t) => now - t < windowMs);
  if (timestamps.length >= limit) return false;
  timestamps.push(now);
  windows.set(ip, timestamps);
  return true;
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test src/__tests__/rate-limit.test.ts
```

Expected: 4/4 PASS.

**Step 5: Run all tests**

```bash
npm test
```

Expected: all pass (29 existing + 4 new = 33 total).

**Step 6: Commit**

```bash
git add api/_rateLimit.ts src/__tests__/rate-limit.test.ts
git commit -m "feat: add in-memory sliding window rate limiter"
```

---

### Task 2: Apply Rate Limiting + Input Cap to submit-prompt.ts

**Files:**
- Modify: `api/submit-prompt.ts`

No new test file needed — the rate limiter is tested in Task 1; the handler validation is a straight guard clause.

**Step 1: Read `api/submit-prompt.ts`**

Read the file to understand current structure before editing.

**Step 2: Add the import at the top of the file**

After the existing imports, add:
```typescript
import { checkRateLimit } from "./_rateLimit";
```

**Step 3: Add IP extraction + rate limit check + input cap**

Add this block immediately after the existing field validation block (the one that checks `!userPrompt?.trim() || !scenarioTask?.trim()`):

```typescript
  const rawIp = req.headers["x-forwarded-for"];
  const ip = Array.isArray(rawIp) ? rawIp[0] : (rawIp ?? "unknown");

  if (!checkRateLimit(ip)) {
    res.status(429).json({ error: "Too many requests. Please wait a moment and try again." });
    return;
  }

  if (userPrompt.trim().length > 4000) {
    res.status(400).json({ error: "Prompt exceeds 4000 character limit." });
    return;
  }
```

**Step 4: Check TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 5: Run all tests**

```bash
npm test
```

Expected: all pass.

**Step 6: Commit**

```bash
git add api/submit-prompt.ts
git commit -m "feat: add rate limiting and prompt length cap to submit-prompt"
```

---

### Task 3: Apply Rate Limiting + Input Caps to grade-prompt.ts

**Files:**
- Modify: `api/grade-prompt.ts`

Same pattern as Task 2. grade-prompt has an extra field (`claudeResponse`) so it gets an extra cap.

**Step 1: Read `api/grade-prompt.ts`**

Read the file.

**Step 2: Add the import**

After existing imports:
```typescript
import { checkRateLimit } from "./_rateLimit";
```

**Step 3: Add IP extraction + rate limit + input caps**

Immediately after the existing field validation block (the one checking `!userPrompt?.trim() || !scenarioTask?.trim() || !claudeResponse?.trim()`), add:

```typescript
  const rawIp = req.headers["x-forwarded-for"];
  const ip = Array.isArray(rawIp) ? rawIp[0] : (rawIp ?? "unknown");

  if (!checkRateLimit(ip)) {
    res.status(429).json({ error: "Too many requests. Please wait a moment and try again." });
    return;
  }

  if (userPrompt.trim().length > 4000) {
    res.status(400).json({ error: "Prompt exceeds 4000 character limit." });
    return;
  }

  if (claudeResponse.trim().length > 8000) {
    res.status(400).json({ error: "Response exceeds 8000 character limit." });
    return;
  }
```

**Step 4: Check TypeScript + run all tests**

```bash
npx tsc --noEmit && npm test
```

Expected: no errors, all pass.

**Step 5: Commit**

```bash
git add api/grade-prompt.ts
git commit -m "feat: add rate limiting and input caps to grade-prompt"
```

---

### Task 4: Expand Scenarios from 3 to 15

**Files:**
- Modify: `src/types/scenario.ts`
- Modify: `src/data/scenarios.ts`

**Context:** `rubric` is currently required on `Scenario` but `RubricDisplay` was deleted — nothing renders it. Making it optional lets new scenarios omit the unused field cleanly. The existing 3 scenarios keep their `rubric` arrays unchanged.

The existing scenarios must be renumbered to fit the new curriculum:
- `extract-points`: stays at `number: 1`
- `analyze-competitor`: changes from `number: 2` → `number: 6`
- `prd-generation`: changes from `number: 3` → `number: 11`

**Step 1: Make `rubric` optional in `src/types/scenario.ts`**

Change:
```typescript
  rubric: RubricCriterion[];
```
To:
```typescript
  rubric?: RubricCriterion[];
```

**Step 2: Check TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 3: Replace `src/data/scenarios.ts` with the complete 15-scenario array**

Write the complete file below — do not omit any field, do not abbreviate. Preserve existing `rubric` arrays on the 3 original scenarios.

```typescript
import type { Scenario } from "../types/scenario";

export const scenarios: Scenario[] = [
  // ─── BEGINNER ───────────────────────────────────────────────────────────────
  {
    id: "extract-points",
    number: 1,
    difficulty: "beginner",
    title: "Extract Key Points from Meeting Transcript",
    description:
      "You have a 30-minute meeting transcript. You need to extract the top 5 action items and who owns them.",
    task: "Write a prompt that extracts action items from the following meeting transcript:\n\n[Meeting excerpt will be provided in the app]",
    rubric: [
      {
        criterion: "Instruction Clarity",
        description: "Does the prompt clearly state what to extract?",
        points: 25,
      },
      {
        criterion: "Format Specification",
        description: "Does it specify the output format (e.g., bullet list, table)?",
        points: 25,
      },
      {
        criterion: "Constraint Definition",
        description: "Does it include constraints (e.g., max 5 items, must include owner)?",
        points: 25,
      },
      {
        criterion: "Actual Output Quality",
        description: "Does Claude's response match what you expected structurally?",
        points: 25,
      },
    ],
    expertPrompt: `Extract the top 5 action items from this meeting transcript.

For each item, provide:
- Action (what needs to be done)
- Owner (who is responsible)
- Due date (if mentioned)

Format as a bullet list. If due date is not mentioned, state "TBD".`,
    hints: [
      "Tell Claude exactly how many items you want",
      "Specify who should be responsible for each",
      'Use "Format as..." to request a specific structure',
    ],
  },
  {
    id: "email-tone",
    number: 2,
    difficulty: "beginner",
    title: "Rewrite Email for Tone",
    description:
      "You have a hastily written email that sounds passive-aggressive. You need it rewritten to be professional, direct, and constructive.",
    task: "Write a prompt that rewrites a draft email to sound professional and concise. Include a sample draft email in your prompt for Claude to work with.",
    expertPrompt: `You are a professional business communication editor.

Take the following draft email and rewrite it to be:
- Professional in tone (no passive-aggression, no informality)
- Concise (remove redundancies, aim for 30% shorter)
- Direct (lead with the main point)

Preserve all key information and action items. Output only the rewritten email — do not explain your changes.

Draft email:
[paste your draft email here]`,
    hints: [
      "Assign Claude a specific editing persona",
      "List the exact tone qualities you want (professional, direct, concise)",
      "Constrain the output — ask for the rewritten email only, no commentary",
    ],
  },
  {
    id: "classify-feedback",
    number: 3,
    difficulty: "beginner",
    title: "Classify Customer Feedback",
    description:
      "You have a batch of customer support messages. You need each classified by sentiment and summarized by theme.",
    task: "Write a prompt that classifies customer feedback as Positive, Negative, or Neutral and identifies the primary theme of each entry. Include 3–5 sample feedback items in your prompt.",
    expertPrompt: `Classify each of the following customer feedback entries.

For each entry, provide:
- Sentiment: Positive | Negative | Neutral
- Primary theme: one short phrase (e.g., "slow response time", "easy onboarding")
- Confidence: High | Medium | Low

Format as a table with columns: # | Sentiment | Theme | Confidence

Feedback entries:
[paste your feedback entries here]`,
    hints: [
      "Define the exact categories upfront — don't leave them implicit",
      "Specify a consistent output format (a table works well here)",
      "Ask for a confidence rating to handle ambiguous cases",
    ],
  },
  {
    id: "handle-ambiguity",
    number: 4,
    difficulty: "beginner",
    title: "Handle Ambiguity — Ask Before Acting",
    description:
      "Claude tends to fill gaps with assumptions. This scenario teaches you to instruct Claude to identify ambiguity and ask clarifying questions before proceeding.",
    task: "Write a prompt for a vague, underspecified task that instructs Claude to identify what is unclear and ask targeted clarifying questions before doing any work.",
    expertPrompt: `Before you attempt this task, identify everything that is ambiguous or unclear about the request below.

List each ambiguity as a numbered question. Be specific — ask about the audience, format, scope, constraints, or any missing details.

Do not attempt the task until all your questions are listed.

Task: Create a report on our Q3 performance.`,
    hints: [
      "Explicitly tell Claude NOT to proceed until it lists its questions",
      "Give Claude a genuinely vague task so it has something to ask about",
      "Ask for numbered questions so the output is scannable",
    ],
  },
  {
    id: "xml-tags",
    number: 5,
    difficulty: "beginner",
    title: "Use XML Tags to Separate Content",
    description:
      "When you provide multiple pieces of content in a single prompt, Claude can mix them up. XML tags create clear boundaries between content blocks.",
    task: "Write a prompt that uses XML tags to clearly separate two different pieces of content you want Claude to analyze or compare.",
    expertPrompt: `Compare the two business proposals below and identify:
1. Their shared assumptions
2. Their key differences
3. Which you would recommend, and why

Base your analysis only on what is stated in the proposals. If something is not mentioned, note it as "Not specified."

<proposal_a>
[paste first proposal here]
</proposal_a>

<proposal_b>
[paste second proposal here]
</proposal_b>`,
    hints: [
      "Wrap each content block in an XML tag with a descriptive name",
      "Reference the tag names in your instructions (e.g., 'Based on <proposal_a>...')",
      "XML tags help most when comparing, contrasting, or processing multiple inputs",
    ],
  },

  // ─── INTERMEDIATE ────────────────────────────────────────────────────────────
  {
    id: "analyze-competitor",
    number: 6,
    difficulty: "intermediate",
    title: "Competitive Strategy Analysis",
    description:
      "Analyze a competitor's product positioning to identify strategic gaps.",
    task: "Write a prompt that analyzes a competitor's value propositions and identifies strategic vulnerabilities.",
    rubric: [
      {
        criterion: "Step-by-Step Process",
        description: "Does the prompt force reasoning before conclusions (using Level 4 structure)?",
        points: 30,
      },
      {
        criterion: "Constraint Boundaries",
        description: "Does it prevent hallucination (e.g., 'cite sources')?",
        points: 25,
      },
      {
        criterion: "Evidence-Driven",
        description: "Does it require reasoning to be backed by facts?",
        points: 25,
      },
      {
        criterion: "Output Actionability",
        description: "Can you actually use the output to make a business decision?",
        points: 20,
      },
    ],
    expertPrompt: `Act as a senior product strategist.

First, identify the top three value propositions claimed by the competitor.
Then, evaluate which are defensible vs. easily copied by competitors.
Only after both steps, recommend the strategic vulnerabilities they should address.

Do not make claims without evidence from their public materials.
If something is unclear, state "Insufficient data: [claim]" instead of guessing.

Format as:
1. Core Value Props (bullet list)
2. Defensibility Analysis (table: Prop | Defensible? | Why)
3. Strategic Gaps (ranked by exploitability)`,
    hints: [
      "Separate instruction from data using XML tags",
      'Force step-by-step thinking with "First... Then... Only after..."',
      "Tell Claude when to admit uncertainty instead of guessing",
    ],
  },
  {
    id: "constrained-summary",
    number: 7,
    difficulty: "intermediate",
    title: "Summarize Under a Hard Constraint",
    description:
      "Unconstrained summaries balloon in length. This scenario teaches you to enforce strict output limits and prioritization criteria.",
    task: "Write a prompt that summarizes a piece of text in 100 words or fewer, leading with the single most important insight. Include a sample text paragraph in your prompt.",
    expertPrompt: `Summarize the following text in 100 words or fewer.

Requirements:
- Lead with the single most important insight
- Preserve all key numbers or statistics
- Omit examples or background context if needed to meet the word limit
- End your summary with: (Word count: N)

Text:
[paste your text here]`,
    hints: [
      "State the word limit as an absolute constraint, not a guideline",
      "Tell Claude what to prioritize and what to cut first",
      "Ask Claude to include a word count so you can verify compliance",
    ],
  },
  {
    id: "chain-of-thought",
    number: 8,
    difficulty: "intermediate",
    title: "Chain-of-Thought Reasoning",
    description:
      "Claude often jumps straight to conclusions. Forcing step-by-step reasoning improves accuracy on complex decisions.",
    task: "Write a prompt that forces Claude to reason step by step through a multi-factor decision before stating its recommendation.",
    expertPrompt: `Think step by step.

Step 1: List the key factors relevant to this decision.
Step 2: For each factor, assess whether it supports or opposes the decision, and explain why.
Step 3: Weigh the factors against each other — which carry more importance and why?
Step 4: Only after completing the above steps, state your final recommendation and the primary reason behind it.

Do not jump to a recommendation before completing Steps 1–3.

Decision: Should a 10-person startup expand into the European market in the next 6 months?`,
    hints: [
      'Use numbered steps with "Only after..." to prevent premature conclusions',
      "Include an explicit prohibition on jumping ahead",
      "The more factors involved, the more chain-of-thought helps",
    ],
  },
  {
    id: "few-shot",
    number: 9,
    difficulty: "intermediate",
    title: "Few-Shot Prompting",
    description:
      "When you need consistent output format across many items, showing examples (few-shot) is more reliable than describing the format in words.",
    task: "Write a prompt that uses 2–3 examples to teach Claude a consistent output pattern, then applies that pattern to a new item.",
    expertPrompt: `Extract the product name and price from each input. Follow the format shown exactly.

Input: "The new AirPods Pro (2nd gen) are now $249 at Apple."
Output: Product: AirPods Pro 2nd gen | Price: $249

Input: "Samsung just dropped the Galaxy S24 to $799 this weekend only."
Output: Product: Galaxy S24 | Price: $799

Input: "Dyson V15 Detect vacuum — limited time offer at $649.99."
Output: Product: Dyson V15 Detect | Price: $649.99

Now extract from this input:
[paste your product text here]
Output:`,
    hints: [
      "Use 2–3 representative examples that cover the variation you expect",
      "Keep example format identical — Claude mirrors what it sees",
      "End with the real task using the same input/output structure",
    ],
  },
  {
    id: "conditional-instructions",
    number: 10,
    difficulty: "intermediate",
    title: "Conditional Instructions",
    description:
      "Real-world prompts often need to handle multiple input types differently. Explicit if/else logic in your prompt prevents Claude from guessing.",
    task: "Write a prompt with conditional logic that tells Claude how to respond differently based on whether the input is a complaint, a question, or a compliment.",
    expertPrompt: `You will receive a customer message. Respond according to its type:

If it is a COMPLAINT: Acknowledge the issue, apologize sincerely (one sentence), and describe one concrete next step.
If it is a QUESTION: Answer directly and concisely. If you don't know the answer, say so explicitly.
If it is a COMPLIMENT: Thank them warmly in one sentence. Do not elaborate or upsell.

If the message type is unclear, respond as if it is a question.

Customer message:
[paste message here]`,
    hints: [
      "Use explicit IF/THEN language, not vague descriptions",
      "Cover edge cases — what should Claude do if the type is ambiguous?",
      "Keep each conditional branch short and specific",
    ],
  },

  // ─── ADVANCED ────────────────────────────────────────────────────────────────
  {
    id: "prd-generation",
    number: 11,
    difficulty: "advanced",
    title: "Generate PRD from Product Requirements",
    description:
      "Convert raw product requirements into a structured PRD document.",
    task: "Write a prompt that transforms vague product requirements into a complete PRD with clear success metrics.",
    rubric: [
      {
        criterion: "Problem Definition",
        description: "Does the prompt capture the core problem being solved?",
        points: 25,
      },
      {
        criterion: "Success Metrics",
        description: "Are success metrics specific, measurable, and tied to business outcomes?",
        points: 25,
      },
      {
        criterion: "MVP Scoping",
        description: "Does it distinguish MVP from future roadmap features?",
        points: 25,
      },
      {
        criterion: "Completeness",
        description: "Does the output include all PRD sections (user stories, API)?",
        points: 25,
      },
    ],
    expertPrompt: `Act as a senior product manager reviewing a product brief.

Step 1: Extract the core problem statement. Reframe it if needed for clarity.
Step 2: Define 3-5 success metrics that are measurable and tied to business outcomes.
Step 3: Identify the MVP scope — what's the minimum that proves the concept?
Step 4: Generate user stories in the format "As a [user], I want [action] so that [benefit]"

Do not assume technical implementation details.
Focus on the "why" before the "how".

Format output as:
# [Product Name] PRD
## Problem Statement
## Success Metrics
## MVP Scope
## User Stories`,
    hints: [
      "Separate defining the problem from generating solutions",
      "Make success metrics SMART (Specific, Measurable, Achievable, Relevant, Time-bound)",
      "Force MVP thinking by asking 'What's the minimum?'",
    ],
  },
  {
    id: "code-review",
    number: 12,
    difficulty: "advanced",
    title: "Code Review and Plain-Language Explanation",
    description:
      "Getting Claude to review code is easy. Getting it to explain issues clearly for a junior developer — without jargon, with severity ratings — requires a well-structured prompt.",
    task: "Write a prompt that reviews a code snippet for bugs and explains each issue in plain language suitable for a junior developer. Include a code snippet in your prompt.",
    expertPrompt: `Act as a senior software engineer reviewing code for a junior developer on your team.

For each bug or issue you find:
1. Identify the line or section
2. Describe what is wrong in plain language (no jargon — assume the reader has 6 months of experience)
3. Rate severity: Critical | Major | Minor
4. Show the corrected version with a one-line explanation of why it's better

After the review, add a "Key Takeaways" section with the top 1–2 things the developer should study or practice.

Code to review:
\`\`\`
[paste your code here]
\`\`\``,
    hints: [
      "Specify the audience — 'junior developer' changes how Claude explains things",
      "Structure the output so each issue follows the same format",
      "Ask for a Key Takeaways section so feedback is educational, not just corrective",
    ],
  },
  {
    id: "self-verification",
    number: 13,
    difficulty: "advanced",
    title: "Self-Verification",
    description:
      "Claude can make confident errors. Teaching it to verify its own output against explicit criteria — before showing the result — catches many mistakes.",
    task: "Write a prompt that asks Claude to generate a response, verify it against your stated requirements, and revise if anything is missing — all in one turn. Output only the final version.",
    expertPrompt: `Generate a response to the task below.

Before outputting anything, verify your response against each requirement:
- [ ] The response is under 200 words
- [ ] It includes a specific, concrete example
- [ ] It avoids technical jargon
- [ ] It ends with a clear call to action

If any requirement is not met, revise the response until all are satisfied.

Output only the final, verified response. Do not show intermediate drafts or the verification process.

Task: Write a short pitch for a new productivity app aimed at freelancers.`,
    hints: [
      "List your requirements as an explicit checklist Claude must check off",
      "Instruct Claude to hide intermediate steps — output only the final version",
      "This pattern works best when you have 3+ concrete, measurable requirements",
    ],
  },
  {
    id: "meta-prompting",
    number: 14,
    difficulty: "advanced",
    title: "Meta-Prompting — Improve a Weak Prompt",
    description:
      "A key skill: using Claude to improve your own prompts. This requires writing a prompt that instructs Claude to act as a prompt engineer.",
    task: "Write a prompt that takes a weak, vague prompt as input and rewrites it to be specific, well-structured, and effective. Include the weak prompt you want Claude to improve.",
    expertPrompt: `Act as an expert prompt engineer.

You will be given a weak, vague prompt. Rewrite it to be:
- Specific: a clear task with no ambiguity
- Structured: includes a persona, task context, and desired output format
- Constrained: defines at least one thing Claude should avoid or limit

Output only the improved prompt — do not explain your changes or add commentary.

Weak prompt: "Tell me about marketing."`,
    hints: [
      "Give Claude the 'prompt engineer' persona explicitly",
      "Define what a good prompt looks like — specificity, structure, constraints",
      "Ask for output-only to get a clean, usable result",
    ],
  },
  {
    id: "task-decomposition",
    number: 15,
    difficulty: "advanced",
    title: "Task Decomposition",
    description:
      "Complex goals need to be broken into ordered, concrete steps. This scenario teaches you to prompt Claude to act as a project manager and produce an actionable plan.",
    task: "Write a prompt that breaks a complex, high-level goal into an ordered sequence of concrete subtasks, each completable in one day or less, with dependencies noted.",
    expertPrompt: `Act as a senior project manager.

Break down the following goal into a detailed, ordered action plan:
- Number each subtask (1, 2, 3...)
- Each subtask must be concrete and completable in one working day or less
- For each subtask, note dependencies using: "Requires: Step N" (omit if none)
- Flag any subtask that requires an external decision or approval with [DECISION]
- Do not include vague subtasks (e.g., "do research") — break those down further

Goal: Launch a new SaaS product from idea to first 10 paying customers.`,
    hints: [
      "Give Claude a project manager persona for structured, numbered output",
      "Constrain subtask size — 'one day or less' prevents vague mega-tasks",
      "Ask for dependency notation to surface sequencing requirements",
    ],
  },
];
```

**Step 4: Check TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 5: Run all tests**

```bash
npm test
```

Expected: all pass.

**Step 6: Commit**

```bash
git add src/types/scenario.ts src/data/scenarios.ts
git commit -m "feat: expand curriculum from 3 to 15 scenarios"
```

---

### Task 5: UX — Inline Feedback Error State with Retry

**Files:**
- Modify: `src/pages/Arena.tsx`
- Modify: `src/pages/Arena.css`

**Context:** Currently, if `gradePromptApi()` fails, the error is set in the global `error` state and shown above the response. A better UX is to show the feedback error inline — near the button that triggered it — with a "Try Again" label. This requires a dedicated `feedbackError` state.

**Step 1: Read `src/pages/Arena.tsx`**

Read the file before editing.

**Step 2: Add `feedbackError` state**

After the `feedbackLoading` state declaration, add:

```typescript
const [feedbackError, setFeedbackError] = useState<string | null>(null);
```

**Step 3: Update `handleGetFeedback`**

Replace the existing function:

```typescript
async function handleGetFeedback() {
  setFeedbackLoading(true);
  setFeedbackError(null);

  try {
    const result = await gradePromptApi(userPrompt, selectedScenario.task, claudeResponse);
    setFeedback(result);
  } catch (err) {
    setFeedbackError(err instanceof Error ? err.message : "Failed to get feedback");
  } finally {
    setFeedbackLoading(false);
  }
}
```

**Step 4: Reset `feedbackError` inside `selectScenario`**

Add `setFeedbackError(null);` alongside the other resets in the `selectScenario` function.

**Step 5: Update the feedback button JSX**

Replace:
```tsx
{hasSubmitted && !feedback && (
  <button
    className="btn-feedback"
    onClick={handleGetFeedback}
    disabled={feedbackLoading}
  >
    {feedbackLoading ? "Analyzing..." : "Get Feedback"}
  </button>
)}
```

With:
```tsx
{hasSubmitted && !feedback && (
  <div className="feedback-action">
    {feedbackError && (
      <div className="arena__error feedback-action__error">{feedbackError}</div>
    )}
    <button
      className="btn-feedback"
      onClick={handleGetFeedback}
      disabled={feedbackLoading}
    >
      {feedbackLoading ? "Analyzing..." : feedbackError ? "Try Again" : "Get Feedback"}
    </button>
  </div>
)}
```

**Step 6: Add CSS for `feedback-action`**

In `src/pages/Arena.css`, find the `.btn-feedback` rule. It has `margin-top: var(--space-6)`. Move that margin to the wrapper and remove it from the button.

Change `.btn-feedback`:
```css
.btn-feedback {
  display: block;
  /* remove margin-top from here — it moves to .feedback-action */
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
```

Add after the `.btn-feedback` block:
```css
.feedback-action {
  margin-top: var(--space-6);
}

.feedback-action__error {
  margin-top: 0;
  margin-bottom: var(--space-3);
}
```

**Step 7: Check TypeScript + run all tests**

```bash
npx tsc --noEmit && npm test
```

Expected: no errors, all pass.

**Step 8: Commit**

```bash
git add src/pages/Arena.tsx src/pages/Arena.css
git commit -m "feat: inline feedback error state with try again button"
```

---

### Task 6: UX — Last Scenario Completion Banner

**Files:**
- Modify: `src/utils/progress.ts` (add `clearProgress`)
- Modify: `src/pages/Arena.tsx`
- Modify: `src/pages/Arena.css`

**Step 1: Add `clearProgress` to `src/utils/progress.ts`**

Read the file first. `STORAGE_KEY` is private (not exported) — that's correct. Add this function at the end of the file:

```typescript
export function clearProgress(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error("progress: failed to clear localStorage:", err);
  }
}
```

**Step 2: Add `clearProgress` to the import in `Arena.tsx`**

Change:
```typescript
import { loadProgress, markScenarioComplete } from "../utils/progress";
```
To:
```typescript
import { loadProgress, markScenarioComplete, clearProgress } from "../utils/progress";
```

**Step 3: Compute `isLastScenario` as a derived value in Arena.tsx**

Add this after the state declarations, before the handlers:

```typescript
const isLastScenario =
  scenarios.findIndex((s) => s.id === selectedScenario.id) === scenarios.length - 1;
```

**Step 4: Add `handleStartOver` function**

After `handleContinue`, add:

```typescript
function handleStartOver() {
  clearProgress();
  setCompletedIds(new Set());
  selectScenario(scenarios[0].id);
}
```

**Step 5: Update the feedback JSX to show completion banner on last scenario**

Replace this block:
```tsx
{scenarios.findIndex((s) => s.id === selectedScenario.id) < scenarios.length - 1 && (
  <button className="btn-primary" onClick={handleContinue}>
    Continue to Next Scenario
  </button>
)}
```

With:
```tsx
{isLastScenario ? (
  <div className="arena__complete">
    <p className="arena__complete-message">
      You&apos;ve completed all scenarios. Great work.
    </p>
    <button className="btn-primary" onClick={handleStartOver}>
      Start Over
    </button>
  </div>
) : (
  <button className="btn-primary" onClick={handleContinue}>
    Continue to Next Scenario
  </button>
)}
```

**Step 6: Add CSS for `arena__complete`**

Append to `src/pages/Arena.css`:

```css
.arena__complete {
  border: 2px solid var(--color-black);
  padding: var(--space-8);
  margin-top: var(--space-6);
  text-align: center;
}

.arena__complete-message {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: var(--space-6);
}
```

**Step 7: Check TypeScript + run all tests**

```bash
npx tsc --noEmit && npm test
```

Expected: no errors, all pass.

**Step 8: Commit**

```bash
git add src/utils/progress.ts src/pages/Arena.tsx src/pages/Arena.css
git commit -m "feat: last scenario completion banner with start over"
```

---

### Task 7: Mobile — Reduce Textarea Min-Height

**Files:**
- Modify: `src/components/PromptEditor.css`

**Context:** `Arena.css` already has a 768px breakpoint that switches to single-column layout and horizontal sidebar scrolling. The textarea `.prompt-editor__textarea` has `min-height: 200px` but no mobile override — it should shrink to 120px on small screens.

**Step 1: Read `src/components/PromptEditor.css`**

Confirm the textarea has `min-height: 200px` and no mobile media query.

**Step 2: Add the mobile override**

Append to `src/components/PromptEditor.css`:

```css
@media (max-width: 768px) {
  .prompt-editor__textarea {
    min-height: 120px;
  }
}
```

**Step 3: Run all tests**

```bash
npm test
```

Expected: all pass (CSS changes don't break tests).

**Step 4: Commit**

```bash
git add src/components/PromptEditor.css
git commit -m "fix: reduce textarea min-height on mobile"
```

---

### Task 8: README

**Files:**
- Create: `README.md`

**Step 1: Write `README.md` at project root**

```markdown
# PromptArena

A prompt engineering practice arena powered by Claude. Write prompts, get real AI responses, and receive expert feedback on your technique.

## What It Is

PromptArena gives you 15 structured scenarios — from extracting action items to task decomposition — and teaches prompt engineering by doing. Write a prompt, see Claude's response, get AI-powered feedback on what worked and what to improve, then compare against an expert solution.

## Scenarios

**Beginner**
1. Extract Key Points from Meeting Transcript
2. Rewrite Email for Tone
3. Classify Customer Feedback
4. Handle Ambiguity — Ask Before Acting
5. Use XML Tags to Separate Content

**Intermediate**
6. Competitive Strategy Analysis
7. Summarize Under a Hard Constraint
8. Chain-of-Thought Reasoning
9. Few-Shot Prompting
10. Conditional Instructions

**Advanced**
11. Generate PRD from Product Requirements
12. Code Review and Plain-Language Explanation
13. Self-Verification
14. Meta-Prompting — Improve a Weak Prompt
15. Task Decomposition

## Tech Stack

- React 18 + TypeScript + Vite
- Vercel Serverless Functions
- Anthropic Claude (claude-haiku-4-5-20251001)
- Custom CSS — no UI library

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Add your Anthropic API key to `.env`:
   ```
   ANTHROPIC_API_KEY=your_key_here
   ```

3. Start the Vite dev server:
   ```bash
   npm run dev
   ```

4. In a separate terminal, start the Vercel dev server (required for API routes):
   ```bash
   npx vercel dev
   ```

   Use the Vercel dev URL (default `http://localhost:3000`) rather than the Vite port for full functionality including API routes.

## Deploy

Deploy to Vercel and set `ANTHROPIC_API_KEY` as an environment variable in your project settings.

## License

MIT
```

**Step 2: Run all tests**

```bash
npm test
```

Expected: all pass.

**Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add README"
```
