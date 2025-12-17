# reference-manager 実装ロードマップ

生成日: 2025-12-13 (最終更新: 2025-12-17 - Phase 4 完了)

## プロジェクト概要

**reference-manager** は CSL-JSON ファイルを単一の真実のソースとして扱うローカル参考文献管理ツールです。

## 実装状況サマリー

### ✅ 完了済み (Completed)

- **Phase 1: コア基盤** ✅ 完了 (2025-12-12) - 140テスト
  - CSL-JSON処理（Parser, Serializer, Validator）
  - 識別子生成（Normalizer, Generator, UUID）
  - コアエンティティ（Reference, Library）

- **Phase 2: ユーティリティと設定** ✅ 完了 (2025-12-13) - 77テスト
  - ユーティリティモジュール（Logger, Hash, File, Backup）
  - 設定管理（TOML読み込み、設定解決）

- **Phase 3: 機能モジュール** ✅ 完了 (2025-12-15) - 166テスト
  - 検索機能（Tokenizer, Normalizer, Matcher, Sorter）
  - 重複検出（DOI/PMID/Title+Author+Year）
  - 3-wayマージ（LWW戦略）
  - ファイル監視（chokidar、debounce、リトライ）

- **Phase 4: サーバーとCLI** ✅ 完了 (2025-12-17) - 223テスト
  - HTTPサーバー（Hono、Portfile、CRUD API） - 33テスト
  - CLI（Commander、出力モジュール、CLI-Server統合、全コマンド、アクションハンドラー） - 190テスト

**総テスト数**: 606テスト合格

### 🚧 未実装 (Not Yet Implemented)

- **Phase 5: ビルド・配布・CI**
  - ビルドシステム（Vite設定、bin entry）
  - CI/CD（GitHub Actions）
  - npm配布準備

---

## 完了済みフェーズ詳細

### Phase 1: コア基盤 (Core Foundation) ✅ 完了 (2025-12-12)

**テスト**: 140テスト合格

**主要コンポーネント**:
- CSL-JSON処理
  - `src/core/csl-json/types.ts` - CSL-JSON型定義
  - `src/core/csl-json/parser.ts` - パーサー（JSON読み込み、バリデーション）
  - `src/core/csl-json/serializer.ts` - シリアライザー（JSON書き出し）
  - `src/core/csl-json/validator.ts` - バリデーター（Zodスキーマ）

- 識別子生成
  - `src/core/identifier/normalize.ts` - テキスト正規化
  - `src/core/identifier/generator.ts` - ID生成（`<Author>-<Year>[-<TitleSlug>]`形式、衝突処理）
  - `src/core/identifier/uuid.ts` - UUID管理、レガシーマイグレーション

- コアエンティティ
  - `src/core/reference.ts` - 参照文献エンティティ（UUID、ID生成、メタデータアクセス）
  - `src/core/library.ts` - ライブラリ管理（ファイルI/O、インメモリインデックス、CRUD、ファイルハッシュ追跡）

**仕様**: `spec/core/overview.md`, `spec/core/data-model.md`, `spec/core/identifier-generation.md`

---

### Phase 2: ユーティリティと設定 (Utils & Config) ✅ 完了 (2025-12-13)

**テスト**: 77テスト合格

**主要コンポーネント**:
- ユーティリティモジュール
  - `src/utils/logger.ts` - ロギング（ログレベル、stdout/stderr分離）
  - `src/utils/hash.ts` - SHA-256ハッシュ計算
  - `src/utils/file.ts` - ファイル操作（atomic write）
  - `src/utils/backup.ts` - バックアップ管理（世代・期限管理）

- 設定管理
  - `src/config/schema.ts` - Zodスキーマ、型定義、snake_case正規化、server設定
  - `src/config/defaults.ts` - デフォルト値、パス取得関数
  - `src/config/loader.ts` - TOML読み込み、設定解決（優先順位）

**設定ファイル**: TOML形式（`.reference-manager.config.toml`）

**設定解決順序**: カレントディレクトリ > 環境変数 > ユーザー設定 > デフォルト

**仕様**: `spec/architecture/cli.md`（設定セクション）

---

### Phase 3: 機能モジュール (Features) ✅ 完了 (2025-12-15)

**テスト**: 166テスト合格

**主要コンポーネント**:

#### 3.1 検索機能 (95テスト)
- `src/features/search/types.ts` - 検索関連型定義
- `src/features/search/tokenizer.ts` - クエリトークン化（引用符、フィールド指定）
- `src/features/search/normalizer.ts` - テキスト正規化（NFKC、小文字化、記号削除）
- `src/features/search/matcher.ts` - マッチング（ID系完全一致、コンテンツ系部分一致、AND検索）
- `src/features/search/sorter.ts` - 結果ソート（マッチ強度→年→著者→タイトル→登録順）

