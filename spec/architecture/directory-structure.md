````markdown
# Directory Structure

## Project Layout

```
reference-manager/
├── spec/                          # 仕様書
│
├── src/
│   ├── cli/                       # CLI関連
│   │   ├── index.ts               # CLIエントリーポイント
│   │   ├── commands/              # 各コマンドの実装
│   │   │   ├── add.ts             # 参考文献追加
│   │   │   ├── search.ts          # 検索
│   │   │   ├── list.ts            # 一覧
│   │   │   ├── remove.ts          # 削除
│   │   │   ├── update.ts          # 更新
│   │   │   └── server.ts          # サーバー管理
│   │   └── output/                # 出力フォーマット
│   │       ├── json.ts
│   │       ├── bibtex.ts
│   │       └── pretty.ts
│   │
│   ├── server/                    # HTTPサーバー関連
│   │   ├── index.ts               # サーバーエントリーポイント
│   │   ├── routes/                # APIルート
│   │   │   ├── references.ts
│   │   │   └── health.ts
│   │   └── portfile.ts            # ポートファイル管理
│   │
│   ├── core/                      # コアロジック
│   │   ├── library.ts             # ライブラリ管理
│   │   ├── library.test.ts        # ライブラリテスト
│   │   ├── reference.ts           # 参考文献エンティティ
│   │   ├── reference.test.ts      # 参考文献テスト
│   │   ├── types.ts               # コア型定義
│   │   ├── csl-json/              # CSL-JSON処理
│   │   │   ├── parser.ts          # パース
│   │   │   ├── parser.test.ts
│   │   │   ├── serializer.ts      # シリアライズ
│   │   │   ├── serializer.test.ts
│   │   │   ├── validator.ts       # バリデーション
│   │   │   ├── validator.test.ts
│   │   │   └── types.ts           # CSL-JSON型定義
│   │   ├── identifier/            # 識別子関連
│   │   │   ├── generator.ts       # ID生成
│   │   │   ├── generator.test.ts
│   │   │   ├── uuid.ts            # UUID管理
│   │   │   ├── uuid.test.ts
│   │   │   ├── normalize.ts       # 正規化
│   │   │   ├── normalize.test.ts
│   │   │   └── types.ts           # 識別子型定義
│   │   └── index.ts               # コアモジュールエクスポート
│   │
│   ├── features/                  # 機能モジュール
│   │   ├── search/                # 検索機能
│   │   │   ├── index.ts
│   │   │   ├── normalizer.ts      # テキスト正規化
│   │   │   ├── normalizer.test.ts
│   │   │   ├── matcher.ts         # マッチングロジック
│   │   │   ├── matcher.test.ts
│   │   │   ├── sorter.ts          # ソート
│   │   │   ├── sorter.test.ts
│   │   │   └── types.ts           # 検索型定義
│   │   ├── duplicate/             # 重複検出
│   │   │   ├── index.ts
│   │   │   ├── detector.ts
│   │   │   ├── detector.test.ts
│   │   │   └── types.ts           # 重複検出型定義
│   │   ├── merge/                 # 3-way マージ
│   │   │   ├── index.ts
│   │   │   ├── three-way.ts
│   │   │   ├── three-way.test.ts
│   │   │   └── types.ts           # マージ型定義
│   │   └── file-watcher/          # ファイル監視
│   │       ├── index.ts
│   │       ├── watcher.ts
│   │       ├── watcher.test.ts
│   │       └── types.ts           # ファイル監視型定義
│   │
│   ├── config/                    # 設定管理
│   │   ├── index.ts
│   │   ├── loader.ts              # 設定ファイル読み込み
│   │   ├── schema.ts              # 設定スキーマ
│   │   ├── defaults.ts            # デフォルト値
│   │   └── types.ts               # 設定型定義
│   │
│   └── utils/                     # ユーティリティ
│       ├── logger.ts              # ロギング
│       ├── file.ts                # ファイル操作
│       ├── hash.ts                # ハッシュ計算
│       └── backup.ts              # バックアップ
│
├── tests/                         # テスト共有リソース
│   └── fixtures/                  # テストデータ
│       └── sample.csl.json
│
├── bin/                           # 実行ファイル
│   └── reference-manager.js       # CLIエントリーポイント
│
├── package.json
├── tsconfig.json
├── vite.config.ts
├── biome.json                     # Linter/Formatter設定
├── .github/
│   └── workflows/
│       └── ci.yml                 # GitHub Actions CI
├── README.md
└── LICENSE
```

## Directory Responsibilities

| Directory | Responsibility |
|-----------|----------------|
| `src/cli/` | commander-based CLI with per-command files |
| `src/server/` | Hono-based HTTP server with portfile management |
| `src/core/` | CSL-JSON operations, ID generation, core logic |
| `src/features/` | Feature modules: search, duplicate detection, merge |
| `src/config/` | Config resolution (env → current dir → user config) |
| `src/utils/` | Shared utilities: logging, file ops, hashing |
| `tests/fixtures/` | Shared test fixtures (sample CSL-JSON files) |
| `bin/` | CLI entry point for npm global install |

## Colocation Strategy

Tests and types are colocated with source files:

```
src/core/
├── library.ts
├── library.test.ts      # Unit test for library.ts
├── reference.ts
├── reference.test.ts    # Unit test for reference.ts
├── types.ts             # Core type definitions
└── csl-json/
    ├── parser.ts
    ├── parser.test.ts
    ├── types.ts         # CSL-JSON type definitions
    └── ...
```

Benefits:
- Easy to find related tests and types
- Encourages test coverage for each module
- Simplifies imports in test files
- Types stay close to their implementation

## Module Boundaries

```
┌─────────────────────────────────────────────────────────┐
│                         CLI                             │
│  (commands/, output/)                                   │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                       Server                            │
│  (routes/, portfile)                                    │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                      Features                           │
│  (search/, duplicate/, merge/, file-watcher/)           │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                        Core                             │
│  (library, reference, csl-json/, identifier/)           │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                 Config / Utils                          │
└─────────────────────────────────────────────────────────┘
```

- Upper layers may depend on lower layers
- Lower layers must not depend on upper layers
- Types are colocated within each layer

````
