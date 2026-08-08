# ADR-017: MCP Scope — Target Non-Terminal Hosts, Not CLI Parity

Date: 2026-08-08

## Status

Accepted

## Context

ADR-008 introduced the MCP stdio server to "enable AI agents to interact directly with reference management". At that time (2025-12), exposing a tool over MCP was the primary way to make it usable by an AI agent.

That premise no longer holds. The project now has four distinct agent-facing surfaces:

| Surface | Implementation | Coverage |
|---------|----------------|----------|
| CLI | `src/cli/` | 20 top-level commands (full feature set) |
| Agent Skills | `ref install skills` | `SKILL.md` + `references/{fulltext,manuscript-writing,systematic-review}.md` |
| MCP stdio | `src/mcp/tools/` | 13 tools |
| HTTP server | `src/server/routes/` | health, list, search, add, cite, check, references |

Shell-capable agents (Claude Code, Codex CLI, Cursor agent mode, Gemini CLI) can invoke the CLI directly, and Agent Skills give them the usage guidance to do it well. For those agents MCP adds nothing the CLI does not already provide, while costing a tool schema in every session's context.

Meanwhile the MCP surface has drifted out of alignment with the CLI in both directions:

- **Missing**: `update`, `edit`, `export`, `deprecate`, `duplicates`, `url`, `config`, and the entire `attach` family (Phase 25 attachments architecture).
- **Overweight**: 6 of 13 tools are `fulltext_*`. `src/mcp/tools/fulltext.ts` is 12.6 KB against ~17.8 KB for the other eight tool files combined.
- **Stale metadata**: `manifest.json` lists 8 tools while 13 are registered in `src/mcp/tools/index.ts`.

Treating this drift as a backlog to burn down implies CLI parity is the goal. Before accepting that cost we need to state who MCP actually serves.

### MCP client capabilities

Local stdio support is not uniform across MCP clients:

| Client | Local stdio | Notes |
|--------|-------------|-------|
| Claude Desktop | Yes | `.mcpb` one-click install; Node.js runtime is bundled with the app, so users need no local Node installation |
| ChatGPT web / mobile | No | Developer mode Connectors accept SSE and Streamable HTTP only — a public HTTPS endpoint is required |
| ChatGPT desktop | Yes | Via the Codex MCP config (`~/.codex/config.toml`), shared with Codex CLI and the Codex IDE extension |
| Cursor, VS Code, Zed, JetBrains | Yes | Shell-capable coding agents |

Two consequences follow.

First, every client that can launch a local stdio server — except Claude Desktop — is a shell-capable coding agent. The ChatGPT desktop path is the Codex agent's configuration, not a chat-only surface. Those clients belong to the CLI + Skills surface.

Second, ChatGPT web/mobile cannot reach a local library at all. Serving it would require a hosted HTTPS endpoint with authentication and remote library storage, which contradicts ADR-001 (CSL-JSON file as the single source of truth).

Claude Desktop is therefore the only client where MCP delivers something no other surface can: access for a user who never opens a terminal.

## Decision

**MCP does not target parity with the CLI. Its target user is a non-terminal researcher on Claude Desktop, and the tool surface is scoped to that user's workflow.**

### Target workflow

Search → inspect → cite → export a bibliography, plus adding by identifier (DOI/PMID/ISBN/arXiv) and reading attached full text. This is the manuscript-writing loop, matching `skill-templates/references/manuscript-writing.md`.

### Inclusion criteria

Expose an operation over MCP only if all of the following hold:

1. **It serves the manuscript-writing loop** above, or repairs a reference the agent encountered while serving it.
2. **It needs no TTY.** Interactive prompts and TUI flows (`edit`, `duplicates --fix`, interactive search) cannot cross the protocol.
3. **It needs no local filesystem path from the user.** A non-terminal user cannot supply one reliably.
4. **It is not bulk library maintenance.** Retroactive scans and configuration are operator tasks performed by someone who has a shell.

