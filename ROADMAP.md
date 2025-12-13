# reference-manager 実装ロードマップ

生成日: 2025-12-13 (更新)

## プロジェクト概要

**reference-manager (reference-manager)** は CSL-JSON ファイルを単一の真実のソースとして扱うローカル参考文献管理ツールです。

## 実装状況サマリー

### ✅ 完了済み (Completed)

- **プロジェクトセットアップ**
  - TypeScript + Vite ビルド環境
  - Vitest テストフレームワーク
  - Biome (lint/format)
  - 基本的なディレクトリ構造
  - テストフィクスチャ

- **Phase 1: コア基盤 - 完了** ✅
  - CSL-JSON型定義 (`src/core/csl-json/types.ts`) ✅
  - CSL-JSONパーサー (`src/core/csl-json/parser.ts`) ✅
  - CSL-JSONシリアライザー (`src/core/csl-json/serializer.ts`) ✅
  - CSL-JSONバリデーター (`src/core/csl-json/validator.ts`) ✅
  - UUID管理 (`src/core/identifier/uuid.ts`) ✅
  - テキスト正規化 (`src/core/identifier/normalize.ts`) ✅
  - ID生成 (`src/core/identifier/generator.ts`) ✅
  - 参考文献エンティティ (`src/core/reference.ts`) ✅
  - ライブラリ管理 (`src/core/library.ts`) ✅
  - コアモジュールエクスポート (`src/core/index.ts`) ✅
  - **全テスト**: 140テスト合格 ✅

- **Phase 2: ユーティリティと設定 - 完了** ✅
  - Phase 2.1: ユーティリティモジュール
    - ロガー (`src/utils/logger.ts`) ✅
    - ハッシュユーティリティ (`src/utils/hash.ts`) ✅
    - ファイルユーティリティ (`src/utils/file.ts`) ✅
    - バックアップ管理 (`src/utils/backup.ts`) ✅
    - ユーティリティエクスポート (`src/utils/index.ts`) ✅
  - Phase 2.2: 設定管理
    - 設定スキーマ (`src/config/schema.ts`) ✅
    - 設定デフォルト (`src/config/defaults.ts`) ✅
    - 設定ローダー (`src/config/loader.ts`) ✅
    - 設定エクスポート (`src/config/index.ts`) ✅
  - **全テスト**: 77テスト合格 ✅

### 🚧 未実装 (Not Yet Implemented)

以下の項目はspec定義済みですが、コードは未実装です。

---

## 実装ロードマップ

実装は以下の5つのフェーズに分けて進めます。

### Phase 1: コア基盤 (Core Foundation) ✅ 完了 (2025-12-12)

#### 1.1 CSL-JSON処理の完成 ✅

**目標**: CSL-JSONの読み書き・バリデーションを完全に実装

| コンポーネント | ファイル | 状態 | 説明 |
|--------------|---------|------|------|
| Serializer | `src/core/csl-json/serializer.ts` | ✅ 完了 | CSL-JSONへのシリアライズ |
| Serializer Test | `src/core/csl-json/serializer.test.ts` | ✅ 完了 | シリアライザーのテスト (11テスト) |
| Validator | `src/core/csl-json/validator.ts` | ✅ 完了 | 書き込み前のバリデーション |
| Validator Test | `src/core/csl-json/validator.test.ts` | ✅ 完了 | バリデーターのテスト (15テスト) |

**実装完了**: 2025-12-12

**実装内容**:
1. ✅ `serializer.ts` - JSON.stringify、2スペースインデント、親ディレクトリ作成
2. ✅ `serializer.test.ts` - ラウンドトリップテスト、フォーマット検証
3. ✅ `validator.ts` - Zodスキーマによる構造検証、エラーメッセージ
4. ✅ `validator.test.ts` - 不正データ、必須フィールド、エッジケースの検証
5. ✅ `tests/fixtures/invalid.json` - バリデーションテスト用フィクスチャ

