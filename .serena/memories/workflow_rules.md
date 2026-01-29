# Workflow Rules

## Commands
- **Always use `npm run` scripts** instead of direct tool invocations (e.g., `npx tsc`, `npx vitest`).
- Use `npm test -- <pattern>` to run specific test files.
- See `suggested_commands` memory for the full list.

## Worktree
- When working in a git worktree, always `cd` into the worktree directory first, then use `npm run` scripts.
