# ADR-011: Use tabtab for Shell Completion

Date: 2025-01-01

## Status

Accepted

## Context

The CLI tool would benefit from shell auto-completion to improve user productivity:
- Discover available subcommands without consulting documentation
- Recall option flags without memorizing them
- Complete reference IDs dynamically from the library

Requirements:
- Support Bash and Zsh (primary), Fish (nice-to-have)
- Dynamic completion: Load reference IDs from the library at completion time
- Minimal user setup burden
- No external binary dependencies for end users
- Integration with existing Commander.js-based CLI

## Decision

Use **tabtab** (v3.x) for shell completion.

Implementation:
- Add `completion` command to CLI (`ref completion [install|uninstall]`)
- Provide static completions for commands, options, and option values
- Provide dynamic completions for reference IDs by loading the library

## Rationale

1. **Dynamic completion support**: tabtab executes Node.js at completion time, enabling runtime data lookup (loading IDs from library)
2. **Battle-tested**: Used by npm, pnpm, and other major CLI tools
3. **No external dependencies for users**: Pure Node.js solution, no additional binaries required
4. **Simple integration**: Works alongside Commander.js without modification
5. **Multi-shell support**: Bash, Zsh, and Fish from single codebase
6. **Built-in caching**: 5-minute result cache reduces repeated library loads

## Consequences

### Positive

- Users can tab-complete reference IDs (e.g., `ref cite smi<TAB>` → `smith2023`)
- No need to memorize all command options
- Familiar completion experience matching other Node.js CLI tools
- Completion stays in sync with actual library contents

### Negative

- Node.js startup overhead (~100-300ms per completion)
- Additional npm dependency (`tabtab`)
- Users must run `ref completion` once to install

### Neutral

- Completion scripts are added to user's shell config files
- Cached completions may be slightly stale (5-minute TTL)

## Alternatives Considered

### Option A: commander-completion-carapace

**Description**: Commander.js plugin that generates Carapace spec files for shell completion

**Pros**:
- Native Commander.js integration
- Very fast completion (native binary, ~10ms)
- Supports many shells (Bash, Zsh, Fish, Nushell, PowerShell)

**Cons**:
- Requires users to install Carapace binary
- Static spec generation: Cannot load dynamic data (IDs) at completion time
- Relatively new library with smaller community

**Why rejected**: Cannot provide dynamic ID completion, which is a key requirement. Requiring users to install Carapace adds friction.

### Option B: commander-completion

**Description**: Classic bash/zsh completion library for Commander.js

**Pros**:
- Made for Commander.js
- Simple setup

**Cons**:
- Requires CoffeeScript
- Less actively maintained
- No dynamic completion support

**Why rejected**: CoffeeScript dependency is undesirable. No dynamic completion capability.

### Option C: Manual shell scripts

**Description**: Generate completion scripts manually for each shell

**Pros**:
- No npm dependencies
- Full control over completion behavior
- Can implement dynamic completion

**Cons**:
- Significant development effort for each shell
- Must maintain separate scripts for Bash, Zsh, Fish
- Complex shell scripting required
- Higher maintenance burden

**Why rejected**: Development and maintenance cost too high. tabtab provides equivalent functionality with less effort.

### Option D: No completion

**Description**: Do not implement shell completion

**Pros**:
- No additional code or dependencies
- No maintenance burden

**Cons**:
- Poor user experience
- Users must memorize or look up commands
- Cannot leverage dynamic ID completion

**Why rejected**: Shell completion significantly improves CLI usability, especially for reference ID completion.

## References

- tabtab GitHub: https://github.com/mklabs/tabtab
- pnpm tabtab fork: https://github.com/pnpm/tabtab
- Carapace: https://carapace.sh/
- Spec: `spec/features/shell-completion.md`
