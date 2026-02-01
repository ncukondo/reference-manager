spec/_index.mdを起点として必要事項を確認後、spec/tasks/内のタスク[prefix]-*$ARGUMENTS*.mdに取り組んで下さい。

作業は $ARGUMENTS に結びつけられたブランチ(無ければ妥当な名前を考えて作成)で行います。

## IPC ステータス報告

`/workspaces/reference-manager--worktrees/.ipc/` ディレクトリが存在する場合、各フェーズでステータスを書き込む:

```bash
IPC_DIR="/workspaces/reference-manager--worktrees/.ipc"
HANDLE=$(basename "$(git rev-parse --show-toplevel)")
if [ -d "$IPC_DIR" ]; then
  cat > "$IPC_DIR/$HANDLE.status.json" <<IPCEOF
{
  "handle": "$HANDLE",
  "branch": "$(git branch --show-current)",
  "task_file": "<task file path>",
  "status": "<status>",
  "current_step": "<step description>",
  "pr_number": null,
  "error": null,
  "updated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
IPCEOF
fi
```

ステータス値: `starting` → `in_progress` → `testing` → `creating_pr` → `completed` / `failed`

## 作業手順

ステップ一つが完了する毎にタスクファイルを更新し、commit。次の作業に移る前に残りのcontextを確認し、次の作業の完了までにcompactが必要になってしまいそうならその時点で作業を中断して下さい。

## 作業範囲について

並列作業時のconflictを避けるため:

- **ブランチ内での作業**: 実装 → テスト → PR作成まで
- **マージ後にmainブランチで**: ROADMAP.md更新とタスクファイルのcompleted/への移動
