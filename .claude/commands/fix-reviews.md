レビューで修正要求（changes requested）のあるPRを検出し、修正エージェントを起動して下さい。

## 手順

### 1. 修正が必要なPRの検出
```bash
gh pr list --state open --json number,headRefName,title,reviewDecision
```
`reviewDecision` が `CHANGES_REQUESTED` のPRを対象とする。

### 2. レビューコメントの確認
各PRのレビューコメントを取得:
```bash
gh pr view <pr-number> --comments
gh api repos/{owner}/{repo}/pulls/<pr-number>/reviews --jq '.[] | select(.state == "CHANGES_REQUESTED") | .body'
```

### 3. worktreeの確認
各PRのworktreeが存在することを確認（通常はレビュー時に作成済み）。
無ければ作成:
```bash
git worktree add /workspaces/reference-manager--worktrees/<branch-dir> <branch-name>
```

### 4. 修正エージェントの起動
各PRについて `spawn-worker.sh` 相当でtmuxペインにワーカーエージェントを起動する。
ワーカーにはレビューコメントの内容を伝えて修正を指示する:
```bash
./scripts/spawn-worker.sh <branch-name> <task-keyword> &
# ... 他のPRも同様 ...
wait
```

spawn-worker.sh が使えない場合（タスクキーワードが不明）は、手動でセットアップ:
1. `./scripts/set-role.sh <worktree-dir> implement` でロール設定
2. `./scripts/launch-agent.sh <worktree-dir> "<修正指示プロンプト>"` でエージェント起動

### 5. レイアウト適用
```bash
./scripts/apply-layout.sh
```

### 6. 結果報告
起動したエージェントの一覧と、各PRの修正要求内容のサマリーを報告する。

## 注意
- 修正対象が無い場合はその旨を報告して終了
- レビューコメントの内容を正確にエージェントに伝えること
- tmux send-keys でプロンプトを送る際は、テキストと Enter を別々に送信し、間に sleep 1 を挟む
