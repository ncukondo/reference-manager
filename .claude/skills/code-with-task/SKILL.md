---
name: code-with-task
description: Implements a task from spec/tasks in a git worktree following TDD. Use when working on a specific task by keyword.
---

# Task Implementation: $ARGUMENTS

CLAUDE.md, spec/_index.mdを起点として必要事項を確認後、spec/tasks内の `[prefix]-*$ARGUMENTS*.md` に一致するタスクファイルの実装に取り組みます（ファイルは該当のブランチ内, worktree内にしか無いことがあります）。

## Prerequisites

まず以下を確認:
- CLAUDE.md
- spec/_index.md

## Worktree Setup

作業はgit worktree内で行います:

```bash
# worktree作成（ブランチがなければ自動作成）
PARENT_DIR="$(cd "$(git rev-parse --show-toplevel)/.." && pwd)"
PROJECT_NAME="$(basename "$(git rev-parse --show-toplevel)")"
git worktree add "${PARENT_DIR}/${PROJECT_NAME}--worktrees/<branch-name>" -b <branch-name>
cd "${PARENT_DIR}/${PROJECT_NAME}--worktrees/<branch-name>"
npm install
```

**パス規則**: worktreeは必ずリポジトリの親ディレクトリ直下の `reference-manager--worktrees/` 内に作成

## Implementation Flow

### TDD Cycle
1. **Red**: 失敗するテストを書く
2. **Green**: テストを通す最小限の実装
3. **Refactor**: リファクタリング
4. 各ステップ完了後にcommit

### Progress Tracking
- ステップ完了毎にcommit
- 次の作業前にcontext残量を確認
- compact が必要になりそうなら作業を中断して報告

## Completion Checks

```bash
npm run test:all
npm run lint
npm run typecheck
```

## PR Creation

全テスト通過後:
```bash
gh pr create --title "feat: ..." --body "..."
```

## Work Boundaries

並列作業時のconflict回避のため:

- **worktree内での作業**: 実装 → テスト → PR作成まで
- **マージ後にmainブランチで**: ROADMAP.md更新とタスクファイル移動
