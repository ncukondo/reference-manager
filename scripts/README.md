# Scripts

Scripts for parallel agent orchestration and automation. Agents run in [herdr](https://herdr.dev) panes, one workspace per worktree. Worktrees live under `~/.herdr/worktrees/reference-manager/`.

## Agent Lifecycle Scripts

| Script | Usage | Purpose |
|--------|-------|---------|
| `launch-agent.sh` | `<worktree-dir> [prompt]` | Base: settings, herdr workspace, Claude launch (`--permission-mode auto`, prompt as argv) |
| `spawn-worker.sh` | `<branch> <task-keyword> [step-scope]` | Creates worktree + sets implement role, then delegates |
| `spawn-reviewer.sh` | `--pr <pr-number>` | Creates worktree + sets review role, then delegates |
| `spawn-agent.sh` | `<branch-or-pr> [options] [-- <prompt>]` | Generic agent (research, PR comments, custom tasks) |
| `start-review.sh` | `<pr-number>` | Thin wrapper around spawn-reviewer.sh |
| `kill-agent.sh` | `<pane\|name> [--keep-pane]` | Stop an agent, close its pane |

## Monitoring & Control Scripts

| Script | Usage | Purpose |
|--------|-------|---------|
| `monitor-agents.sh` | `[--watch] [--json] [--all]` | List this repo's agent states (idle/working/blocked) |
| `check-agent-state.sh` | `<pane\|name>` | Check single agent's state |
| `check-task-completion.sh` | `<branch> <task-type> [pr]` | Check PR/CI/review status via GitHub API |
| `send-to-agent.sh` | `<pane\|name> <prompt>` | Send prompt to idle agent |
| `orchestrate.sh` | `[--background] [--stop] [--status]` | Detect worker events, write event files, notify main agent |
| `merge-pr.sh` | `<pr-number> [options]` | Merge PR + cleanup workspace/worktree/branch |

## Helper Scripts

| Script | Usage | Purpose |
|--------|-------|---------|
| `herdr-lib.sh` | (sourced) | Shared helpers: worktree paths, agent lookup, status |
| `set-role.sh` | `<worktree-dir> <role>` | Set role marker in CLAUDE.md |

## State Tracking

Agent states come from herdr's agent detection (`herdr agent list` / `herdr agent get`):
- `working` - Agent is executing a task
- `idle` - Agent is waiting for input
- `done` - Agent finished a task and awaits input (reported as `idle` by check-agent-state.sh)
- `blocked` - Agent is stuck on a prompt/dialog (reported as `permission` by check-agent-state.sh)
- `unknown` - Agent detected but state not yet known (reported as `starting`)

Caveat: startup dialogs (MCP confirmation etc.) may be reported as `idle`. Never treat `idle` alone as task completion; verify with `herdr agent read <pane>` or GitHub state (`check-task-completion.sh`).

Use `monitor-agents.sh --watch` to continuously monitor, or `herdr wait agent-status <pane> --status idle --timeout <ms>` to block until a state change.

## Examples

### Start a worker for a task
```bash
./scripts/spawn-worker.sh feature/new-feature new-feature
```

### Start a worker with limited scope
```bash
./scripts/spawn-worker.sh feature/large-task large-task "Steps 1 and 2 only"
```

### Start a reviewer for a PR
```bash
./scripts/spawn-reviewer.sh --pr 123
```

### Monitor all agents
```bash
./scripts/monitor-agents.sh --watch
```

### Send instruction to idle agent
```bash
./scripts/send-to-agent.sh feat-new-feature "Fix the failing test"
```

### Check PR completion status
```bash
./scripts/check-task-completion.sh feature/branch pr-creation
```

### Cleanup after merge (merge-pr.sh does this automatically)
```bash
cd "$HOME/.herdr/worktrees/reference-manager/<branch>" && git checkout -- CLAUDE.md
git worktree remove "$HOME/.herdr/worktrees/reference-manager/<branch>"
git branch -d <branch>
```
