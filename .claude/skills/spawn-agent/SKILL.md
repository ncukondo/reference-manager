---
name: spawn-agent
description: Spawns a generic Claude agent in a worktree for research, PR comments, or custom tasks. Use when you need a worker for non-standard tasks.
---

# Spawn Agent

汎用Claudeエージェントを起動します。調査、PRコメント対応、カスタムタスクに使用。

## Usage

```bash
# 調査用エージェント（既存worktree）
./scripts/spawn-agent.sh feat/my-feature -- "このコードベースの認証フローを調査して"

# PRコメント対応エージェント
./scripts/spawn-agent.sh --pr 123 -- "PR #123 のコメントに対応して"

# 新規worktree作成 + カスタムタスク
./scripts/spawn-agent.sh feat/new-feature --create -- "新機能の設計を検討して"

# インタラクティブモード（プロンプトなし）
./scripts/spawn-agent.sh feat/my-feature

# メインリポジトリで起動
./scripts/spawn-agent.sh --main -- "全体的なアーキテクチャを調査して"
```

## Options

| オプション | 説明 |
|:-----------|:-----|
| `--pr <number>` | PR番号から起動（ブランチ自動検出、worktree自動作成） |
| `--create` | worktreeがなければ作成 |
| `--role <role>` | CLAUDE.mdにロールを設定（implement, review） |
| `--main` | worktreeではなくメインリポジトリで起動 |
| `-- <prompt>` | 起動時のプロンプト（省略でインタラクティブ） |

## Examples

### 調査タスク

```bash
# コードベース調査
./scripts/spawn-agent.sh feat/task-a -- "src/providers/ の各プロバイダーの実装パターンを調査して"

# 依存関係調査
./scripts/spawn-agent.sh --main -- "package.json の依存関係を分析して、更新が必要なものをリストアップ"
```

### PRコメント対応

```bash
# PRのコメントに対応
./scripts/spawn-agent.sh --pr 123 -- "/pr-comments 123"

# 手動でコメント内容を指定
./scripts/spawn-agent.sh --pr 123 -- "レビュアーから指摘された型安全性の問題を修正して"
```

### カスタムワーカー

```bash
# ドキュメント作成
./scripts/spawn-agent.sh feat/docs --create -- "README.mdを更新して、新機能の説明を追加"

# リファクタリング
./scripts/spawn-agent.sh feat/refactor --create -- "src/cli/commands/ のコマンドをリファクタリング"
```

## Notes

- プロンプトを省略するとインタラクティブモードで起動
- `--pr` オプションは自動的に `--create` を含む
- worktree内で `npm install` を自動実行