**テスト結果**: 全39テスト合格 (parser: 13, serializer: 11, validator: 15)

#### 1.2 識別子生成 ✅

**目標**: BibTeX形式のID生成とUUID管理

| コンポーネント | ファイル | 状態 | 説明 |
|--------------|---------|------|------|
| ID Generator | `src/core/identifier/generator.ts` | ✅ 完了 | `<Author>-<Year>[-<TitleSlug>]` 形式のID生成 |
| Generator Test | `src/core/identifier/generator.test.ts` | ✅ 完了 | ID生成ロジックのテスト (22テスト) |
| Normalizer | `src/core/identifier/normalize.ts` | ✅ 完了 | テキスト正規化 (スペース→_、ASCII化) |
| Normalizer Test | `src/core/identifier/normalize.test.ts` | ✅ 完了 | 正規化のテスト (28テスト) |
| UUID Test | `src/core/identifier/uuid.test.ts` | ❌ 未実装 | UUID管理のテスト |
| Types | `src/core/identifier/types.ts` | ❌ 未実装 | 識別子関連の型定義 |

**実装仕様**: `spec/core/identifier-generation.md`

**実装完了**: 2025-12-12

**実装内容**:
1. ✅ `normalize.ts` - スペースをアンダースコアに変換、ASCII文字・数字・_のみ保持
2. ✅ `normalize.test.ts` - 28テスト (多言語、特殊文字、エッジケース)
3. ✅ `generator.ts` - ID生成ロジック、フォールバック (anon/nd/untitled)、衝突処理 (a-z, aa-zz...)
4. ✅ `generator.test.ts` - 22テスト (著者/年/タイトルの組み合わせ、衝突処理)
5. ⏳ `uuid.test.ts` - 未実装 (UUID機能自体は既存)
6. ⏳ `types.ts` - 未実装 (必要に応じて追加)

**テスト結果**: 全50テスト合格 (normalize: 28, generator: 22)

#### 1.3 コアエンティティ ✅

**目標**: 参考文献とライブラリのエンティティ実装

| コンポーネント | ファイル | 状態 | 説明 |
|--------------|---------|------|------|
| Reference Entity | `src/core/reference.ts` | ✅ 完了 | 参考文献エンティティ |
| Reference Test | `src/core/reference.test.ts` | ✅ 完了 | 参考文献のテスト (25テスト) |
| Library Manager | `src/core/library.ts` | ✅ 完了 | ライブラリ管理クラス |
| Library Test | `src/core/library.test.ts` | ✅ 完了 | ライブラリ管理のテスト (26テスト) |
| Core Index | `src/core/index.ts` | ✅ 完了 | コアモジュールエクスポート |

**実装仕様**: `spec/core/data-model.md`

**実装完了**: 2025-12-12

**実装内容**:
1. ✅ `reference.test.ts` - 参考文献エンティティのテスト (TDD: テスト先行)
2. ✅ `reference.ts` - UUID自動生成、ID生成統合、メタデータアクセス
3. ✅ `library.test.ts` - ライブラリ管理のテスト (TDD: テスト先行)
4. ✅ `library.ts` - ファイルI/O、インメモリインデックス (UUID/ID/DOI/PMID)、CRUD操作
5. ✅ `index.ts` - コアモジュールの統合エクスポート

**テスト結果**: 全51テスト合格 (reference: 25, library: 26)

**Phase 1 完了条件**:
- ✅ CSL-JSONの読み書きが完全に動作
- ✅ ID生成が仕様通りに動作 (衝突処理含む)
- ✅ ライブラリの基本操作 (追加・削除・読み込み) が動作

---

### Phase 2: ユーティリティと設定 (Utils & Config) 🟠 優先度: 中

#### 2.1 ユーティリティモジュール ✅

**目標**: ファイル操作、ロギング、ハッシュ、バックアップ

