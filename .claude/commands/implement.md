spec/_index.mdを起点として必要事項を確認後、spec/tasks/ROADMAP.md を確認し、並列実装可能なタスクを分析して実装を進めて下さい。

## 手順

### 1. タスク分析
- spec/tasks/ROADMAP.md を確認し、未完了のタスクを全て洗い出す
- 依存関係が満たされているタスクを特定（並列実行候補）
- 実装するタスクを選択
  - 並列実装が可能なタスクが複数ある場合、git worktreeの準備後、サブエージェントに分担しても良い

### 2. ブランチ & worktree セットアップ
worktreeは必ず `/workspaces/reference-manager--worktrees/` 内に作成して下さい（例: `git worktree add /workspaces/reference-manager--worktrees/<branch-name> -b <branch-name>`）。ブランチ名も無ければ適切なものを作成し、ブランチの作成を直接行うのでは無くgit worktree addで行います。git worktree作成時にはnpm install等の初期セットアップも行って下さい。

### 3. TDD実装サイクル
各ステップについて:
1. **Red**: 失敗するテストを書く
2. **Green**: テストを通す最小限の実装
3. **Refactor**: リファクタリング
4. 各ステップ完了後にcommit

### 4. 完了前チェック
```bash
npm run test:all
npm run lint
npm run typecheck
```

### 5. PR作成
- 全テスト通過を確認
- gh pr create でPR作成

### 6. マージ後（mainブランチで）
- ROADMAP.md のステータスを更新
- タスクファイルを `spec/tasks/completed/` に移動
- worktree と ブランチを cleanup

## 並列実行について
- 複数セッションで別々のworktreeを使って並列作業可能
- 依存関係のconflictに注意
- マージ時の調整を意識する

## 作業範囲について

並列作業時のconflictを避けるため:

- **worktree内での作業**: 実装 → テスト → PR作成まで
- **マージ後にmainブランチで**: ROADMAP.md更新とタスクファイルのcompleted/への移動

## context管理
ステップ一つが完了する毎にタスクファイルを更新し、commit。次の作業の完了までにcompactが必要になりそうなら、その時点で作業を中断し、進捗を報告して下さい。
