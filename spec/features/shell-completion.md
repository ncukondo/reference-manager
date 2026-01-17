# Shell Completion

## Purpose

Provide intelligent shell auto-completion for CLI commands to improve user productivity:
- **Command discovery**: Quickly find available subcommands
- **Option recall**: No need to memorize all flags
- **ID completion**: Dynamically complete reference IDs from the library

## Scope

- **Interfaces**: CLI only
- **Shells**: Bash, Zsh, Fish
- **Dependency**: `tabtab` npm package

## Command

```bash
ref completion [action]
```

| Action | Description |
|--------|-------------|
| `install` (default) | Install shell completion |
| `uninstall` | Remove shell completion |

### Examples

```bash
# Install completion
ref completion
ref completion install

# Remove completion
ref completion uninstall
```

## Completion Targets

### Subcommands

First positional argument completes available subcommands:

```bash
ref <TAB>
# → list search add remove update cite fulltext server mcp completion
```

### Global Options

Available after any subcommand:

```bash
ref list --<TAB>
# → --help --version --config --library --quiet --verbose --log-level --no-backup --backup-dir
```

### Command-Specific Options

Each command provides its specific options:

| Command | Completable Options |
|---------|---------------------|
| `list` | `--json`, `--ids-only`, `--uuid`, `--bibtex`, `--sort`, `--order`, `--limit`, `-n`, `--offset` |
| `search` | Same as `list` |
| `add` | `--stdin`, `--link` |
| `remove` | `--force`, `--uuid` |
| `update` | `--field`, `--uuid` |
| `cite` | `--style`, `--csl-file`, `--locale`, `--format`, `--in-text`, `--uuid` |
| `config` | Subcommands: `show`, `get`, `set`, `unset`, `list-keys`, `path`, `edit` |
| `fulltext` | Subcommands: `attach`, `get`, `detach` |
| `server` | Subcommands: `start`, `stop`, `status` |
| `mcp` | `--config` |

### Option Values

Context-aware value completion:

| Option | Completable Values |
|--------|-------------------|
| `--sort` | `created`, `updated`, `published`, `author`, `title`, `relevance` (search only) |
| `--order` | `asc`, `desc` |
| `--format` (cite) | `text`, `html`, `rtf` |
| `--style` | `apa`, `vancouver`, `chicago-author-date`, `harvard1`, `ieee`, `mla` |
| `--log-level` | `silent`, `info`, `debug` |
| `config <subcmd>` | `show`, `get`, `set`, `unset`, `list-keys`, `path`, `edit` |
| `fulltext <subcmd>` | `attach`, `get`, `detach` |
| `server <action>` | `start`, `stop`, `status` |

### Dynamic ID Completion

Reference IDs are dynamically loaded from the library:

```bash
ref cite <TAB>
# → smith2023  jones2024-rna  wang2023-crispr ...

ref remove <TAB>
# → (same as above)

ref update <TAB>
# → (same as above)

ref fulltext get <TAB>
# → (same as above)
```

#### Completion Format

ID completions include brief context (Zsh/Fish):

```
smith2023:RNA interference mechanisms
jones2024:CRISPR applications in...
```

#### Commands Supporting ID Completion

| Command | Argument Position |
|---------|-------------------|
| `cite` | All positional arguments |
| `remove` | First positional argument |
| `update` | First positional argument |
| `fulltext get` | First positional argument |
| `fulltext attach` | First positional argument |
| `fulltext detach` | First positional argument |

## Implementation

### Library

- **Package**: `tabtab` (v3.x)
- **Why tabtab**:
  - Dynamic completion via Node.js execution
  - Battle-tested (used by npm, pnpm)
  - No external binary dependency for users

### Completion Flow

```
User types: ref cite sm<TAB>
              │
              ▼
    Shell invokes: ref completion
    with COMP_LINE="ref cite sm"
              │
              ▼
    Node.js process starts
              │
              ▼
    Parse completion context
              │
              ▼
    Load library (if ID completion)
              │
              ▼
    Filter and output candidates
              │
              ▼
    Shell displays matches
```

### Modules

```
src/cli/
├── completion.ts       # Completion logic
└── index.ts            # Register completion command
```

See: `src/cli/completion.ts`

## Performance

### Considerations

| Concern | Mitigation |
|---------|-----------|
| Node.js startup | ~100-300ms overhead (acceptable) |
| Library loading | tabtab caches for 5 minutes |
| Large libraries | Limit ID candidates to 100 |

### Caching

tabtab provides built-in result caching:
- Cache key: Full command line (e.g., `ref cite sm`)
- Cache TTL: 5 minutes
- Invalidation: Automatic after TTL

## Shell Setup

### Installation Location

| Shell | Configuration File |
|-------|-------------------|
| Bash | `~/.bashrc` or `~/.bash_profile` |
| Zsh | `~/.zshrc` |
| Fish | `~/.config/fish/config.fish` |

### Added Content

Single line is added to source the completion script:

```bash
# tabtab source for ref package
[ -f ~/.config/tabtab/ref.bash ] && source ~/.config/tabtab/ref.bash
```

### Interactive Install

When running `ref completion`, tabtab prompts:

```
? Where should tabtab write the shell completion file?
❯ ~/.bashrc
  ~/.bash_profile
  ~/.zshrc
  ~/.config/fish/config.fish
```

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Library not found | Return empty completions (no error) |
| Library read error | Return empty completions (no error) |
| tabtab install fails | Show error message, exit code 1 |
| Unsupported shell | tabtab handles gracefully |

Completion errors are silent to avoid disrupting the user's workflow.

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Empty library | No ID completions offered |
| Very long ID | Truncate display, complete full ID |
| Special characters in ID | Properly escaped by tabtab |
| Server mode | Load IDs via server if running |
| No config file | Use defaults, still complete commands |

## Configuration

No configuration needed. Shell completion uses the same config resolution as other commands.

## CLI Examples

```bash
# Install (interactive shell selection)
ref completion

# Tab completion examples after installation
ref <TAB>                    # Shows: list search add remove ...
ref list --<TAB>             # Shows: --json --sort --limit ...
ref list --sort <TAB>        # Shows: created updated published ...
ref cite <TAB>               # Shows: smith2023 jones2024 ...
ref cite smith<TAB>          # Shows: smith2023 smith2024-review
ref fulltext <TAB>           # Shows: attach get detach
ref fulltext get <TAB>       # Shows: (reference IDs)

# Uninstall
ref completion uninstall
```

## Related

- `spec/architecture/cli.md` - CLI command structure
- `spec/features/pagination.md` - Sort field names
- `spec/features/citation.md` - Citation styles