| コンポーネント | ファイル | 状態 | 説明 |
|--------------|---------|------|------|
| Logger | `src/utils/logger.ts` | ✅ 完了 | ロギング (stdout/stderr分離) |
| Logger Test | `src/utils/logger.test.ts` | ✅ 完了 | ロガーのテスト (16テスト) |
| File Utils | `src/utils/file.ts` | ✅ 完了 | ファイル操作 (atomic write含む) |
| File Test | `src/utils/file.test.ts` | ✅ 完了 | ファイルユーティリティのテスト (14テスト) |
| Hash Utils | `src/utils/hash.ts` | ✅ 完了 | SHA-256ハッシュ計算 |
| Hash Test | `src/utils/hash.test.ts` | ✅ 完了 | ハッシュユーティリティのテスト (14テスト) |
| Backup Utils | `src/utils/backup.ts` | ✅ 完了 | バックアップ管理 (世代・期限管理) |
| Backup Test | `src/utils/backup.test.ts` | ✅ 完了 | バックアップ管理のテスト (16テスト) |
| Utils Index | `src/utils/index.ts` | ✅ 完了 | ユーティリティモジュールエクスポート |

**実装仕様**:
- `spec/features/write-safety.md` - バックアップ、ハッシュ
- `spec/architecture/cli.md` - ロギング

**実装完了**: 2025-12-13

**実装内容**:
1. ✅ `logger.ts` - ログレベル (debug/info/error)、stderr/stdout分離、タイムスタンプ付きフォーマット
2. ✅ `logger.test.ts` - 16テスト (ログレベル、出力先、フォーマット検証)
3. ✅ `hash.ts` - SHA-256計算 (文字列・ファイル)
4. ✅ `hash.test.ts` - 14テスト (ハッシュ計算、ファイルハッシュ検証)
5. ✅ `file.ts` - atomic write (write-file-atomic使用)、ディレクトリ作成
6. ✅ `file.test.ts` - 14テスト (atomic write、ディレクトリ作成、エラーハンドリング)
7. ✅ `backup.ts` - バックアップディレクトリ管理、世代管理、期限管理
8. ✅ `backup.test.ts` - 16テスト (バックアップ作成、一覧、クリーンアップ)
9. ✅ `index.ts` - ユーティリティモジュールの統合エクスポート

**テスト結果**: 全60テスト合格 (logger: 16, hash: 14, file: 14, backup: 16)

#### 2.2 設定管理 ✅

**目標**: TOML設定ファイルの読み込みと解決

| コンポーネント | ファイル | 状態 | 説明 |
|--------------|---------|------|------|
| Config Schema | `src/config/schema.ts` | ✅ 完了 | Zodスキーマ・型定義・正規化 |
| Config Defaults | `src/config/defaults.ts` | ✅ 完了 | デフォルト値・パス取得関数 |
| Config Loader Test | `src/config/loader.test.ts` | ✅ 完了 | 設定ローダーのテスト (17テスト) |
| Config Loader | `src/config/loader.ts` | ✅ 完了 | TOML読み込み・解決・マージ |
| Config Index | `src/config/index.ts` | ✅ 完了 | 設定モジュールエクスポート |

**実装仕様**: `spec/architecture/cli.md` - 設定解決順序・フォーマット

**実装完了**: 2025-12-13

**設定ファイル**:
- フォーマット: **TOML** (`@iarna/toml`)
- カレントディレクトリ: `.reference-manager.config.toml` (最優先)
- 環境変数: `REFERENCE_MANAGER_CONFIG`
- ユーザー設定: `~/.reference-manager/config.toml` (最低優先)

**設定項目**:
- `library`: CSL-JSONファイルパス (デフォルト: `~/.reference-manager/csl.library.json`)
- `log_level`: ログレベル (`silent` | `info` | `debug`)
- `backup.*`: バックアップ設定 (世代数、保存期間、ディレクトリ)
- `watch.*`: ファイル監視設定 (debounce、polling、retry)

