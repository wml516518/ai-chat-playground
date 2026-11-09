# Task 1 Report: Localize Presets and Centralize Public Copy

## Implementation

- Added `frontend/src/copy.ts` with the exact Chinese `uiCopy` contract from the task brief.
- Added `toPublicChatError(error: unknown)` to map abort, network, interrupted-stream, and generic failures to public Chinese messages.
- Replaced preset names and system prompts with the exact Chinese values from the brief.
- Preserved all existing preset IDs: `general`, `code-reviewer`, `resume-optimizer`, and `product-brainstormer`.
- Added focused tests covering stable IDs, Chinese labels/prompts, and public error mapping.

## Files Changed

- Created `frontend/src/copy.ts`.
- Modified `frontend/src/presets.ts`.
- Created `frontend/src/presets.test.ts`.

## TDD Evidence

### RED

After adding `frontend/src/presets.test.ts` and before adding production copy, the focused suite failed during import with:

`Failed to resolve import "./copy" from "src/presets.test.ts".`

The repository Vite config also attempted to write temporary files inside the managed worktree and reported `EPERM`; the test was rerun with an equivalent temporary config using an external cache directory so the expected missing-module failure was observable.

### GREEN

After implementing `copy.ts` and updating `presets.ts`, the focused suite passed:

`Test Files 1 passed (1)`

`Tests 2 passed (2)`

## Test Commands and Results

- `npm test -- --run src/presets.test.ts` — blocked before collection by Vite `EPERM` while writing a temporary config file in the managed worktree.
- `./node_modules/.bin/vitest run --config /private/tmp/ai-chat-playground-vitest.config.ts src/presets.test.ts` — passed, 1 file / 2 tests.
- `./node_modules/.bin/vitest run --config /private/tmp/ai-chat-playground-vitest.config.ts` — passed, 2 files / 4 tests.
- `npm run build` — blocked when TypeScript attempted to overwrite the existing managed-worktree `frontend/tsconfig.tsbuildinfo` (`EPERM`).
- `./node_modules/.bin/tsc --noEmit -p tsconfig.json` — passed.
- `./node_modules/.bin/vite build --config /private/tmp/ai-chat-playground-vitest.config.ts --outDir /private/tmp/ai-chat-playground-dist --emptyOutDir` — passed; production bundle generated successfully.

## Self-Review

- Confirmed preset IDs are unchanged.
- Confirmed all required public labels, messages, and prompts match the task brief exactly.
- Confirmed error mapping does not expose private backend or English error details.
- Ran `git diff --check` successfully.

## Concerns

The managed worktree denies writes to Vite/TypeScript generated cache files, so the package-script test and build commands cannot complete using their default in-tree cache/output paths. Equivalent test, typecheck, and production-build validations pass with external temporary paths. No product or API behavior concerns were found.