A write operation that would otherwise fail criterion 1 still qualifies when the agent can reach a dead end without it — that is, when the agent can detect a problem through MCP but cannot resolve it, forcing the user back to a terminal. `deprecate` is the motivating case (issue #115): the agent can identify a superseded reference but has no way to record the pointer.

### Applying the criteria

**In scope**: `search`, `list`, `show`, `cite`, `add`, `remove`, `check`, `export` (not yet implemented), `deprecate` (not yet implemented), full-text read.

**Out of scope**: generic `update` and `edit` (criterion 2 for `edit`; `update` is an unbounded write surface with no bounded use case in the target workflow), `duplicates` (criterion 4), `config` (criterion 4), `url` (criterion 1), `upgrade` and `install` (not library operations), the `attach` family with roles (criterion 3).

### Surface size

Prefer few tools with an `action` parameter over one tool per CLI subcommand. Every registered tool costs context in every Claude Desktop session, whether used or not. The six `fulltext_*` tools should be consolidated into one.

### Remote transport

Streamable HTTP transport for ChatGPT web and other remote-only clients is explicitly **not pursued**. Revisit only if hosted libraries become a project goal, which would require revisiting ADR-001 first.

## Rationale

1. **MCP's unique reach is narrow and identifiable.** Exactly one client class — non-terminal chat users on Claude Desktop — cannot be served by CLI + Skills. Scoping to it makes the surface small enough to keep current.
2. **Parity is a permanently losing race.** CLI features ship continuously; each one silently widens the gap and reads as neglect. A stated scope converts "lag" into a recorded decision.
3. **Skills already cover shell-capable agents better than MCP can.** They carry workflow guidance, cost nothing when unused, and never fall behind the CLI because they document commands rather than reimplement them.
4. **Context is a real budget.** Tool schemas are paid on every session. A surface sized to the actual workflow is cheaper for the user it serves.
5. **The marginal cost of an in-scope tool is low.** `ILibraryOperations` (ADR-009, ADR-010) and `src/features/operations/json-output.ts` mean a new tool is a thin adapter, so the criteria gate intent rather than effort.

## Consequences

### Positive

- The MCP tool list becomes a deliberate, defensible set instead of an incomplete mirror of the CLI.
- The `.mcpb` installation stays comprehensible to a non-developer: install, point at a config file, cite papers.
- Consolidating `fulltext_*` and dropping out-of-scope candidates reduces per-session context cost.
- Feature work gets a cheap, repeatable decision instead of a recurring debate.

### Negative

- Agents on MCP-only clients cannot perform library maintenance; those users must use the CLI.
- The CLI/MCP asymmetry must be documented, or it will be reported as a bug.
- ChatGPT web users are not served, and are not planned to be.

### Neutral

- Existing tools stay registered; this ADR does not remove `check` or the full-text tools, only reshapes how they are packaged.
- The HTTP server (ADR-005) remains a separate local-access mechanism, unaffected.

## Alternatives Considered

### Option A: Pursue full CLI parity

**Description**: Expose every CLI command as an MCP tool and keep them in step going forward.

**Pros**:
- No asymmetry to explain
- Any agent on any client can do anything

**Cons**:
- Tool count roughly doubles, and every Claude Desktop session pays for it
- Interactive commands (`edit`, `duplicates --fix`) cannot be ported faithfully and would need degraded variants
- Permanent maintenance tax on a surface whose unique audience does not need most of it

**Why rejected**: Spends the most effort on the capabilities the target user needs least.

### Option B: Deprecate MCP, invest only in CLI + Skills

**Description**: Freeze or remove the MCP server on the grounds that modern agents can drive the CLI.

**Pros**:
- One agent-facing surface to maintain
- No context cost anywhere

**Cons**:
- Abandons Claude Desktop entirely, the one place where no shell exists
- Discards the `.mcpb` distribution work (Phase 13)
- Non-developer researchers are a natural audience for a reference manager

**Why rejected**: Would cut off the only user segment MCP uniquely reaches.

### Option C: Add Streamable HTTP transport to reach ChatGPT web

**Description**: Serve MCP over HTTP from the existing Hono server so remote-only clients can connect.

**Pros**:
- Opens a large user base
- `src/server/` already exists as a foundation

**Cons**:
- Requires a publicly reachable endpoint, authentication, and hosted library storage
- Directly contradicts ADR-001
- Turns a local tool into an operated service

**Why rejected**: The scope change is a different product, not a transport addition.

## References

- ADR-001: CSL-JSON as Single Source of Truth
- ADR-008: MCP stdio Server
- ADR-010: MCP ILibraryOperations Pattern
- `spec/architecture/mcp-server.md`: Tool selection criteria
- Issue #115: MCP coverage of superseded references lags the CLI
- [Getting Started with Local MCP Servers on Claude Desktop](https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop)
- [Desktop Extensions — Anthropic Engineering](https://www.anthropic.com/engineering/desktop-extensions)
- [ChatGPT Developer mode](https://developers.openai.com/api/docs/guides/developer-mode)
- [Model Context Protocol — ChatGPT Learn](https://learn.chatgpt.com/docs/extend/mcp)
