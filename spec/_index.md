# reference-manager 仕様書

## 概要

**reference-manager** は CSL-JSON ファイルを単一の真実のソースとして扱うローカル参考文献管理ツールです。

## ディレクトリ構成

### core/ - 常に読み込むべきコア仕様

| ファイル | 内容 |
|---------|------|
| [overview.md](core/overview.md) | プロジェクト概要・基本原則 |
| [data-model.md](core/data-model.md) | データモデル・識別子 |
| [identifier-generation.md](core/identifier-generation.md) | ID生成ルール |

### architecture/ - アーキテクチャ関連

| ファイル | 内容 |
|---------|------|
| [runtime.md](architecture/runtime.md) | ランタイム・配布方法 |
| [build-system.md](architecture/build-system.md) | ビルドシステム・モジュール |
| [cli.md](architecture/cli.md) | CLIアーキテクチャ |
| [http-server.md](architecture/http-server.md) | HTTPサーバー |
| [directory-structure.md](architecture/directory-structure.md) | ディレクトリ構成 |

### features/ - 機能仕様

| ファイル | 内容 |
|---------|------|
| [metadata.md](features/metadata.md) | メタデータフィールド |
| [duplicate-detection.md](features/duplicate-detection.md) | 重複検出 |
| [search.md](features/search.md) | 検索機能 |
| [file-monitoring.md](features/file-monitoring.md) | ファイル監視・リロード |
| [write-safety.md](features/write-safety.md) | 書き込み安全性・競合処理 |

### guidelines/ - ガイドライン

| ファイル | 内容 |
|---------|------|
| [validation.md](guidelines/validation.md) | バリデーション |
| [testing.md](guidelines/testing.md) | テスト・品質 |
| [platform.md](guidelines/platform.md) | プラットフォームサポート |
| [pandoc.md](guidelines/pandoc.md) | Pandoc互換性 |
| [future.md](guidelines/future.md) | 将来の拡張 |
| [non-goals.md](guidelines/non-goals.md) | 非目標 |

## 読み込み指針

| ディレクトリ | 読み込みタイミング |
|-------------|-------------------|
| `core/` | **常に読み込み** - プロジェクトの根幹となる仕様 |
| `architecture/` | CLI/サーバー実装時、ビルド設定時 |
| `features/` | 各機能の実装・修正時（該当ファイルのみ） |
| `guidelines/` | テスト作成時、CI設定時、互換性確認時 |
