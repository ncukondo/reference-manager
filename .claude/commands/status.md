プロジェクトの現在のステータスを確認して報告してください。

## 確認事項

1. **ROADMAP進捗**: spec/tasks/ROADMAP.md を確認し、タスクの状況を数える
2. **テスト結果**: `npm run test:all` を実行
3. **ビルド状況**: `npm run build` を実行
4. **未コミットの変更**: `git status` で確認
5. **workmux/worktree状況**:
   - workmux がある場合: `workmux list` を実行
   - フォールバック: `git worktree list` で確認
6. **IPC ステータス**:
   - `/workspaces/reference-manager--worktrees/.ipc/` ディレクトリが存在する場合:
     ```bash
     for f in /workspaces/reference-manager--worktrees/.ipc/*.status.json; do
       [ -f "$f" ] && cat "$f" | jq -r '[.handle, .status, .current_step] | @tsv'
     done
     ```
7. **PR状況**: `gh pr list` でオープンなPRを確認

## 出力フォーマット

```markdown
## プロジェクトステータス

### タスク進捗
- 完了: X
- 進行中: X
- 未着手: X
- 次の優先タスク: [タスク名](spec/tasks/xxx.md)

### テスト
- passed: X / failed: X / skipped: X

### ビルド
- 成功 / 失敗

### Git
- ブランチ: xxx
- 未コミットの変更: あり / なし

### Worktree / workmux
- (workmux list 出力、または git worktree list)

### エージェント (IPC)
- (各ワーカーのハンドル、ステータス、現在のステップ)
- (IPC ディレクトリが無い場合は省略)

### オープンPR
- (PR一覧)
```
