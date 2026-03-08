# Production Readiness Design

## Overview

Address all remaining gaps before sharing PromptArena publicly: rate limiting, input validation, expanded scenario curriculum, UX polish, and a GitHub README.

---

## 1. Rate Limiting

**Approach:** In-memory sliding window, shared utility applied to both API handlers.

- 5 requests per IP per 60-second window
- Shared utility: `api/_rateLimit.ts`
- Applied to both `submit-prompt.ts` and `grade-prompt.ts`
- Returns 429 with message: `"Too many requests. Please wait a moment and try again."`
- IP extracted from `req.headers['x-forwarded-for']` (Vercel sets this), fallback to `"unknown"`

**Why in-memory:** Audience is small (personal use + shared links). No external KV store needed.

---

## 2. Input Length Caps

- `userPrompt`: max 4000 characters
- `claudeResponse`: max 8000 characters
- Validated server-side in both handlers before API call
- Returns 400 with clear message: `"Prompt exceeds 4000 character limit."` / `"Response exceeds 8000 character limit."`
- No client-side enforcement (server is the source of truth)

---

## 3. 15-Scenario Curriculum

Full arc from zero-shot basics to advanced prompting techniques.

### Beginner (1–5)
1. **Extract action items** ✅ (existing)
2. **Rewrite email for tone** — rewrite a draft email to be professional and concise
3. **Classify customer feedback** — label feedback as positive/negative/neutral with reasoning
4. **Handle ambiguity** — ask clarifying questions before proceeding with an underspecified task
5. **XML tags for structured input** — use XML tags to separate instructions from content

### Intermediate (6–10)
6. **Competitive strategy** ✅ (existing)
7. **Constrained summarization** — summarize under a hard word limit
8. **Chain-of-thought reasoning** — solve a logic problem step by step
9. **Few-shot prompting** — use examples to establish a consistent output pattern
10. **Conditional instructions** — handle branching logic based on input type

### Advanced (11–15)
11. **PRD generation** ✅ (existing)
12. **Code review & explanation** — review code for bugs and explain each issue
13. **Self-verification** — generate output then verify it against stated requirements
14. **Meta-prompting** — improve a weak prompt to make it more effective
15. **Task decomposition** — break a complex goal into ordered subtasks

All scenarios follow the existing Scenario type: `{ id, title, difficulty, description, task, expertSolution }`.

---

## 4. UX Fixes

### a) Retry on Failed Feedback
- Add `feedbackError: string | null` state to Arena
- On `handleGetFeedback` failure: set `feedbackError` with the error message
- Render inline error + "Try Again" button below the response (where "Get Feedback" was)
- On retry click: clear error, re-call `handleGetFeedback`

### b) Mobile Layout (768px)
- Sidebar becomes a horizontal scroll row of compact cards (~100px wide, title only)
- Content area goes full width
- Textarea `min-height` reduces to 120px
- Matches existing mobile spec in `promptarena-design-system.md`
- Implemented via CSS media query in `Arena.css`

### c) Last Scenario Completion Message
- Add `allComplete: boolean` state to Arena
- After last scenario's "Continue" click: set `allComplete = true`
- Render completion banner: `"You've completed all scenarios. Great work."` + "Start Over" button
- "Start Over": resets to scenario 1, clears progress (calls `clearProgress()`), resets `allComplete`

---

## 5. README

File: `README.md` at project root.

Sections:
- Project name + one-line description
- Screenshot placeholder
- What it is (2-3 sentences on the learning flow)
- Scenario list by tier (Beginner / Intermediate / Advanced)
- Tech stack
- Local development instructions
- Deploy instructions (Vercel + env var)
- MIT license

---

## Files Changed

| File | Action |
|------|--------|
| `api/_rateLimit.ts` | Create — sliding window utility |
| `api/submit-prompt.ts` | Modify — add rate limiting + input caps |
| `api/grade-prompt.ts` | Modify — add rate limiting + input caps |
| `src/data/scenarios.ts` | Modify — expand from 3 to 15 scenarios |
| `src/pages/Arena.tsx` | Modify — feedbackError state, allComplete state |
| `src/pages/Arena.css` | Modify — mobile breakpoint at 768px |
| `README.md` | Create |
| `src/__tests__/api-client.test.ts` | No change needed |
| `src/__tests__/components.test.tsx` | No change needed |
