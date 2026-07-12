# Claude Code Context

## Project Overview

reference-manager: CLI tool for managing academic references in CSL-JSON format.

## Work Guidelines

1. **Starting Point**: Always begin work from `spec/_index.md` to understand current tasks and priorities.

2. **Commit Frequently**: Make commits at small, logical units of work. Do not accumulate large changes.

3. **Context Management**: If compact (context summarization) appears likely before completing the current task, report this to the user and pause work to avoid losing important context.

## Agent Role

When working in a worktree, a role file is specified at the bottom of this file (e.g. `<!-- role: implement -->`).
Read the corresponding role file from `spec/roles/{role}.md` and follow its instructions.

Available roles:
- `implement` — TDD implementation worker (`spec/roles/implement.md`)
- `review` — PR reviewer (`spec/roles/review.md`)

## Agent Orchestration (herdr)

Worker/reviewer agents run in [herdr](https://herdr.dev) panes, one workspace per worktree. Worktrees live under `~/.herdr/worktrees/reference-manager/`. Agents are launched with `--permission-mode auto`.

Always use the wrapper scripts instead of raw herdr commands where one exists:

```bash
./scripts/spawn-worker.sh <branch> <task-keyword>   # worktree + workspace + claude
./scripts/spawn-reviewer.sh --pr <n>                # reviewer agent for a PR
./scripts/send-to-agent.sh <pane|name> "<prompt>"   # message a running agent
./scripts/check-agent-state.sh <pane|name>          # idle|working|permission|starting
./scripts/kill-agent.sh <pane|name>                 # stop agent, close pane
./scripts/monitor-agents.sh                         # list this repo's agents
```

Useful raw commands: `herdr agent read <pane> --lines 20` (view output), `herdr wait agent-status <pane> --status done --timeout <ms>` (block until task completion), `herdr pane send-keys <pane> Enter` (accept a dialog).

Notes:
- herdr CLI exits 0 even on failure; errors come back as `{"error": ...}` JSON. Check the payload.
- After sending a prompt, wait for `working` first, then `done`. Waiting for `done` right away can return immediately because the previous task's `done` state persists until the new task starts.
- Startup dialogs (MCP confirmation etc.) can be reported as `idle`. Never treat `idle` alone as task completion; verify with `herdr agent read` or `gh`.
- `herdr pane run` submits text + Enter atomically — no send-keys races, no sleep needed.

## Quick Reference

| Task | Reference |
|------|-----------|
| Development workflow | `spec/meta/development-process.md` |
| TDD process | `spec/guidelines/testing.md` |
| Spec directory guide | `spec/_index.md` |
| Current tasks | `spec/tasks/ROADMAP.md` |

## Notes

- Pre-release phase: breaking changes acceptable
- All specs written in English to minimize token usage
- Refer to relevant spec files when in doubt
- Read `package.json` as needed to check test commands, build scripts, CLI entry points, etc.

<!-- role: implement -->
