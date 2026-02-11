---
name: review-pr
description: Reviews a GitHub PR by checking CI status, running tests, and posting review. Always reports findings to user. Use when reviewing PRs or when the user says "review PR".
---

# PR Review: #$ARGUMENTS

PR #$ARGUMENTS をレビューします。

**重要**: 発見した全ての問題点（minor含む）を必ずユーザーに報告してください。

## PR Context
!`gh pr view $ARGUMENTS --json title,author,body,additions,deletions,changedFiles --jq '"Title: \(.title)\nAuthor: \(.author.login)\nChanges: +\(.additions)/-\(.deletions) in \(.changedFiles) files\n\nDescription:\n\(.body)"' 2>/dev/null`

## CI Status
!`gh pr checks $ARGUMENTS 2>/dev/null || true`

## 手順

### 1. CI完了待機

CIが未完了の場合は完了まで待機：
```bash
while true; do
  status=$(gh pr checks $ARGUMENTS --json state --jq 'all(.state == "SUCCESS" or .state == "SKIPPED")' 2>/dev/null)
  if [ "$status" = "true" ]; then break; fi
  echo "Waiting for CI..."
  sleep 30
done
```

### 2. 変更内容の確認
```bash
gh pr diff $ARGUMENTS
```

### 3. レビュー観点

以下の全ての観点でチェックし、**問題があればminorでも記録**すること：

#### 必須チェック（問題あれば changes_requested）
- [ ] タスクファイルの要件を満たしているか
- [ ] テストが十分に書かれているか
- [ ] 型チェック・lintが通るか
- [ ] 既存の機能に影響がないか
- [ ] セキュリティ上の問題がないか

#### 推奨チェック（問題あれば報告、approve可）
- [ ] コードスタイルがプロジェクトの規約に沿っているか
- [ ] 変数名・関数名が適切か
- [ ] コメント・ドキュメントが必要な箇所にあるか
- [ ] 不要なコード（console.log等）が残っていないか
- [ ] パフォーマンス上の懸念がないか

### 4. テスト実行
```bash
npm run test:all
npm run lint
npm run typecheck
```

### 5. レビュー結果の作成

**必ず以下の形式でレビュー本文を作成**：

```markdown
## Summary
[変更内容の要約]

## Findings

### Critical/Major (if any)
- [修正必須の問題]

### Minor/Suggestions (if any)
- [軽微な問題や提案]

## Verdict
[APPROVE / CHANGES REQUESTED / COMMENT]
```

### 6. GitHubに投稿

#### 承認する場合（minorな指摘があっても可）
```bash
gh pr review $ARGUMENTS --approve --body "レビュー本文"
```

#### 修正を要求する場合（critical/majorな問題がある場合）
```bash
gh pr review $ARGUMENTS --request-changes --body "レビュー本文"
```

#### 自分のPRの場合
```bash
gh pr review $ARGUMENTS --comment --body "レビュー本文"
```

### 7. ユーザーへの報告

**必ず以下を報告**：

1. **レビュー結果**: APPROVE / CHANGES REQUESTED / COMMENT
2. **発見した問題（全て）**:
   - Critical/Major: [リスト]
   - Minor/Suggestions: [リスト]
3. **推奨アクション**:
   - approveの場合: マージ可能
   - changes_requestedの場合: 修正待ち
   - commentの場合: 確認待ち

**Minor な問題も省略せず報告すること。** ユーザーが最終判断を行うために、全ての情報が必要です。
