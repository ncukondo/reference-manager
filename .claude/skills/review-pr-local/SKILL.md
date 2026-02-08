---
name: review-pr-local
description: Reviews a PR from the main repository (without worktree). Use when reviewing PRs from the main branch.
---

# PR Review (Local): #$ARGUMENTS

PR #$ARGUMENTS をレビューします。現在mainリポジトリにいます（worktree外）。

## PR Context
!`gh pr view $ARGUMENTS --json title,author,body,additions,deletions,changedFiles --jq '"Title: \(.title)\nAuthor: \(.author.login)\nChanges: +\(.additions)/-\(.deletions) in \(.changedFiles) files"' 2>/dev/null`

## CI Status
!`gh pr checks $ARGUMENTS 2>/dev/null`

## 手順

### 1. CI完了を待つ
```bash
gh pr checks $ARGUMENTS --watch
```

### 2. 変更内容の確認
```bash
gh pr view $ARGUMENTS
gh pr diff $ARGUMENTS
```

### 3. レビュー観点
- [ ] タスクファイルの要件を満たしているか
- [ ] テストが十分に書かれているか
- [ ] 型チェック・lintが通るか（CI結果で確認）
- [ ] 既存の機能に影響がないか
- [ ] コードスタイルがプロジェクトの規約に沿っているか

### 4. レビュー結果をGitHubに投稿
```bash
# 承認
gh pr review $ARGUMENTS --approve --body "LGTM"

# 修正要求
gh pr review $ARGUMENTS --request-changes --body "修正内容"

# コメントのみ
gh pr review $ARGUMENTS --comment --body "コメント"
```

### 5. レビュー結果の報告
承認 / 修正要求 / コメント のいずれかを報告して下さい。
