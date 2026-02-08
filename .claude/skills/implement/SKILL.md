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

**Pane limit: max 4 workers** (main + 4 workers = 5 panes).
Before spawning, check current pane count:
```bash
tmux list-panes | wc -l  # Must be < 5
```
If 5+ tasks exist, spawn sequentially — wait for one to complete before spawning the next.

```bash
# Spawn worker for each task
./scripts/spawn-worker.sh <branch-name> <task-keyword>
```

spawn-worker.sh automatically:
1. Creates worktree at `reference-manager--worktrees/<branch-name>`
2. Runs npm install
3. Creates new pane in current window
4. Starts Claude with the task

### 3. Start Orchestration

After spawning all workers:

```bash
# Background orchestration (recommended)
./scripts/orchestrate.sh --background
```

Orchestrator automatically:
- Worker completion → spawns Reviewer
- Reviewer approval → notifies main agent
- Changes requested → sends fix instructions
- Errors → notifies main agent

### 4. Apply Layout

```bash
./scripts/apply-layout.sh
```

### 5. Monitor (optional)

```bash
# Check orchestrator status
./scripts/orchestrate.sh --status

# View logs
tail -f /tmp/claude-orchestrator/orchestrator.log

# View notifications
cat /tmp/claude-orchestrator/notifications
```

### 6. Merge (main agent only)

When notified of approval:
```bash
./scripts/merge-pr.sh <pr-number>
```

### 7. Post-Merge (main branch)

- Update ROADMAP.md status to "Done"
- Move task file to `spec/tasks/completed/`

## Notes

- **メインエージェントは直接コードを書かない・テストを実行しない・レビューしない・調査しない**
- All agents run in panes within the same tmux window
- Use `git worktree list` to see all worktrees
- Use `./scripts/monitor-agents.sh` to see agent states
- Be aware of dependency conflicts during parallel work
