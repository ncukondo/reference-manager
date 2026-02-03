PR #$ARGUMENTS のマージ処理を行って下さい。

## 手順

### 1. CI確認
- CIが通っていればマージ
- まだCIが走っている場合は終了するまで待ってから確認

### 2. マージ実行
```bash
gh pr merge $ARGUMENTS --merge
```

### 3. cleanup
- mainを最新にする (`git checkout main && git pull`)
- PRのブランチ名を取得:
  ```bash
  BRANCH=$(gh pr view $ARGUMENTS --json headRefName -q .headRefName)
  ```
- worktreeを削除:
  ```bash
  WORKTREE_DIR="/workspaces/reference-manager--worktrees/$(echo "$BRANCH" | tr '/' '-')"
  if [ -d "$WORKTREE_DIR" ]; then
    cd "$WORKTREE_DIR" && git checkout -- CLAUDE.md 2>/dev/null || true
    git worktree remove "$WORKTREE_DIR" --force
  fi
  ```
- ブランチを削除（リモートは --delete-branch で削除済みの場合あり）:
  ```bash
  git branch -D "$BRANCH" 2>/dev/null || true
  ```

### 4. タスク完了処理（mainブランチで）
- 該当タスクファイルを `spec/tasks/` から `spec/tasks/completed/` に移動
- spec/tasks/ROADMAP.md のステータスを更新
- commit & push
