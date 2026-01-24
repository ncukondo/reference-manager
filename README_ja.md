# reference-manager

> 文献管理ワークフローを自動化 — システマティックレビューから論文執筆まで

[![npm version](https://img.shields.io/npm/v/@ncukondo/reference-manager.svg)](https://www.npmjs.com/package/@ncukondo/reference-manager)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Status: Alpha](https://img.shields.io/badge/Status-Alpha-orange.svg)]()

自動化を前提に設計されたコマンドライン文献管理ツールです。MCP経由でAIエージェント（Claude Code、Claude Desktop）と連携し、シェルスクリプトやPandocとシームレスに統合できます。

## なぜ reference-manager？

従来の文献管理ツール（Zotero、Mendeley、EndNote）は手動のGUIベースのワークフロー向けに設計されています。**reference-manager** は異なるアプローチを取ります：

- **自動化ファースト**: すべての操作がCLIとMCPで利用可能 — GUIは不要
- **AIネイティブ**: Model Context Protocolを通じてClaudeなどのAIエージェントと直接連携
- **Single Source of Truth**: CSL-JSON形式で互換性と透明性を確保
- **Pandoc対応**: あらゆるスタイルで引用を生成、学術論文執筆に対応

## ユースケース

### システマティックレビュー / スコーピングレビュー

文献レビューの煩雑な作業を自動化：

```bash
# 複数のソースから文献をインポート
ref add pmid:12345678 pmid:23456789
ref add "10.1234/example.doi"
ref add "ISBN:978-4-00-000000-0"
ref add exported-from-pubmed.nbib

# AIによるスクリーニング支援（Claude Codeと連携）
# 「ライブラリ内の抄録をレビューして、AI医学教育に関するレビューに関連しそうな論文にフラグを付けて」

# 分析用にエクスポート
ref list --format json > references.json
```

### 論文執筆

執筆ワークフローを効率化：

```bash
# インタラクティブに文献を検索・選択
ref search -t "machine learning"
# → Spaceキーで文献を選択し、BibTeX出力や引用生成

# 引用を生成
ref cite smith2024 jones2023 --style apa
# 出力: (Smith, 2024; Jones, 2023)

# フルテキストPDFを添付・管理
ref fulltext attach smith2024 ~/papers/smith2024.pdf

# Pandoc用にエクスポート
ref list --format json > references.json
pandoc manuscript.md --bibliography references.json -o manuscript.docx
```

### AI支援リサーチ

Claudeに文献管理を任せる：

```
あなた: 「2020年以降のSmithの論文をすべて見つけて」
Claude: [searchツールを使用] 3件の文献が見つかりました...

あなた: 「機械学習の論文のAPA引用を生成して」
Claude: [citeツールを使用] Smith, J. (2024). Machine learning applications...

あなた: 「この論文を追加: 10.1234/example」
Claude: [addツールを使用] 文献を追加しました: example2024
```

## インストール

### 必要環境

- Node.js 22以上

### npmから

```bash
npm install -g @ncukondo/reference-manager
```

### ソースから

```bash
git clone https://github.com/ncukondo/reference-manager.git
cd reference-manager
npm install
npm run build
npm link
```

## クイックスタート

```bash
# 初期化（デフォルト設定と空のライブラリを作成）
ref list

# DOIで文献を追加
ref add "10.1038/nature12373"

# PubMedから追加
ref add pmid:25056061

# ISBNで書籍を追加
ref add "ISBN:978-4-00-000000-0"

# ライブラリを検索
ref search "author:smith machine learning"

# 引用を生成
ref cite smith2024 --style apa

# すべての文献を一覧表示
ref list
```

## AI連携（MCP）

reference-managerはAIエージェントと直接連携するためのMCP（Model Context Protocol）サーバーを提供します。

### Claude Code セットアップ

MCPサーバーとして追加（グローバルインストール不要）：

```bash
claude mcp add reference-manager --scope project -- npx -y @ncukondo/reference-manager mcp
```

カスタムライブラリパスを指定する場合：

```bash
claude mcp add reference-manager --scope project -- npx -y @ncukondo/reference-manager mcp --library ~/my-references.json
```

### Claude Desktop セットアップ

#### オプション1: MCPBバンドル（推奨）

[最新リリース](https://github.com/ncukondo/reference-manager/releases/latest)から`.mcpb`ファイルをダウンロードして、Claude Desktopでインストール：

1. リリースページから`reference-manager.mcpb`をダウンロード
2. Claude Desktopを開き、**設定** → **拡張機能**に移動
3. **ファイルからインストール**をクリックして、ダウンロードした`.mcpb`ファイルを選択
4. プロンプトが表示されたら**Config File Path**を設定

設定ファイルはプラットフォーム固有の設定ディレクトリに配置されます（例：Linuxでは`~/.config/reference-manager/config.toml`）。

#### オプション2: 手動設定

設定ファイルに追加：

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "reference-manager": {
      "command": "npx",
      "args": ["-y", "@ncukondo/reference-manager", "mcp"]
    }
  }
}
```

カスタムライブラリを使用する場合：

```json
{
  "mcpServers": {
    "reference-manager": {
      "command": "npx",
      "args": ["-y", "@ncukondo/reference-manager", "mcp", "--library", "/path/to/library.json"]
    }
  }
}
```

### 利用可能なツール

| ツール | 説明 | パラメータ |
|--------|------|------------|
| `search` | 文献を検索 | `query`: 検索文字列（例: `"author:smith 2024"`） |
| `list` | すべての文献を一覧表示 | `format?`: `"json"` \| `"bibtex"` \| `"pretty"` |
| `add` | 新しい文献を追加 | `input`: DOI、PMID、ISBN、BibTeX、RIS、またはCSL-JSON |
| `remove` | 文献を削除 | `id`: 文献ID、`force`: `true`が必須 |
| `cite` | フォーマット済み引用を生成 | `ids`: 文献IDの配列、`style?`: 引用スタイル、`format?`: `"text"` \| `"html"` |
| `fulltext_attach` | PDF/Markdownを添付 | `id`: 文献ID、`path`: ファイルパス |
| `fulltext_get` | フルテキストを取得 | `id`: 文献ID |
| `fulltext_detach` | フルテキストを切り離す | `id`: 文献ID |

### 利用可能なリソース

| URI | 説明 |
|-----|------|
| `library://references` | CSL-JSON配列としてのすべての文献 |
| `library://reference/{id}` | IDで指定した単一の文献 |
| `library://styles` | 利用可能な引用スタイル |

## シェル補完

Bash、Zsh、Fishでインテリジェントなタブ補完を有効化：

```bash
# 補完をインストール（対話形式でシェルを選択）
ref completion

# または明示的に
ref completion install

# 補完を削除
ref completion uninstall
```

インストール後、シェルを再起動するか設定ファイルをsourceしてください：

```bash
ref <TAB>                    # 表示: list search add remove attach ...
ref list --<TAB>             # 表示: --json --sort --limit ...
ref list --sort <TAB>        # 表示: created updated published ...
ref cite <TAB>               # 表示: smith2023 jones2024 ...
ref cite smith<TAB>          # 表示: smith2023 smith2024-review
ref attach <TAB>             # 表示: open add list get detach sync
ref attach add <ID> --role <TAB>  # 表示: fulltext supplement notes draft
```

補完機能の内容：
- サブコマンドとオプション
- オプション値（ソートフィールド、引用スタイル、添付ファイルロールなど）
- ライブラリからの動的な文献ID

## CLIリファレンス

### インタラクティブID選択

TTY環境でIDを指定せずに特定のコマンドを実行すると、インタラクティブな検索プロンプトが表示されます：

```bash
# これらのコマンドはID省略時にインタラクティブ選択をサポート
ref cite                  # 文献を選択 → 引用を生成
ref edit                  # 文献を選択 → エディタで開く
ref remove                # 文献を選択 → 削除確認
ref update                # 文献を選択 → 更新フロー
ref fulltext attach       # 文献を選択 → ファイル添付
ref fulltext open         # 文献を選択 → ファイルを開く
ref attach open           # 文献を選択 → フォルダを開く
ref attach add            # 文献を選択 → 添付ファイルを追加
```

引用キーを覚えていなくても、素早く文献を見つけて操作できます。

### 基本コマンド

```bash
# すべての文献を一覧表示
ref list
ref list --format json
ref list --format bibtex

# ソートとページネーション
ref list --sort published --order desc          # 新しい順
ref list --sort author --limit 10               # 著者名順で最初の10件
ref list --sort created -n 20 --offset 20       # ページ2（21-40件目）

# 文献を検索
ref search "machine learning"
ref search "author:smith"
ref search "author:jones year:2024"
ref search "title:\"deep learning\""

# インタラクティブ検索（リアルタイムフィルタリング）
ref search -t                         # インタラクティブモード開始
ref search -t "machine learning"      # クエリをプリフィル

# 生のCSL-JSONをエクスポート（pandoc、jq等向け）
ref export smith2024                          # 単一文献（オブジェクトとして）
ref export smith2024 jones2023                # 複数文献（配列として）
ref export --all                              # 全文献
ref export --search "author:smith"            # 検索結果
ref export smith2024 -o yaml                  # YAML形式
ref export --all -o bibtex                    # BibTeX形式

# 文献を追加
ref add paper.json                    # CSL-JSONファイルから
ref add references.bib                # BibTeXから
ref add export.ris                    # RISから
ref add "10.1038/nature12373"         # DOIから
ref add pmid:25056061                 # PubMed IDから
ref add "ISBN:978-4-00-000000-0"      # ISBNから
cat references.json | ref add         # 標準入力から（ファイル内容）
echo "10.1038/nature12373" | ref add  # 標準入力から（DOI自動検出）
echo "12345678" | ref add -i pmid     # 標準入力から（PMID）
echo "ISBN:978-4-00-000000-0" | ref add -i isbn  # 標準入力から（ISBN）

# 文献を削除
ref remove smith2024
ref remove smith2024 --force          # 確認をスキップ

# 文献を更新
ref update smith2024 updates.json              # JSONファイルから
ref update smith2024 --set "title=New Title"   # インライン更新

# --setオプション（繰り返し可能）
ref update smith2024 --set "title=New Title" --set "DOI=10.1234/example"

# 配列操作（タグ、キーワード）
ref update smith2024 --set "custom.tags+=urgent"       # 配列に追加
ref update smith2024 --set "custom.tags-=done"         # 配列から削除
ref update smith2024 --set "custom.tags=a,b,c"         # 配列を置換

# 著者を設定
ref update smith2024 --set "author=Smith, John"                    # 単一著者
ref update smith2024 --set "author=Smith, John; Doe, Jane"         # 複数著者

# 日付を設定
ref update smith2024 --set "issued.raw=2024-03-15"

# 引用キーを変更
ref update smith2024 --set "id=smith2024-revised"

# フィールドをクリア
ref update smith2024 --set "abstract="

# 引用を生成
ref cite smith2024
ref cite smith2024 jones2023 --style apa
ref cite smith2024 --style chicago-author-date -o html

# インタラクティブ選択（ID引数なし）
ref cite
# → 文献をインタラクティブに選択 → スタイルを選択 → 引用を出力

# 追加オプション
ref cite smith2024 --in-text                 # 文中引用: (Smith, 2024)
ref cite smith2024 --csl-file ./custom.csl   # カスタムCSLファイルを使用
ref cite smith2024 --locale ja-JP            # 日本語ロケール
```

### フルテキスト管理

```bash
# ファイルを添付
ref fulltext attach smith2024 ~/papers/smith2024.pdf
ref fulltext attach smith2024 ~/notes/smith2024.md
ref fulltext attach smith2024 paper.pdf --move    # コピーではなく移動
ref fulltext attach smith2024 paper.pdf --force   # 既存を上書き

# 添付ファイルを取得
ref fulltext get smith2024 --pdf                  # PDFパスを取得
ref fulltext get smith2024 --md                   # Markdownパスを取得
ref fulltext get smith2024 --pdf --stdout         # 内容を標準出力に

# デフォルトアプリでファイルを開く
ref fulltext open smith2024                       # PDFを開く（PDFがなければMarkdown）
ref fulltext open smith2024 --pdf                 # PDFを明示的に開く
ref fulltext open smith2024 --md                  # Markdownを明示的に開く

# 検索結果から開く（パイプライン）
ref search "cancer" --limit 1 --format ids-only | ref fulltext open
ref search "review" --format ids-only | xargs -I{} ref fulltext open {}

# ファイルを切り離す
ref fulltext detach smith2024 --pdf
ref fulltext detach smith2024 --pdf --delete      # ファイルも削除
```

### 添付ファイル管理

文献ごとに複数のファイルをロールベースで分類できる、より柔軟な添付ファイルシステム：

```bash
# 文献の添付ファイルフォルダを開く（ドラッグ＆ドロップでファイル管理）
ref attach open smith2024                # ファイルマネージャでフォルダを開く
ref attach open smith2024 -p             # パスのみ表示（スクリプト用）

# プログラムで添付ファイルを追加
ref attach add smith2024 supplement.xlsx --role supplement
ref attach add smith2024 notes.md --role notes
ref attach add smith2024 draft-v1.docx --role draft --label v1
ref attach add smith2024 file.pdf --move    # コピーではなく移動
ref attach add smith2024 file.pdf --force   # 既存を上書き

# 添付ファイル一覧
ref attach list smith2024                # すべての添付ファイルを表示
ref attach list smith2024 --role supplement  # ロールでフィルタ

# 添付ファイルのパスを取得
ref attach get smith2024 supplement-data.xlsx

# メタデータをファイルシステムと同期（手動ファイル操作後）
ref attach sync smith2024                # 保留中の変更を表示（ドライラン）
ref attach sync smith2024 --yes          # 変更を適用
ref attach sync smith2024 --fix          # 欠落ファイルもメタデータから削除

# ファイルを切り離す
ref attach detach smith2024 supplement-data.xlsx
ref attach detach smith2024 supplement-data.xlsx --delete  # ファイルも削除
```

**利用可能なロール：**
- `fulltext` — メイン文書（PDFまたはMarkdown）
- `supplement` — 補足資料、データセット
- `notes` — 研究ノート
- `draft` — 下書き版

**手動ワークフロー：**
1. `ref attach open smith2024` — ファイルマネージャでフォルダを開く
2. フォルダにファイルをドラッグ＆ドロップ
3. `ref attach sync smith2024 --yes` — メタデータを更新して新しいファイルを含める

ファイルは添付ファイルディレクトリ配下の`著者-年-ID-UUID`形式のディレクトリに整理されます。

### editコマンド

外部エディタを使って文献をインタラクティブに編集：

```bash
# 単一文献を編集
ref edit smith2024

# 複数文献を編集
ref edit smith2024 jones2023

# UUIDで編集
ref edit --uuid 550e8400-e29b-41d4-a716-446655440000

# JSON形式で編集（デフォルトはYAML）
ref edit smith2024 --format json

# インタラクティブ選択（ID引数なし）
ref edit
```

**エディタの選択順序**（Gitと同じ）：
1. `$VISUAL` 環境変数
2. `$EDITOR` 環境変数
3. プラットフォームのフォールバック：`vi`（Linux/macOS）または `notepad`（Windows）

**機能：**
- YAMLまたはJSON形式で文献を開く
- 保護フィールド（uuid、タイムスタンプ、fulltext）はコメントとして表示
- エラー時に再編集オプションで検証
- 日付フィールドはISO形式（`"2024-03-15"`）に簡略化

### 出力フォーマット

| フォーマット | フラグ | 説明 |
|--------------|--------|------|
| Pretty | （デフォルト） | 人間が読みやすい形式 |
| JSON | `--format json` | CSL-JSON配列 |
| BibTeX | `--format bibtex` | BibTeX形式 |
| IDのみ | `--format ids-only` | 1行に1つのID |

### スクリプト用JSON出力

`add`、`remove`、`update`コマンドはスクリプトや自動化のための構造化JSON出力をサポートしています：

```bash
# JSON出力で追加（標準出力に出力）
ref add pmid:12345678 -o json
ref add paper.bib -o json --full    # 完全なCSL-JSONデータを含む

# JSON出力で削除
ref remove smith2024 -o json
ref remove smith2024 -o json --full  # 削除されたアイテムのデータを含む

# JSON出力で更新
ref update smith2024 --set "title=New Title" -o json
ref update smith2024 --set "title=New" -o json --full  # 更新前後のデータを含む

# パイプラインの例
ref add pmid:12345678 -o json | jq '.added[].id' | xargs ref cite
ref add paper.bib -o json | jq -e '.summary.failed == 0'  # 失敗をチェック
```

**出力構造：**

- `add`: `{ summary, added[], skipped[], failed[] }` — 件数と詳細を含む
- `remove`: `{ success, id, uuid?, title?, item?, error? }`
- `update`: `{ success, id, uuid?, title?, idChanged?, previousId?, before?, after?, error? }`

**オプション：**

| オプション | 説明 |
|------------|------|
| `-o json` / `--output json` | JSONを標準出力に出力（デフォルト: テキストを標準エラーに） |
| `--full` | 出力に完全なCSL-JSONデータを含む |

完全なスキーマのドキュメントは`spec/features/json-output.md`を参照してください。

### 検索クエリ構文

- **シンプル検索**: `machine learning`（任意のフィールドにマッチ）
- **フィールド指定**: `author:smith`, `title:neural`, `year:2024`
- **フレーズ検索**: `"machine learning"`（完全一致）
- **組み合わせ**: `author:smith "deep learning" 2024`

対応フィールドプレフィックス: `id:`, `author:`, `title:`, `year:`, `doi:`, `pmid:`, `pmcid:`, `isbn:`, `url:`, `keyword:`, `tag:`

### インタラクティブ検索

リアルタイムフィルタリングでインタラクティブな検索セッションを開始：

```bash
ref search -t                    # 空のクエリで開始
ref search -t "machine learning" # 検索クエリをプリフィル
```

**機能：**
- 入力に応じたリアルタイムフィルタリング（200msのdebounce）
- Spaceキーで複数選択
- 選択した文献に対するアクションメニュー：
  - ID（引用キー）を出力
  - CSL-JSONとして出力
  - BibTeXとして出力
  - 引用を生成（APAまたはスタイル選択）

**ナビゲーション：**
| キー | アクション |
|------|------------|
| `↑` / `↓` | カーソル移動 |
| `Space` | 選択の切り替え |
| `Enter` | アクションメニューを開く |
| `Esc` / `Ctrl+C` | キャンセル |

> **注意**: インタラクティブモードにはTTY（ターミナル）が必要です。パイプやスクリプト内では動作しません。

### ソートとページネーション

```bash
# ソートオプション
ref list --sort published              # 出版日順
ref list --sort created                # 追加日順
ref list --sort updated                # 更新日順
ref list --sort author                 # 第一著者名順
ref list --sort title                  # タイトルのアルファベット順
ref search "AI" --sort relevance       # 検索関連度順（検索のみ）

# ソート順序
ref list --sort published --order asc  # 古い順
ref list --sort published --order desc # 新しい順（デフォルト）

# ページネーション
ref list --limit 20                    # 最初の20件を表示
ref list -n 20 --offset 40             # 41-60件目を表示
```

ソートフィールドのエイリアス: `pub`→`published`, `mod`→`updated`, `add`→`created`, `rel`→`relevance`

## 設定

設定ファイルはプラットフォーム固有のディレクトリに配置されます：

| プラットフォーム | 場所 |
|------------------|------|
| Linux | `~/.config/reference-manager/config.toml` |
| macOS | `~/Library/Preferences/reference-manager/config.toml` |
| Windows | `%APPDATA%\reference-manager\Config\config.toml` |

データ（ライブラリ、フルテキスト、CSLスタイル）のデフォルトパス：

| プラットフォーム | 場所 |
|------------------|------|
| Linux | `~/.local/share/reference-manager/` |
| macOS | `~/Library/Application Support/reference-manager/` |
| Windows | `%LOCALAPPDATA%\reference-manager\Data\` |

任意のディレクトリに`.reference-manager.config.toml`を作成することで、プロジェクトローカルの設定も使用できます。

```toml
# ライブラリパスを上書き（デフォルトは{data}/library.json）
library = "~/references.json"

# ログレベル: silent, info, debug
log_level = "info"

[backup]
max_generations = 50
max_age_days = 365

[fulltext]
# フルテキストディレクトリを上書き（デフォルトは{data}/fulltext）
directory = "~/references/fulltext"

[server]
auto_start = true
auto_stop_minutes = 60
```

### 環境変数

| 変数 | 説明 |
|------|------|
| `REFERENCE_MANAGER_LIBRARY` | ライブラリファイルパスを上書き |
| `REFERENCE_MANAGER_ATTACHMENTS_DIR` | 添付ファイルディレクトリを上書き |

### configコマンド

TOMLファイルを直接編集せずにCLIで設定を管理：

```bash
# すべての設定を表示
ref config show
ref config show -o json           # JSON形式
ref config show --sources         # 各値のソースを表示

# 個別の値を取得/設定
ref config get citation.default_style
ref config set citation.default_style chicago-author-date
ref config set --local citation.default_style ieee  # プロジェクトローカル設定

# デフォルトに戻す
ref config unset citation.default_style

# 利用可能なキーを一覧表示
ref config keys

# 設定ファイルの場所を表示
ref config path

# エディタで設定を開く
ref config edit
ref config edit --local           # プロジェクトローカル設定を編集
```

**キーのカテゴリ：**
- `library`, `log_level` — 基本設定
- `backup.*` — バックアップ設定
- `server.*` — HTTPサーバー設定
- `citation.*` — 引用のデフォルト（スタイル、ロケール、フォーマット）
- `pubmed.*` — PubMed API認証情報
- `fulltext.*` — フルテキスト保存先
- `cli.*` — CLI動作（制限、ソート、TUIモード）
- `mcp.*` — MCPサーバー設定

## データ形式

reference-managerは[CSL-JSON](https://citeproc-js.readthedocs.io/en/latest/csl-json/markup.html)をネイティブ形式として使用します。これはPandoc、Zotero、その他の学術ツールで使用されているのと同じ形式です。

### Pandoc連携

```bash
# ライブラリをエクスポート
ref list --format json > references.json

# Pandocで使用
pandoc manuscript.md \
  --bibliography references.json \
  --csl apa.csl \
  -o manuscript.docx
```

### カスタムフィールド

reference-managerは追加メタデータ用に`custom`オブジェクトでCSL-JSONを拡張しています：

```json
{
  "id": "smith2024",
  "type": "article-journal",
  "title": "Example Paper",
  "custom": {
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "tags": ["important", "to-read"],
    "fulltext_pdf": "smith2024.pdf",
    "fulltext_md": "smith2024.md"
  }
}
```

## プロジェクトステータス

**Alpha** — このプロジェクトは活発に開発中です。APIやコマンドはバージョン間で変更される可能性があります。

開発の進捗と予定機能については[spec/tasks/ROADMAP.md](./spec/tasks/ROADMAP.md)を参照してください。

## 開発

### ビルド

```bash
npm run build
```

### テスト

```bash
npm test                 # すべてのテストを実行
npm run test:watch       # ウォッチモード
npm run test:coverage    # カバレッジレポート
```

### 品質チェック

```bash
npm run typecheck        # TypeScript型チェック
npm run lint             # リント
npm run format           # コードフォーマット
```

## ライセンス

MIT

## リンク

- [リポジトリ](https://github.com/ncukondo/reference-manager)
- [npmパッケージ](https://www.npmjs.com/package/@ncukondo/reference-manager)
- [Issues](https://github.com/ncukondo/reference-manager/issues)
- [ドキュメント](./spec/)
