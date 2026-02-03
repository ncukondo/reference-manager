PR #$ARGUMENTS をレビューして下さい。該当のブランチはworktreeにチェックアウトされています。CIがまだ完了していない場合は、適宜sleepを入れながら完了するまで待ってからレビューを開始して下さい。

## 手順

### 1. 変更内容の確認
```bash
gh pr view $ARGUMENTS
gh pr diff $ARGUMENTS
```

### 2. レビュー観点
- [ ] タスクファイルの要件を満たしているか
- [ ] テストが十分に書かれているか
- [ ] 型チェック・lintが通るか
- [ ] 既存の機能に影響がないか
- [ ] コードスタイルがプロジェクトの規約に沿っているか

### 3. テスト実行
```bash
npm run test:all
npm run lint
npm run typecheck
```

### 4. レビュー結果をGitHubに投稿

レビュー結果は必ずGitHub PR上に残す。

#### 承認する場合
```bash
gh pr review $ARGUMENTS --approve --body "レビューコメント"
```

#### 修正を要求する場合
```bash
gh pr review $ARGUMENTS --request-changes --body "修正内容の説明"
```

#### 自分のPRの場合（approve/request-changesが使えない）
```bash
gh pr review $ARGUMENTS --comment --body "レビューコメント"
```

**注意**: GitHub では自分が作成したPRに対して `--approve` や `--request-changes` を使うとエラーになる。その場合は `--comment` にフォールバックする。

### 5. レビュー結果の報告
承認 / 修正要求 / コメント のいずれかを報告して下さい。
