# Task: workmux Integration

## Purpose

Introduce workmux to enable parallel agent work with tmux-based visual monitoring.
An orchestration agent on main manages worker agents in worktrees via workmux,
with file-based IPC for status tracking and tmux send-keys for sync when agents are idle.

## References

- Tool: [workmux](https://github.com/raine/workmux)
- Spec: `spec/meta/development-process.md` (worktree workflow)
- Config: `.claude/commands/implement.md`, `code-with-task.md`, `code-with-task-local.md`, `merge-pr.md`, `status.md`

## Steps

### Step 1: DevContainer — tmux + workmux installation

- [x] Add `tmux` to apt-get in `.devcontainer/Dockerfile`
- [x] Add workmux install script after Claude CLI install
- [x] Add `postStartCommand` to `.devcontainer/devcontainer.json` for tmux session auto-start
- [ ] Verify: Rebuild container, confirm `which workmux && which tmux` both succeed

Files:
- `.devcontainer/Dockerfile`
- `.devcontainer/devcontainer.json`

### Step 2: workmux configuration

- [ ] Create `.workmux.yaml` at project root
  - `worktree_dir: /workspaces/reference-manager--worktrees` (override default `__worktrees`)
  - `main_branch: main`
  - `window_prefix: rm-`
  - `panes`: agent (focused) + shell (horizontal, 20%)
  - `post_create`: `npm install`
  - `status_icons`: working/waiting/done
- [ ] Verify: `workmux add test-branch` creates worktree in `--worktrees/` + tmux window

File: `.workmux.yaml` (new)

### Step 3: IPC status file convention

Define the inter-agent communication protocol:

- [ ] Directory: `/workspaces/reference-manager--worktrees/.ipc/`
- [ ] File format: `<handle>.status.json`
- [ ] Schema:
  ```json
  {
    "handle": "<handle>",
    "branch": "<branch>",
    "task_file": "<path>",
    "status": "starting|in_progress|testing|creating_pr|completed|failed",
    "current_step": "<step description>",
    "pr_number": null,
    "error": null,
    "updated_at": "<ISO8601>"
  }
  ```
- [ ] No .gitignore change needed (directory is outside repo root)

### Step 4: Update `implement.md` — orchestration command

Rewrite as workmux orchestration controller:

- [ ] Prerequisite checks (workmux, tmux, IPC directory)
- [ ] ROADMAP analysis → identify parallel tasks
- [ ] Worker spawn: `workmux add feature/<name> -b -p "/code-with-task-local <keyword>"`
  - `-b` for background (don't switch window)
  - `-p` for passing initial prompt to agent
  - Include IPC status file instructions in prompt
- [ ] Monitoring loop:
  - Poll IPC status files (~30s interval)
  - `workmux list` for overview
  - `tmux capture-pane` for stalled workers
- [ ] Completion handling:
  - PR review → CI wait → `gh pr merge --merge`
  - ROADMAP update on main
  - `workmux remove <handle>` + IPC cleanup
- [ ] Failure handling:
  - `tmux capture-pane` to inspect error
  - `tmux send-keys` for retry (if agent is idle)
  - `workmux remove` for unrecoverable cases
- [ ] Idle detection:
  - Check `updated_at` staleness
  - `tmux capture-pane` to verify prompt state
  - `tmux send-keys` for continuation instructions

File: `.claude/commands/implement.md`

### Step 5: Update `code-with-task.md` and `code-with-task-local.md`

- [ ] Add worktree auto-detection (`git rev-parse --show-toplevel`)
  - In worktree: skip worktree creation (already done by workmux)
  - On main: create worktree as before (fallback)
- [ ] Add IPC status file writes when `.ipc/` directory exists
  - Write on: start, each step, testing, PR creation, completion, error
- [ ] Keep backward compatibility (works with or without workmux)

Files:
- `.claude/commands/code-with-task.md`
- `.claude/commands/code-with-task-local.md`

### Step 6: Update `merge-pr.md`

- [ ] After existing merge steps, add:
  - `workmux remove <handle>` (with fallback to manual cleanup)
  - `rm -f /workspaces/reference-manager--worktrees/.ipc/<handle>.status.json`

File: `.claude/commands/merge-pr.md`

### Step 7: Update `status.md`

- [ ] Add `workmux list` output (fallback: `git worktree list`)
- [ ] Add IPC status summary (read all `.ipc/*.status.json`)

File: `.claude/commands/status.md`

### Step 8: Permissions and documentation

- [ ] Add workmux/tmux permissions to `.claude/settings.json`:
  - `Bash(workmux:*)`, `Bash(tmux capture-pane:*)`, `Bash(tmux send-keys:*)`
  - `Bash(tmux list-windows:*)`, `Bash(tmux new-session:*)`, `Bash(which workmux)`, `Bash(sleep:*)`
- [ ] Update `spec/meta/development-process.md`:
  - Add workmux as recommended approach
  - Keep manual worktree as fallback
  - Document IPC convention

Files:
- `.claude/settings.json`
- `spec/meta/development-process.md`

## Manual Verification

- [ ] In tmux: `workmux add test-feature -p "echo hello && exit"` → window created, agent starts
- [ ] `workmux list` → shows test-feature with status icon
- [ ] `workmux remove test-feature` → worktree + window + branch cleaned up
- [ ] `/status` command includes workmux information
- [ ] `/implement` detects workmux and reports readiness (or prompts install)

## Edge Cases

| Situation | Expected Behavior |
|-----------|-------------------|
| workmux not installed | Commands detect absence, show install instructions, fall back to manual |
| Running outside tmux | implement.md detects `$TMUX` unset, prompts session creation |
| Worker agent fails | Orchestrator detects via status file, attempts capture-pane + retry |
| Worker context exhausted | Orchestrator detects stale `updated_at`, sends continuation via send-keys |
| Existing manual worktrees | Coexist with workmux; shown in `workmux list` without tmux windows |

## Completion Checklist

- [ ] All modified commands work both with and without workmux (backward compatible)
- [ ] `.workmux.yaml` uses correct `--worktrees` path convention
- [ ] IPC status protocol documented
- [ ] Permissions added to tracked settings.json
- [ ] `spec/meta/development-process.md` updated
- [ ] CHANGELOG.md updated