**実装内容**:
1. ✅ `schema.ts` - Zodスキーマ、LogLevel/BackupConfig/WatchConfig/Config型、DeepPartialConfig型、snake_case→camelCase正規化
2. ✅ `defaults.ts` - デフォルト設定値、パス取得関数 (getDefaultLibraryPath等)
3. ✅ `loader.test.ts` - 17テスト (TDD: テスト先行) - デフォルト、ファイル読み込み、優先順位、エラーハンドリング、CLI上書き
4. ✅ `loader.ts` - TOML読み込み、設定解決 (カレントディレクトリ > 環境変数 > ユーザー設定 > デフォルト)、マージ、バリデーション
5. ✅ `index.ts` - 型・スキーマ・関数のエクスポート

**テスト結果**: 全17テスト合格 (loader: 17テスト)

**Phase 2.1 完了条件**:
- ✅ ロギングが動作
- ✅ ファイルのatomic writeが動作
- ✅ バックアップ生成・世代管理が動作

**Phase 2.2 完了条件**:
- ✅ TOML設定ファイルの読み込みが動作
- ✅ 設定解決順序 (カレントディレクトリ > 環境変数 > ユーザー設定) が動作
- ✅ デフォルト値のフォールバックが動作
- ✅ CLI引数による設定上書きの準備が完了

---

### Phase 3: 機能モジュール (Features) 🟡 優先度: 中

#### 3.1 検索機能

**目標**: テキスト正規化、マッチング、ソート

| コンポーネント | ファイル | 状態 | 説明 |
|--------------|---------|------|------|
| Search Types | `src/features/search/types.ts` | ❌ 未実装 | 検索関連の型定義 |
| Normalizer | `src/features/search/normalizer.ts` | ❌ 未実装 | NFKC、小文字化、記号除去 |
| Normalizer Test | `src/features/search/normalizer.test.ts` | ❌ 未実装 | 正規化のテスト |
| Matcher | `src/features/search/matcher.ts` | ❌ 未実装 | 完全一致・部分一致 |
| Matcher Test | `src/features/search/matcher.test.ts` | ❌ 未実装 | マッチングのテスト |
| Sorter | `src/features/search/sorter.ts` | ❌ 未実装 | ソートロジック |
| Sorter Test | `src/features/search/sorter.test.ts` | ❌ 未実装 | ソートのテスト |
| Search Index | `src/features/search/index.ts` | ❌ 未実装 | 検索機能のエクスポート |

**実装仕様**: `spec/features/search.md`

**実装順序**:
1. `types.ts` - 検索クエリ、結果の型
2. `normalizer.ts` - Unicode NFKC、小文字化、記号削除
3. `normalizer.test.ts` - 各種言語、記号のテスト
4. `matcher.ts` - 完全一致、部分一致 (Fuzzyは後回し)
5. `matcher.test.ts` - マッチングロジックのテスト
6. `sorter.ts` - マッチ強度、年、著者、タイトル順
7. `sorter.test.ts` - ソートのテスト
8. `index.ts` - エクスポート

#### 3.2 重複検出

**目標**: DOI/PMID/タイトル+著者+年による重複検出

| コンポーネント | ファイル | 状態 | 説明 |
|--------------|---------|------|------|
| Duplicate Types | `src/features/duplicate/types.ts` | ❌ 未実装 | 重複検出の型定義 |
| Detector | `src/features/duplicate/detector.ts` | ❌ 未実装 | 重複検出ロジック |
| Detector Test | `src/features/duplicate/detector.test.ts` | ❌ 未実装 | 重複検出のテスト |
| Duplicate Index | `src/features/duplicate/index.ts` | ❌ 未実装 | 重複検出のエクスポート |

**実装仕様**:
- `spec/features/duplicate-detection.md`
- `spec/features/metadata.md` - DOI正規化、PMID抽出

**実装順序**:
1. `types.ts` - 重複検出結果の型
2. `detector.ts` - DOI → PMID → タイトル+著者+年の優先順位
3. `detector.test.ts` - `tests/fixtures/duplicates.csl.json` を使用
4. `index.ts` - エクスポート

