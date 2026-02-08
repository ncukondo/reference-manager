---
name: orchestrate
description: Monitors all worker agents and automatically transitions them through the workflow. Use after spawning workers with /implement, or to check orchestration status.
---

# Orchestration Control

ワーカーエージェントを監視し、状態変化を検知してイベントファイルに記録するオーケストレーターを制御します。

**動作モデル**: 検知 + 通知のみ（Detect + Notify）
- エージェントの状態変化を検知
- イベントファイルを `/tmp/claude-orchestrator/events/` に書き出し
- mainペインに短い1行通知を送信
- **kill/spawn/merge/fix送信は行わない** — mainエージェントが判断・実行する

## Current Status

### Orchestrator
!`./scripts/orchestrate.sh --status 2>/dev/null`

### Active Agents
!`./scripts/monitor-agents.sh 2>/dev/null`

### Active Worktrees
!`git worktree list`

### Recent Events
!`ls -t /tmp/claude-orchestrator/events/ 2>/dev/null | head -5`

## Commands

### Start Orchestration
```bash
# Foreground (see output)
./scripts/orchestrate.sh

# Background (recommended after worker spawn)
./scripts/orchestrate.sh --background
```

### Check Status
```bash
./scripts/orchestrate.sh --status
```

### View Events
```bash
# List recent events
ls -lt /tmp/claude-orchestrator/events/

# Read a specific event
cat /tmp/claude-orchestrator/events/<filename>.md
```

### View Logs
```bash
tail -f /tmp/claude-orchestrator/orchestrator.log
```

### Stop Orchestration
```bash
./scripts/orchestrate.sh --stop
```

## Event Types

オーケストレーターが検知するイベント：

| Event | Description | Typical Next Steps |
|---|---|---|
| `worker-completed` | Worker idle + PR created + CI pass | Kill worker, spawn reviewer |
| `ci-failed` | CI checks failed | Send fix instruction to worker |
| `review-approved` | PR approved by reviewer | Kill reviewer, merge PR, cleanup worktree |
| `review-changes-requested` | Changes requested | Switch role to implement, send /pr-comments |
| `review-commented` | Comment-only review | Check comments |
| `agent-error` | Agent in error state | Check/restart agent |

## Event File Format

各イベントファイルには以下が含まれます：

```markdown
## Event: worker-completed
- **Branch**: feat/my-feature
- **PR**: #123
- **Pane**: %31
- **Time**: 14:30:25

## Details
Worker finished implementation. PR #123 created and CI passed.

## Next Steps
\```bash
# コピペで実行可能な推奨コマンド
./scripts/kill-agent.sh %31 && sleep 2 && ./scripts/spawn-reviewer.sh feat/my-feature 123
\```
```

## Handling Events

オーケストレーターからの通知を受け取ったら：

1. イベントファイルを読む: `cat /tmp/claude-orchestrator/events/<filename>.md`
2. Next Stepsに記載のコマンドを確認
3. 状況に応じてコマンドを実行

## Workflow

```
Worker (implement)
    ↓ idle + PR created + CI pass
    ↓ [EVENT: worker-completed → main agent decides next action]
Reviewer (review)
    ↓ idle + review posted
    ├─→ approved:  [EVENT: review-approved → main agent merges]
    ├─→ changes:   [EVENT: review-changes-requested → main agent sends fix]
    └─→ commented: [EVENT: review-commented → main agent checks]
```
