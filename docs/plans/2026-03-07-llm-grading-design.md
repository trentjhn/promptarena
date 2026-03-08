# LLM Grading Feature Design

## Overview

Replace the self-grading `RubricDisplay` component with automated LLM feedback that evaluates the user's prompt against both prompt engineering best practices and the scenario's objective. The goal is to build prompting intuition through structured, expert feedback rather than subjective self-assessment.

## User Flow

1. User writes a prompt and submits it
2. Claude's response is shown (existing behavior)
3. "Get Feedback" button appears below the response
4. User clicks → grading API call fires → `FeedbackDisplay` renders
5. "See Expert Solution" button remains below feedback

## Architecture

### New Serverless Function: `api/grade-prompt.ts`

**Input:**
```json
{
  "userPrompt": "...",
  "scenarioTask": "...",
  "claudeResponse": "..."
}
```

**Output:**
```json
{
  "objectiveMet": true,
  "objectiveFeedback": "Claude's response included all required competitor metrics.",
  "strengths": ["Clear output format specified", "Provided context about the company"],
  "gaps": ["No persona assigned", "Missing constraint on response length"],
  "rewrittenPrompt": "You are a senior market analyst...",
  "isEffective": false
}
```

- Uses `claude-haiku-4-5-20251001` (same model as submit-prompt)
- System prompt instructs Haiku to return raw JSON (no markdown fences)
- Follows same `API_ERRORS` error dispatch pattern as `submit-prompt.ts`
- `isEffective: true` requires `objectiveMet: true` AND no significant gaps

### New API Client Helper: `gradePromptApi()`

Added to `src/utils/api-client.ts`. Same fetch/error pattern as `submitPromptToApi`.

## Grading System Prompt Dimensions

### Technique (prompt engineering best practices)
1. **Persona** — Did the user assign a role to Claude?
2. **Clarity & Specificity** — Is the task unambiguous?
3. **Output Format** — Did they specify structure, length, or format?
4. **Examples** — Did they include few-shot examples where helpful?
5. **Context** — Did they provide enough background?
6. **Constraints** — Did they define what NOT to do where relevant?

### Objective (scenario-specific)
- Does the Claude response actually accomplish what the scenario required?
- Evaluated separately from technique — a polished prompt that missed the point still fails

## Component Design

### `FeedbackDisplay` (new, replaces `RubricDisplay`)

Four distinct sections:

1. **Objective Check** — Pass/Fail badge + one-sentence explanation
2. **Strengths** — what worked in the prompt (technique)
3. **Gaps** — what was missing, each tied to a specific principle
4. **Rewritten Prompt** — improved version in a code block with copy button

When `isEffective: true`: sections 3 and 4 are replaced with a single acknowledgment message.

Styling: IBM Plex Mono for rewritten prompt block, existing `--color-*` tokens throughout.

### `Arena.tsx` changes

- Add `feedbackLoading: boolean` and `feedback: GradeFeedback | null` state
- "Get Feedback" button renders after `claudeResponse` is shown
- `RubricDisplay` removed entirely
- `handleGradeSubmit` driven by LLM result, not user self-report

## Files Changed

| File | Action |
|------|--------|
| `api/grade-prompt.ts` | Create |
| `src/utils/api-client.ts` | Add `gradePromptApi()` |
| `src/types/scenario.ts` | Add `GradeFeedback` type; remove `RubricCriterion` if unused |
| `src/components/FeedbackDisplay.tsx` | Create |
| `src/components/FeedbackDisplay.css` | Create |
| `src/pages/Arena.tsx` | Swap rubric for feedback, add state |
| `src/components/RubricDisplay.tsx` | Delete |
| `src/components/RubricDisplay.css` | Delete |
| `src/__tests__/api-client.test.ts` | Add gradePromptApi tests |
| `src/__tests__/components.test.tsx` | Swap RubricDisplay smoke test for FeedbackDisplay |
