新しいタスクファイルを作成してください。

## 引数

$ARGUMENTS: タスク名（例: "custom-theme-support"）

## 手順

1. spec/tasks/ROADMAP.md を確認し、次のタスク番号を決定
2. spec/tasks/_template.md をベースに新しいタスクファイルを作成
   - ファイル名: `spec/tasks/YYYYMMDD-NN-$ARGUMENTS.md`
   - YYYYMMDD: 今日の日付
   - NN: 同日内の連番（01, 02, ...）
3. 以下の情報を入力:
   - Purpose: タスクの目的
   - References: 関連仕様、依存タスク、関連ソース
   - Steps: 実装ステップ（TDD形式）
   - Manual Verification: 手動検証（必要な場合）
   - Completion Checklist: 受け入れ基準
4. ROADMAP.md に新しいタスクを追加

## 出力

作成したタスクファイルのパスと、ROADMAP.mdへの追加内容を報告してください。
