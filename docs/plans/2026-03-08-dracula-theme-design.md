# Dracula Theme Design

## Overview

Retheme PromptArena with the Dracula color palette as a permanent dark mode. No toggle — the app is always dark.

## Approach

Remap all CSS custom properties in `globals.css` to Dracula equivalents, then audit and fix any hardcoded hex values in component CSS files that the variable remap won't catch.

Variable names stay the same (e.g. `--color-black` remains `--color-black` even though its value becomes a light foreground color). This is semantically misleading but functionally correct — all components reference variables, not raw hex, so the visual result is correct throughout.

## Color Mapping

| Token | Current | Dracula |
|---|---|---|
| `--color-white` | `#ffffff` | `#282a36` (background) |
| `--color-black` | `#000000` | `#f8f8f2` (foreground) |
| `--color-blue` | `#2563eb` | `#bd93f9` (purple) |
| `--color-blue-dark` | `#1d4ed8` | `#a87ce8` (purple hover) |
| `--color-red` | `#dc2626` | `#ff5555` |
| `--color-gray-light` | `#f9fafb` | `#21222c` (darker panel) |
| `--color-gray-lighter` | `#f3f4f6` | `#1e1f29` (darkest surface) |
| `--color-gray` | `#6b7280` | `#6272a4` (comment) |
| `--color-gray-border` | `#d1d5db` | `#44475a` (current line) |
| `--color-amber` | `#92400e` | `#ffb86c` (orange) |
| `--color-green` | `#16a34a` | `#50fa7b` |
| `--color-green-dark` | `#166534` | `#50fa7b` |
| `--color-green-bg` | `#f0fdf4` | `#1a3a28` (dark green tint) |

### Depth Layering

Content area (`#282a36`) → Sidebar (`#21222c`) → Task blocks / code (`#1e1f29`)

Each surface level is slightly darker than the one above it, preserving the visual hierarchy from the original light theme.

## Hardcoded Color Fixes

Known: `FeedbackDisplay.css` has `#fff5f5` (fail background) → replace with `#2d1117`.

Audit required: scan all CSS files for hardcoded hex values not covered by the variable remap.

## Files Changed

| File | Change |
|---|---|
| `src/styles/globals.css` | Remap all 13 color tokens |
| `src/components/FeedbackDisplay.css` | Fix `#fff5f5` → `#2d1117` |
| Other CSS files | Fix any hardcoded hex found in audit |