#### 3.3 3-wayマージ

**目標**: 競合検出と3-wayマージ

| コンポーネント | ファイル | 状態 | 説明 |
|--------------|---------|------|------|
| Merge Types | `src/features/merge/types.ts` | ❌ 未実装 | マージ関連の型定義 |
| Three-way Merge | `src/features/merge/three-way.ts` | ❌ 未実装 | 3-wayマージロジック |
| Merge Test | `src/features/merge/three-way.test.ts` | ❌ 未実装 | マージのテスト |
| Merge Index | `src/features/merge/index.ts` | ❌ 未実装 | マージのエクスポート |

**実装仕様**: `spec/features/write-safety.md` - マージ戦略

**実装順序**:
1. `types.ts` - マージ結果、競合の型
2. `three-way.ts` - UUID による同一性判定、フィールドごと比較
3. `three-way.test.ts` - `tests/fixtures/merge-scenarios.csl.json` を使用
4. `index.ts` - エクスポート

#### 3.4 ファイル監視

**目標**: CSL-JSONファイルの変更監視と自動リロード

| コンポーネント | ファイル | 状態 | 説明 |
|--------------|---------|------|------|
| Watcher Types | `src/features/file-watcher/types.ts` | ❌ 未実装 | ファイル監視の型定義 |
| Watcher | `src/features/file-watcher/watcher.ts` | ❌ 未実装 | chokidarベースの監視 |
| Watcher Test | `src/features/file-watcher/watcher.test.ts` | ❌ 未実装 | 監視のテスト |
| Watcher Index | `src/features/file-watcher/index.ts` | ❌ 未実装 | ファイル監視のエクスポート |

**実装仕様**: `spec/features/file-monitoring.md`

**実装順序**:
1. `types.ts` - イベントの型
2. `watcher.ts` - chokidar、debounce 500ms、リトライ処理
3. `watcher.test.ts` - 変更検知、無視パターンのテスト
4. `index.ts` - エクスポート

**Phase 3 完了条件**:
- 検索 (PMID/DOI/タイトル+著者) が動作
- 重複検出が動作
- 3-wayマージが動作
- ファイル監視・リロードが動作

---

### Phase 4: サーバーとCLI (Server & CLI) 🟢 優先度: 中低

#### 4.1 HTTPサーバー

**目標**: Honoベースのローカルサーバー

| コンポーネント | ファイル | 状態 | 説明 |
|--------------|---------|------|------|
| Server Entry | `src/server/index.ts` | ❌ 未実装 | サーバーエントリーポイント |
| Portfile | `src/server/portfile.ts` | ❌ 未実装 | ポートファイル管理 |
| References Route | `src/server/routes/references.ts` | ❌ 未実装 | 参考文献API |
| Health Route | `src/server/routes/health.ts` | ❌ 未実装 | ヘルスチェックAPI |

**実装仕様**: `spec/architecture/http-server.md`

**実装順序**:
1. `portfile.ts` - 動的ポート割り当て、ポートファイル読み書き
2. `routes/health.ts` - ヘルスチェックエンドポイント
3. `routes/references.ts` - CRUD API (内部用、安定性保証なし)
4. `index.ts` - Honoサーバー起動

#### 4.2 CLI

**目標**: commanderベースのCLI実装

| コンポーネント | ファイル | 状態 | 説明 |
|--------------|---------|------|------|
| CLI Entry | `src/cli/index.ts` | ❌ 未実装 | CLIエントリーポイント |
| Add Command | `src/cli/commands/add.ts` | ❌ 未実装 | 参考文献追加 |
| Search Command | `src/cli/commands/search.ts` | ❌ 未実装 | 検索 |
| List Command | `src/cli/commands/list.ts` | ❌ 未実装 | 一覧表示 |
| Remove Command | `src/cli/commands/remove.ts` | ❌ 未実装 | 削除 |
| Update Command | `src/cli/commands/update.ts` | ❌ 未実装 | 更新 |
| Server Command | `src/cli/commands/server.ts` | ❌ 未実装 | サーバー管理 |
| JSON Output | `src/cli/output/json.ts` | ❌ 未実装 | JSON出力 |
| BibTeX Output | `src/cli/output/bibtex.ts` | ❌ 未実装 | BibTeX出力 |
| Pretty Output | `src/cli/output/pretty.ts` | ❌ 未実装 | 整形済み出力 |

