# Working Guidelines

## Required First Step

### Always Check spec/_index.md

**Before starting any work on this project, always check `spec/_index.md` first.**

This file contains:
- Project overview
- Complete spec directory structure
- Content of each spec file
- Guidelines for when to read each spec
- Development workflow overview

## Spec Reading Guidelines

| Directory | When to Read |
|-----------|--------------|
| `spec/meta/` | **Always read first** - Development process & workflow |
| `spec/core/` | **Always read** - Core specifications |
| `spec/architecture/` | When implementing CLI/server, configuring builds |
| `spec/features/` | When implementing/modifying specific features |
| `spec/guidelines/` | When writing tests, setting up CI, checking compatibility |
| `spec/patterns/` | When implementing new code or refactoring |
| `spec/decisions/` | When understanding why certain technical choices were made |

## Workflow

1. **Read `spec/_index.md`**
2. **Read `spec/meta/development-process.md`** - Complete workflow from specification to implementation
3. Read necessary specs (always check `spec/core/`)
4. **Check ROADMAP.md** - Verify current implementation phase and next steps
5. **Follow TDD process** (see `spec/guidelines/testing.md`):
   - Write tests first
   - Create empty implementation (`throw new Error("Not implemented")`)
   - Run tests to confirm failure: `npm test -- <test-file>`
   - Implement actual logic
   - Run tests to confirm success: `npm test -- <test-file>`
6. **Quality checks after each implementation step**:
   - Run type check: `npm run typecheck`
   - Run lint: `npm run lint`
   - Fix any issues found
   - Update ROADMAP.md with completion status
   - Commit changes with descriptive message

## Notes

- This project is a local reference manager using CSL-JSON files as single source of truth
- All specs are written in English to minimize token usage
- Pre-release phase: breaking changes are acceptable, focus on clean final design
- Always follow principles and rules in the specs
- Refer to relevant spec files when in doubt