**仕様**: `spec/features/search.md`

#### 3.2 重複検出 (24テスト)
- `src/features/duplicate/types.ts` - 重複検出型定義
- `src/features/duplicate/detector.ts` - 重複検出ロジック（DOI → PMID → Title+Author+Year）

**仕様**: `spec/features/duplicate-detection.md`, `spec/features/metadata.md`

#### 3.3 3-wayマージ (21テスト)
- `src/features/merge/types.ts` - マージ結果、競合の型定義
- `src/features/merge/three-way.ts` - LWW対応マージロジック（`custom.timestamp`による自動解決）

**仕様**: `spec/features/write-safety.md`, `spec/core/data-model.md`（created_at/timestampセクション）

#### 3.4 ファイル監視 (26テスト)
- `src/features/file-watcher/file-watcher.ts` - chokidarベース監視（debounce、polling、リトライ、自己書き込み検知）

**仕様**: `spec/features/file-monitoring.md`

---

### Phase 4: サーバーとCLI (Server & CLI) ✅ 完了 (2025-12-17)

**テスト**: 223テスト合格

#### 4.1 HTTPサーバー (33テスト)
- `src/server/portfile.ts` - ポートファイル管理（port, pid, library, started_at）
- `src/server/routes/health.ts` - ヘルスチェックエンドポイント
- `src/server/routes/references.ts` - 参照文献CRUD API（GET/POST/PUT/DELETE）
- `src/server/index.ts` - Honoサーバーエントリーポイント

**仕様**: `spec/architecture/http-server.md`, `spec/architecture/cli-server-integration.md`

#### 4.2 CLI (190テスト)
**Phase A: 基盤拡張 (67テスト)**
- `src/config/schema.ts` - server設定追加（auto_start, auto_stop_minutes）
- `src/server/portfile.ts` - フォーマット拡張（library, started_at）
- `src/core/library.ts` - ファイルハッシュ追跡（currentHash）

**Phase B: 出力モジュール (53テスト)**
- `src/cli/output/json.ts` - JSON出力
- `src/cli/output/pretty.ts` - 整形済み出力（`[id] title`形式）
- `src/cli/output/bibtex.ts` - BibTeX変換出力

**Phase C: CLI-Server統合 (21テスト)**
- `src/cli/server-client.ts` - ServerClient（HTTP API呼び出し）
- `src/cli/server-detection.ts` - サーバー検出・自動起動

**Phase D: コマンド実装 (38テスト)**
- `src/cli/commands/list.ts` - 一覧表示
- `src/cli/commands/search.ts` - 検索（クエリトークン化、マッチング、ソート）
- `src/cli/commands/add.ts` - 参照文献追加（重複検出、ID衝突処理）
- `src/cli/commands/remove.ts` - 削除
- `src/cli/commands/update.ts` - 更新（部分更新、timestamp自動更新）
- `src/cli/commands/server.ts` - サーバー管理（start/stop/status）

**Phase E: CLIエントリー (11テスト)**
- `src/cli/index.ts` - Commanderセットアップ（グローバルオプション、全コマンド登録、シグナルハンドリング、アクションハンドラー）
- `src/cli/helpers.ts` - 共通ヘルパー関数（サーバー統合、入出力処理、対話機能）

**仕様**: `spec/architecture/cli.md`, `spec/architecture/cli-commands.md`, `spec/architecture/cli-advanced.md`, `spec/architecture/cli-server-integration.md`

**主要機能**:
- サーバー自動検出・自動起動（auto_start設定対応）
- サーバーAPI優先、直接ファイルアクセスフォールバック
- 重複検出・ID衝突処理
- 出力フォーマット（pretty/json/ids-only/uuid/bibtex）
- Exit code処理（0: 成功, 1: 一般エラー, 2: 競合, 3: パースエラー, 4: I/Oエラー）

---

## 未実装フェーズ

### Phase 5: ビルド・配布・CI (Build & Distribution) 🔵 優先度: 低

#### 5.1 ビルドシステム

**目標**: Viteビルド、TypeScript型定義、npm配布

| コンポーネント | ファイル | 状態 | 説明 |
|--------------|---------|------|------|
| Vite Config | `vite.config.ts` | ✅ 存在 | ビルド設定 (要確認・調整) |
| TypeScript Config | `tsconfig.json` | ✅ 存在 | TypeScript設定 (要確認) |
| Bin Entry | `bin/reference-manager.js` | ⚠️ 要確認 | CLIエントリースクリプト |

**実装仕様**: `spec/architecture/build-system.md`, `spec/architecture/runtime.md`

**実装順序**:
1. `vite.config.ts` の調整 - ライブラリモード、ESM出力
2. `tsconfig.json` の確認
3. `bin/reference-manager.js` の実装 - `dist/cli/index.js` を実行
4. ビルド動作確認 (`npm run build`)

