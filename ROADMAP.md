# ROADMAP

This document tracks future development plans for reference-manager.

For completed features and changes, see [CHANGELOG.md](./CHANGELOG.md).

For detailed specifications, see [spec/](./spec/).

## Before Implementation

**Always read [`spec/meta/development-process.md`](./spec/meta/development-process.md) before starting any implementation work.**

This document defines the workflow including TDD process, quality checks, and commit guidelines.

## Completed Phases

- ✅ **Phase 1-5**: Core functionality, CLI commands, Server, Build & Distribution
- ✅ **Phase 6**: Citation Generation (cite command)
- ✅ **Phase 7**: Multi-Format Import (add command with BibTeX, RIS, DOI, PMID support)
- ✅ **Phase 8**: Operation Integration (unified operations pattern)
- ✅ **Phase 9**: Server Mode Performance Optimization (ExecutionContext pattern)
- ✅ **Phase 10**: Full-text Management (attach, get, detach commands)
- ✅ **Phase 11**: Search Enhancements (uppercase matching, author given name, tags)
- ✅ **Phase 12**: MCP Server (stdio server, ILibrary interface, ILibraryOperations pattern)

See [CHANGELOG.md](./CHANGELOG.md) for details on implemented features.

---

## Current Phase

### Phase 13: MCPB Publishing

Enable publishing to MCPB (MCP Bundles) registry alongside GitHub releases.

#### Overview

- Create MCPB manifest for Claude Desktop integration
- Automate `.mcpb` bundle creation in release workflow
- Submit to Anthropic's official extension registry

#### Implementation Steps

- [x] **Step 1: Create manifest.json**
  - Create `manifest.json` in project root (without version field)
  - Required fields: manifest_version, name, display_name, description, author, server
  - Configure `user_config` for config file path input
  - Set compatibility (platforms, Node.js runtime requirement)

- [ ] **Step 2: Update release workflow**
  - Add Node.js setup step
  - Add `npm ci` and `npm run build` steps
  - Add production dependencies installation (`npm ci --production`)
  - Install `@anthropic-ai/mcpb` CLI
  - Inject version from package.json into manifest.json
  - Run `mcpb pack` to create `.mcpb` bundle
  - Attach `.mcpb` file to GitHub release

- [ ] **Step 3: Local testing**
  - Build MCPB bundle locally: `npx @anthropic-ai/mcpb pack`
  - Test installation on Claude Desktop (macOS/Windows)
  - Verify MCP server starts correctly with user-provided config path
  - Test all MCP tools (add, search, cite, etc.)

- [ ] **Step 4: Documentation**
  - Add MCPB installation instructions to README
  - Document `user_config.config_path` requirement
  - Add troubleshooting section for common issues

- [ ] **Step 5: Registry submission (optional)**
  - Prepare icon.png (256x256)
  - Submit via [Anthropic extension form](https://docs.google.com/forms/d/14_Dmcig4z8NeRMB_e7TOyrKzuZ88-BLYdLvS6LPhiZU/edit)
  - Address review feedback if any

#### Technical Notes

| Item | Details |
|------|---------|
| Entry point | `bin/reference-manager.js mcp --config <path>` |
| Server type | `node` |
| User config | `config_path` (required string) |
| Platforms | darwin, win32, linux |
| Node.js | >=22.0.0 |

#### References

- [MCPB Specification](https://github.com/anthropics/dxt/blob/main/MANIFEST.md)
- [Desktop Extensions Guide](https://www.anthropic.com/engineering/desktop-extensions)

---

## Future Phases

### Phase 14: Citation Enhancements

Post-MVP enhancements for citation functionality:

- Clipboard support (`--clipboard`)
- Pandoc cite key generation (`--cite-key`)
- Custom sort order (`--sort <field>`)
- Group by field (`--group-by <field>`)
- Batch citation generation from file

### Phase 15: Advanced Features

Additional features beyond core functionality:

- Citation graph visualization
- Duplicate detection improvements
- Advanced search operators
- Tag management commands (add/remove tags)
- Note-taking integration
- LSP integration for text editors

---

## Contributing

When planning new features:

1. Create specification in `spec/features/`
2. Create ADR if architectural decision is needed in `spec/decisions/`
3. Add task to this ROADMAP
4. Follow TDD process (see `spec/guidelines/testing.md`)
5. Update CHANGELOG.md when complete