**実装仕様**: `spec/architecture/cli.md`

**実装順序**:
1. `output/json.ts` - JSON出力
2. `output/pretty.ts` - 整形済み出力
3. `output/bibtex.ts` - BibTeX変換出力
4. `commands/list.ts` - 一覧表示
5. `commands/search.ts` - 検索コマンド
6. `commands/add.ts` - 追加コマンド
7. `commands/remove.ts` - 削除コマンド
8. `commands/update.ts` - 更新コマンド
9. `commands/server.ts` - サーバー起動・停止
10. `index.ts` - commanderセットアップ

**Phase 4 完了条件**:
- サーバーが起動し、ポートファイルで管理される
- CLIコマンドが全て動作
- 出力フォーマット (JSON, BibTeX, Pretty) が動作

---

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
- Phase 1内: `1.1 CSL-JSON処理` と `1.2 識別子生成` は並行可能
- Phase 2内: `2.1 ユーティリティ` と `2.2 設定管理` は並行可能
- Phase 3内: 各機能 (search, duplicate, merge, file-watcher) は並行可能
- Phase 4内: `4.1 HTTPサーバー` と `4.2 CLI` はある程度並行可能 (CLIがサーバーを起動するため、サーバーが先)

---

## テスト戦略

### 必須テストカバレッジ

| カテゴリ | テスト対象 | 優先度 |
|---------|----------|--------|
| 正規化 | `normalizer.test.ts` (search, identifier) | 高 |
| 重複検出 | `detector.test.ts` | 高 |
| 3-wayマージ | `three-way.test.ts` | 高 |
| ID生成 | `generator.test.ts` | 高 |
| UUID管理 | `uuid.test.ts` | 中 |
| CSL-JSON I/O | `parser.test.ts`, `serializer.test.ts` | 中 |
| ファイル監視 | `watcher.test.ts` | 中 |

### テストフィクスチャ

既存フィクスチャ (全て `/tests/fixtures/` に存在):
- `sample.csl.json` - 基本サンプル (5件)
- `empty.csl.json` - 空配列
- `single-entry.csl.json` - 1件のみ
- `edge-cases.csl.json` - エッジケース (著者なし、年なし等)
- `duplicates.csl.json` - 重複検出用
- `merge-scenarios.csl.json` - マージシナリオ用
- `invalid.json` - 不正なJSON (バリデーターテスト用) ✅

---

## 品質ガイドライン

- **Linter/Formatter**: Biome (`npm run lint`, `npm run format`)
- **型チェック**: TypeScript (`npm run typecheck`)
- **テスト**: Vitest (`npm test`)
- **カバレッジ**: `npm run test:coverage`
- **プラットフォーム**: Linux, macOS, Windows (spec/guidelines/platform.md)

---

## 次のアクションアイテム

### 今すぐ実装すべき項目 (Phase 3.1) ⭐ 最優先

Phase 2が完了しました！次はPhase 3.1 (検索機能) に進みます。

**Search Feature** (Phase 3.1)

1. **Search Types** (`src/features/search/types.ts`)
   - 内容: 検索クエリ、結果の型定義

2. **Normalizer** (`src/features/search/normalizer.ts` + テスト)
   - 内容: Unicode NFKC正規化、小文字化、記号削除
   - テスト: 各種言語、記号のテスト

3. **Matcher** (`src/features/search/matcher.ts` + テスト)
   - 内容: 完全一致、部分一致 (Fuzzyは後回し)
   - テスト: マッチングロジックのテスト

