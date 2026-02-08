---
name: create-task
description: Creates a new task file from template. Use when adding a new task to the project.
---

# Create Task: $ARGUMENTS

新しいタスクファイル「$ARGUMENTS」を作成します。

## Current Tasks
!`ls spec/tasks/*.md 2>/dev/null | grep -v '_template\|ROADMAP' | head -10`

## Steps

### 1. Determine Task Number
```bash
# 既存タスクの最大番号を確認
ls spec/tasks/ spec/tasks/completed/ 2>/dev/null | grep -oE '^[0-9]+' | sort -n | tail -1
```

### 2. Create Task File

テンプレート: `spec/tasks/_template.md`

ファイル名: `spec/tasks/YYYYMMDD-NN-$ARGUMENTS.md`

### 3. Fill In Content

- **Purpose**: タスクの目的
- **Context**: 関連仕様、依存タスク、関連ソース
- **Implementation Steps**: 実装ステップ（TDD形式）
- **E2E Test**: エンドツーエンドテスト
- **Acceptance Criteria**: 受け入れ基準

### 4. Update ROADMAP

`spec/tasks/ROADMAP.md` に新しいタスクを追加

## Output

作成したタスクファイルのパスと、ROADMAP.mdへの追加内容を報告してください。
