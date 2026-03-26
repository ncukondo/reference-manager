# reference-manager — Setup Instructions for AI Agents

You are setting up **reference-manager** (`ref`), a CLI tool for managing academic references in CSL-JSON format. It supports adding papers by DOI, PMID, ISBN, arXiv ID, or from BibTeX/RIS files.

## Step 1: Install the binary

Check if `ref` is already installed:

```bash
ref --version
```

If not installed, install the single binary:

```bash
# Linux/macOS
curl -fsSL https://raw.githubusercontent.com/ncukondo/reference-manager/main/install.sh | bash

# Windows (PowerShell)
irm https://raw.githubusercontent.com/ncukondo/reference-manager/main/install.ps1 | iex
```

The binary is installed to `~/.local/bin/ref` (Linux/macOS) or `%LOCALAPPDATA%\ref\ref.exe` (Windows). Ensure this directory is in PATH.

## Step 2: Install Agent Skills

Run in the project directory where you want skills available:

```bash
ref install skills
```

This creates:
- `.agents/skills/ref/` — skill files (cross-client standard)
- `.claude/skills/ref` — symlink for Claude Code compatibility

## Step 3: Initial configuration

Ask the user which library file to use, then configure:

```bash
# Set library path (required — ask the user for their preferred path)
ref config set library.path ./references.json

# Optional: set citation style
ref config set citation.defaultStyle apa

# Optional: set attachments directory for full-text files
ref config set attachments.directory ./attachments
```

## Step 4: Verify setup

```bash
ref --help
ref list
```

## What's available

After setup, the user can use `ref` commands through you (the AI agent) or directly:

- **Add references**: `ref add <DOI|PMID|ISBN|arXiv|file>`
- **Search**: `ref search "query"`
- **Cite**: `ref cite <id>`
- **Full-text**: `ref fulltext fetch <id>`, `ref fulltext get <id> --stdout`
- **Check**: `ref check <id>` (retraction/correction detection)
- **Export**: `ref export <id> --output bibtex`

Run `ref <command> --help` for details on any command.
