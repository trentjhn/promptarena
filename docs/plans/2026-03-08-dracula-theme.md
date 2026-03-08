# Dracula Theme Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Retheme PromptArena with the Dracula color palette as a permanent dark mode.

**Architecture:** Remap all CSS custom property values in `globals.css` to their Dracula equivalents, then fix two hardcoded color values in component CSS files that won't be covered by the variable remap.

**Tech Stack:** CSS custom properties, no JavaScript changes, no new dependencies.

---

## Background

All colors in the app flow through CSS custom properties defined in `src/styles/globals.css`. Component files reference these via `var(--color-*)`. Remapping the token values in one place changes the entire app.

Two component files have hardcoded values that bypass the token system and must be fixed separately:
- `src/components/FeedbackDisplay.css:27` — `#fff5f5` (fail/red background tint)
- `src/components/PromptEditor.css:35` — `rgba(37, 99, 235, 0.1)` (focus ring — hardcoded copy of old `--color-blue`)

No TypeScript or test changes required. CSS changes don't affect Vitest tests — run `npm test` only to verify no accidental file corruption.

---

### Task 1: Remap Color Tokens in `globals.css`

**Files:**
- Modify: `src/styles/globals.css` (lines 5–17, the `:root` color block)

**Step 1: Read the file**

Read `src/styles/globals.css` to see current state before editing.

**Step 2: Replace the color token block**

In `src/styles/globals.css`, replace the entire color section inside `:root` (lines 5–17) with:

```css
  /* Colors */
  --color-black: #f8f8f2;
  --color-white: #282a36;
  --color-blue: #bd93f9;
  --color-blue-dark: #a87ce8;
  --color-red: #ff5555;
  --color-gray-light: #21222c;
  --color-gray-lighter: #1e1f29;
  --color-gray: #6272a4;
  --color-gray-border: #44475a;
  --color-amber: #ffb86c;
  --color-green: #50fa7b;
  --color-green-dark: #50fa7b;
  --color-green-bg: #1a3a28;
```

Everything else in the file (typography, spacing, body styles, animations) stays unchanged.

**Step 3: Run tests**

```bash
npm test
```

Expected: 33/33 pass (CSS changes don't affect Vitest tests — this just confirms no accidental corruption).

**Step 4: Check TypeScript**

```bash
npx tsc --noEmit
```

Expected: zero errors.

**Step 5: Commit**

```bash
git add src/styles/globals.css
git commit -m "feat: remap color tokens to Dracula palette"
```

---

### Task 2: Fix Hardcoded Colors in Component Files

**Files:**
- Modify: `src/components/FeedbackDisplay.css:27`
- Modify: `src/components/PromptEditor.css:35`

**Step 1: Read both files**

Read `src/components/FeedbackDisplay.css` and `src/components/PromptEditor.css`.

**Step 2: Fix `FeedbackDisplay.css`**

Find line 27 (inside the `.feedback-objective--fail` or similar rule) — it has:
```css
  background: #fff5f5;
```

Change to:
```css
  background: #2d1117;
```

This is the dark red tint used as the "fail" objective background. `#2d1117` is a deep Dracula-compatible dark red.

**Step 3: Fix `PromptEditor.css`**

Find line 35 (inside `.prompt-editor__textarea:focus`) — it has:
```css
  box-shadow: inset 0 0 0 2px rgba(37, 99, 235, 0.1);
```

Change to:
```css
  box-shadow: inset 0 0 0 2px rgba(189, 147, 249, 0.2);
```

`rgb(189, 147, 249)` is the decimal representation of `#bd93f9` (the new `--color-blue` / Dracula purple). Opacity bumped from 0.1 to 0.2 since the purple is less saturated than the original blue and needs slightly more presence.

**Step 4: Run tests**

```bash
npm test
```

Expected: 33/33 pass.

**Step 5: Commit**

```bash
git add src/components/FeedbackDisplay.css src/components/PromptEditor.css
git commit -m "fix: update hardcoded colors for Dracula theme"
```