#### 5.2 CI/CD

**目標**: GitHub Actions によるテスト・ビルド・リリース

| コンポーネント | ファイル | 状態 | 説明 |
|--------------|---------|------|------|
| CI Workflow | `.github/workflows/ci.yml` | ⚠️ 要確認 | テスト・ビルド・型チェック |

**実装仕様**: `spec/guidelines/testing.md`

**実装順序**:
1. `.github/workflows/ci.yml` の実装/確認
2. テスト・lint・型チェックの自動化
3. npm publish の自動化 (オプション)

**Phase 5 完了条件**:
- `npm run build` でビルド成功
- `npm install -g reference-manager` でグローバルインストール可能
- CI/CDが動作

---

## 依存関係グラフ

```
Phase 1 (Core Foundation)
  └─> Phase 2 (Utils & Config)
        └─> Phase 3 (Features)
              └─> Phase 4 (Server & CLI)
                    └─> Phase 5 (Build & Distribution)
```

**並行実装可能な部分**:
- Phase 3内: 各機能（search, duplicate, merge, file-watcher）は並行可能
- Phase 4内: HTTPサーバーとCLIはある程度並行可能（サーバーが先）

---

## 品質ガイドライン

- **Linter/Formatter**: Biome (`npm run lint`, `npm run format`)
- **型チェック**: TypeScript (`npm run typecheck`)
- **テスト**: Vitest (`npm test`)
- **カバレッジ**: `npm run test:coverage`
- **プラットフォーム**: Linux, macOS, Windows (spec/guidelines/platform.md)

---

## 次のステップ

### Phase 5: ビルド・配布・CI ⭐ 次の実装項目

**実装予定順序**:

1. **ビルドシステムの確認・調整**
   - `vite.config.ts` の確認（ライブラリモード、ESM出力）
   - `bin/reference-manager.js` の実装
   - ビルド動作確認

2. **CI/CDの設定**
   - `.github/workflows/ci.yml` の実装
   - テスト・lint・型チェックの自動化

3. **npm配布準備**
   - `package.json` の確認・調整
   - npm publish の設定

---

## 参照仕様

実装時は必ず以下のspecファイルを参照してください:

| カテゴリ | ファイル | 内容 |
|---------|---------|------|
| **Core** | `spec/core/overview.md` | プロジェクト概要・原則 |
| **Core** | `spec/core/data-model.md` | データモデル（UUID, created_at, timestamp） |
| **Core** | `spec/core/identifier-generation.md` | ID生成ルール |
| **Architecture** | `spec/architecture/cli.md` | CLIアーキテクチャ、設定ファイル |
| **Architecture** | `spec/architecture/cli-commands.md` | CLI全コマンド詳細仕様 |
| **Architecture** | `spec/architecture/cli-advanced.md` | Exit code、オプション、監視、対話機能 |
| **Architecture** | `spec/architecture/cli-server-integration.md` | CLI-Server統合、自動起動 |
| **Architecture** | `spec/architecture/http-server.md` | HTTPサーバー、Portfile |
| **Architecture** | `spec/architecture/runtime.md` | ランタイム・配布 |
| **Architecture** | `spec/architecture/build-system.md` | ビルドシステム |
| **Architecture** | `spec/architecture/directory-structure.md` | ディレクトリ構成 |
| **Features** | `spec/features/metadata.md` | DOI/PMID管理 |
| **Features** | `spec/features/duplicate-detection.md` | 重複検出 |
| **Features** | `spec/features/search.md` | 検索機能 |
| **Features** | `spec/features/file-monitoring.md` | ファイル監視、自己書き込み検知 |
| **Features** | `spec/features/write-safety.md` | 書き込み安全性・マージ |
| **Guidelines** | `spec/guidelines/validation.md` | バリデーション |
| **Guidelines** | `spec/guidelines/testing.md` | テスト・品質、TDDワークフロー |
| **Guidelines** | `spec/guidelines/platform.md` | プラットフォームサポート |
| **Guidelines** | `spec/guidelines/pandoc.md` | Pandoc互換性 |
| **Guidelines** | `spec/guidelines/non-goals.md` | 非目標 |

---

## まとめ

- **✅ Phase 1-4 完了** (2025-12-17)
  - Phase 1: コア基盤 (140テスト)
  - Phase 2: ユーティリティと設定 (77テスト)
  - Phase 3: 機能モジュール (166テスト)
  - Phase 4: サーバーとCLI (223テスト)
  - **総テスト数**: 606テスト合格

- **🚧 Phase 5: ビルド・配布・CI** - 未実装
  - ビルドシステムの確認・調整
  - CI/CDの設定
  - npm配布準備

**次のアクション**: Phase 5の実装開始
