---
name: implement
description: Analyzes ROADMAP and implements tasks in parallel with automatic orchestration. Use when starting implementation work.
---

# Parallel Implementation

spec/tasks/ROADMAP.md を確認し、並列実装可能なタスクを分析して実装を進めます。

## CRITICAL: Main Agent Role

**メインエージェントは管理・指揮のみを行い、直接作業は一切行いません。**

以下は全てサブエージェント（ワーカー）に委譲すること：
- **実装**: コードの作成・編集
- **テスト**: テストの実行・確認
- **レビュー**: PRのレビュー
- **調査**: コードベースの調査・分析

メインエージェントが行うのは：
- タスク分析と優先順位付け
- ワーカーのスポーン・監視
- オーケストレーション管理
- レビュー結果の報告・ユーザー判断の仲介
- マージとROADMAP更新

## Planned Tasks
!`grep "Planned\|Pending" spec/tasks/ROADMAP.md`

## Active Worktrees
!`git worktree list`

## Steps

### 1. Task Analysis

- Check spec/tasks/ROADMAP.md for "Planned"/"Pending" tasks
- Identify tasks with satisfied dependencies (parallel candidates)
- Select tasks to implement
  - Multiple parallelizable tasks → use spawn-worker.sh

### 2. Spawn Workers

**Worker limit: max 4 workers** (plus the main agent).
Before spawning, check current agent count:
```bash
./scripts/monitor-agents.sh  # workers (non-main rows) must be < 4
```
If 5+ tasks exist, spawn sequentially — wait for one to complete before spawning the next.

```bash
# Spawn worker for each task
./scripts/spawn-worker.sh <branch-name> <task-keyword>
```

spawn-worker.sh automatically:
1. Creates worktree at `~/.herdr/worktrees/reference-manager/<branch-name>`
2. Runs npm install
3. Opens a herdr workspace and starts Claude with the task (--permission-mode auto)

### 3. Start Orchestration

```bash
./scripts/orchestrate.sh --background
```

Orchestrator (detect + notify model):
- Detects agent state changes (idle, error, etc.)
- Writes event files to `/tmp/claude-orchestrator/events/`
- Sends 1-line notification to main agent pane
- Does **NOT** auto-execute actions — main agent decides

### 4. Monitor Implementation

Periodically check worker progress:
```bash
herdr agent read <pane-id> --lines 30
```

**Context exhaustion handling:**
If agent output shows signs of context exhaustion (repetitive output, no progress):
1. Send commit instruction: `./scripts/send-to-agent.sh <pane-id> "現状をcommitしてpushしてください"`
2. Wait for commit, then kill: `./scripts/kill-agent.sh <pane-id>`
3. Re-spawn: `./scripts/spawn-worker.sh <branch-name> <task-keyword>`

### 5. Implementation Complete → Kill → Spawn Reviewer

When worker finishes (PR created, visible in pane output):
1. Confirm PR exists: `gh pr list --head <branch>`
2. Kill implementation agent: `./scripts/kill-agent.sh <pane-id>`
3. Spawn reviewer: `./scripts/spawn-reviewer.sh --pr <pr-number>`

### 6. Review Complete → Report to User

When reviewer finishes (review comment posted, visible in pane output):
1. Confirm review posted: `gh pr view <pr-number> --json reviews`
2. Kill reviewer: `./scripts/kill-agent.sh <pane-id>`
3. **Report ALL findings to user** (minor含む全件報告):
   - Critical/Major issues
   - Minor issues and suggestions
   - Test/CI status
4. **Ask user for decision** — merge or fix

### 7. Fix (if user requests)

When user requests fixes for review findings:
1. Launch fix agent with specific instructions:
   ```bash
   ./scripts/launch-agent.sh <worktree-dir> "<fix instructions>"
   ```
2. Monitor until complete
3. Kill fix agent: `./scripts/kill-agent.sh <pane-id>`
4. Report to user and ask for next action (re-review or merge)

### 8. Merge (after user approval)

```bash
./scripts/merge-pr.sh <pr-number>
```

### 9. Post-Merge (main branch)

- Update ROADMAP.md status to "Done"
- Move task file to `spec/tasks/completed/`
- Clean up worktree if needed: `git worktree remove <path>`

## Notes

- **メインエージェントは直接コードを書かない・テストを実行しない・レビューしない・調査しない**
- All agents run in herdr workspaces (one workspace per worktree)
- Use `git worktree list` to see all worktrees
- Use `./scripts/monitor-agents.sh` to see agent states
- Orchestrator commands: `--status`, `--stop`, `--clean` (clear persisted states)
- Be aware of dependency conflicts during parallel work