4. **Sorter** (`src/features/search/sorter.ts` + テスト)
   - 内容: マッチ強度、年、著者、タイトル順のソート
   - テスト: ソートのテスト

5. **Search Index** (`src/features/search/index.ts`)
   - 内容: 検索機能のエクスポート

### 中期実装項目 (Phase 3.2-3.4)

- Duplicate detection (Phase 3.2)
- 3-way merge (Phase 3.3)
- File watcher (Phase 3.4)

### 長期実装項目 (Phase 4-5)

- HTTP Server (Hono)
- CLI (commander)
- Build & Distribution
- CI/CD

---

## 非目標 (Non-Goals)

以下は **実装しない** 項目です (`spec/guidelines/non-goals.md`):

- PDFダウンロード
- クラウド同期
- GUIアプリケーション
- ブラウザ拡張
- Zotero/Mendeley互換性

---

## 参照仕様

実装時は必ず以下のspecファイルを参照してください:

| カテゴリ | ファイル | 内容 |
|---------|---------|------|
| **Core** | `spec/core/overview.md` | プロジェクト概要・原則 |
| **Core** | `spec/core/data-model.md` | データモデル |
| **Core** | `spec/core/identifier-generation.md` | ID生成ルール |
| **Architecture** | `spec/architecture/cli.md` | CLIアーキテクチャ |
| **Architecture** | `spec/architecture/http-server.md` | HTTPサーバー |
| **Architecture** | `spec/architecture/runtime.md` | ランタイム・配布 |
| **Architecture** | `spec/architecture/build-system.md` | ビルドシステム |
| **Architecture** | `spec/architecture/directory-structure.md` | ディレクトリ構成 |
| **Features** | `spec/features/metadata.md` | DOI/PMID管理 |
| **Features** | `spec/features/duplicate-detection.md` | 重複検出 |
| **Features** | `spec/features/search.md` | 検索機能 |
| **Features** | `spec/features/file-monitoring.md` | ファイル監視 |
| **Features** | `spec/features/write-safety.md` | 書き込み安全性・マージ |
| **Guidelines** | `spec/guidelines/validation.md` | バリデーション |
| **Guidelines** | `spec/guidelines/testing.md` | テスト・品質 |
| **Guidelines** | `spec/guidelines/platform.md` | プラットフォームサポート |
| **Guidelines** | `spec/guidelines/pandoc.md` | Pandoc互換性 |

---

## まとめ

- **✅ Phase 1: コア基盤 - 完了** (2025-12-12)
  - ✅ Phase 1.1: CSL-JSON処理 (Parser, Serializer, Validator) - 39テスト
  - ✅ Phase 1.2: 識別子生成 (Normalizer, Generator, UUID) - 50テスト
  - ✅ Phase 1.3: コアエンティティ (Reference, Library) - 51テスト
  - **全140テスト合格** ✅

- **✅ Phase 2: ユーティリティと設定 - 完了** (2025-12-13)
  - ✅ Phase 2.1: ユーティリティモジュール
    - ✅ Logger (ログレベル、stderr/stdout分離) - 16テスト
    - ✅ Hash Utils (SHA-256ハッシュ計算) - 14テスト
    - ✅ File Utils (atomic write、ディレクトリ作成) - 14テスト
    - ✅ Backup Utils (バックアップ管理、世代・期限管理) - 16テスト
  - ✅ Phase 2.2: 設定管理
    - ✅ Config (Zodスキーマ、TOML読み込み、設定解決) - 17テスト
  - **全77テスト合格** ✅

- **🟡 Phase 3: 機能モジュール** ← 次のステップ
  - Search、Duplicate、Merge、File Watcher

- **🟢 Phase 4: サーバーとCLI**
  - Server、CLI

- **🔵 Phase 5: ビルド・配布・CI**
  - Build、CI/CD

**総テスト数**: 217テスト合格 (Phase 1: 140, Phase 2: 77)

実装は **Phase 3.1 (検索機能)** から順番に進めることを推奨します。