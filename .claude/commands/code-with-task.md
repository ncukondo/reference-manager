spec/_index.mdを起点として必要事項を確認後、spec/tasks/内のタスク[prefix]-*$ARGUMENTS*.mdに取り組んで下さい（ファイルは該当のブランチ内, worktree内にしか無いことがあります）。

作業は、git worktree内で行います。worktreeは必ず `/workspaces/reference-manager--worktrees/` 内に作成して下さい（例: `git worktree add /workspaces/reference-manager--worktrees/<branch-name> -b <branch-name>`）。ブランチ名も無ければ適切なものを作成し、ブランチの作成を直接行うのでは無くgit worktree addで行います。git worktree作成時にはnpm install等の初期セットアップも行って下さい。

ステップ一つが完了する毎にタスクファイルを更新し、commit。次の作業に移る前に残りのcontextを確認し、次の作業の完了までにcompactが必要になってしまいそうならその時点で作業を中断して下さい。

## 作業範囲について

並列作業時のconflictを避けるため:

- **worktree内での作業**: 実装 → テスト → PR作成まで
- **マージ後にmainブランチで**: ROADMAP.md更新とタスクファイルのcompleted/への移動
