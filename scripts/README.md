# Scripts

Scripts for parallel agent orchestration and automation.

## Agent Lifecycle Scripts

| Script | Usage | Purpose |
|--------|-------|---------|
| `launch-agent.sh` | `<worktree-dir> <prompt>` | Base: permissions + hooks, pane split, Claude launch, prompt send |
| `spawn-worker.sh` | `<branch> <task-keyword> [step-scope]` | Creates worktree + sets implement role, then delegates |
| `spawn-reviewer.sh` | `<pr-number>` | Resolves PR branch + sets review role, then delegates |

## Monitoring & Control Scripts

| Script | Usage | Purpose |
|--------|-------|---------|
| `monitor-agents.sh` | `[--watch] [--json]` | List all agent states (idle/working/trust) |
| `check-agent-state.sh` | `<pane-id>` | Check single agent's state |
| `check-task-completion.sh` | `<branch> <task-type> [pr]` | Check PR/CI/review status via GitHub API |
| `send-to-agent.sh` | `<pane-id> <prompt>` | Send prompt to idle agent |

## Helper Scripts

| Script | Usage | Purpose |
|--------|-------|---------|
| `set-role.sh` | `<worktree-dir> <role>` | Set role marker in CLAUDE.md |
| `apply-layout.sh` | (no args) | Apply tiled layout to tmux panes |
| `start-review.sh` | `<pr-number>` | Start review (alias for spawn-reviewer.sh) |

## State Tracking

Agent states are tracked via hooks in `/tmp/claude-agent-states/<pane-id>`:
- `starting` - Agent is starting up
- `working` - Agent is executing a task
- `idle` - Agent is waiting for input
- `permission` - Permission prompt displayed
- `trust` - Trust folder prompt displayed

Use `monitor-agents.sh --watch` to continuously monitor all agents.

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
./scripts/spawn-reviewer.sh 123
```

### Monitor all agents
```bash
./scripts/monitor-agents.sh --watch
```

### Send instruction to idle agent
```bash
./scripts/send-to-agent.sh %42 "Fix the failing test"
```

### Check PR completion status
```bash
./scripts/check-task-completion.sh feature/branch pr-creation
```
