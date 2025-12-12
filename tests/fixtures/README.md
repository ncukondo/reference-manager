# Test Fixtures

テスト用のCSL-JSONサンプルデータです。

## ファイル一覧

| ファイル | 用途 |
|----------|------|
| `sample.csl.json` | 基本的なCSL-JSONエントリ（様々なタイプ、日本語含む） |
| `duplicates.csl.json` | 重複検出テスト用（DOI/PMID/タイトル+著者+年の重複） |
| `edge-cases.csl.json` | エッジケース（最小限エントリ、特殊文字、長いタイトル、UUID欠損など） |
| `merge-scenarios.csl.json` | 3-way マージテスト用（base/local/remote/expected） |
| `empty.csl.json` | 空の配列 |
| `single-entry.csl.json` | 単一エントリ |

## CSL-JSON フォーマット

- 配列形式 `[{...}, {...}]`
- 各エントリには `id` と `type` が必須
- `custom` フィールドに内部UUID: `reference_manager_uuid=<uuid>`

## テストケースのカバレッジ

### 基本機能
- [x] 複数タイプ（article-journal, book, chapter, report）
- [x] 日本語・Unicode文字
- [x] DOI/PMID/ISBN識別子

### 重複検出
- [x] DOI重複
- [x] PMID重複
- [x] タイトル+著者+年の重複

### エッジケース
- [x] 最小限のエントリ（id, type, titleのみ）
- [x] 著者なし
- [x] 年なし
- [x] 特殊文字（α, β, &, ", <, >）
- [x] 非常に長いタイトル
- [x] 多数の著者
- [x] 機関著者（literal）
- [x] UUID欠損
- [x] 無効なUUID

### マージ
- [x] 片方のみ変更
- [x] 両方変更（異なるフィールド）
- [x] ローカル追加
- [x] リモート追加
