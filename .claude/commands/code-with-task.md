spec/_index.mdを起点として必要事項を確認後、spec/tasks/内のタスク[prefix]-*$ARGUMENTS*.mdに取り組んで下さい（ファイルは該当のブランチ内, worktree内にしか無いことがあります）。

## worktree セットアップ

まず現在の環境を確認:
```bash
git rev-parse --show-toplevel
```

- **worktree 内にいる場合**（workmux経由）: そのまま作業開始。worktree作成済み。
- **main リポジトリ内の場合**: worktreeを作成:
  ```bash
  git worktree add /workspaces/reference-manager--worktrees/<branch-name> -b <branch-name>
  cd /workspaces/reference-manager--worktrees/<branch-name>
  npm install
  ```

## IPC ステータス報告

worktreeルートの `.worker-status.json` にステータスを書き込む（worktree内なので許可プロンプト不要）:

```bash
WORKTREE_ROOT="$(git rev-parse --show-toplevel)"
cat > "$WORKTREE_ROOT/.worker-status.json" <<IPCEOF
{
  "branch": "$(git branch --show-current)",
  "task_file": "<task file path>",
  "status": "<status>",
  "current_step": "<step description>",
  "pr_number": null,
  "error": null,
  "updated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
IPCEOF
```

ステータス値: `starting` → `in_progress` → `testing` → `creating_pr` → `completed` / `failed`

書き込みタイミング:
- 作業開始時: `starting`
- 各ステップ着手時: `in_progress` + `current_step` 更新
- テスト実行時: `testing`
- PR作成時: `creating_pr`
- 完了時: `completed` + `pr_number` 設定
- エラー時: `failed` + `error` 設定

## 作業手順

ステップ一つが完了する毎にタスクファイルを更新し、commit。次の作業に移る前に残りのcontextを確認し、次の作業の完了までにcompactが必要になってしまいそうならその時点で作業を中断して下さい。

## 作業範囲について

並列作業時のconflictを避けるため:

- **worktree内での作業**: 実装 → テスト → PR作成まで
- **マージ後にmainブランチで**: ROADMAP.md更新とタスクファイルのcompleted/への移動
