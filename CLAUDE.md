# Working Guidelines

## Required First Step

### Always Check spec/_index.md

**Before starting any work on this project, always check `spec/_index.md` first.**

This file contains:
- Project overview
- Spec directory structure
- Content of each spec file
- Guidelines for when to read each spec

## Spec Reading Guidelines

| Directory | When to Read |
|-----------|--------------|
| `spec/core/` | **Always read** - Core specifications |
| `spec/architecture/` | When implementing CLI/server, configuring builds |
| `spec/features/` | When implementing/modifying specific features |
| `spec/guidelines/` | When writing tests, setting up CI, checking compatibility |

## Workflow

1. **Check spec/_index.md**
2. Read necessary specs (always check `spec/core/`)
3. **Check ROADMAP.md** - Verify current implementation phase and next steps
4. **Follow TDD process** (see `spec/guidelines/testing.md`):
   - Write tests first
   - Create empty implementation (`throw new Error("Not implemented")`)
   - Run tests to confirm failure: `npm test -- <test-file>`
   - Implement actual logic
   - Run tests to confirm success: `npm test -- <test-file>`
5. **Quality checks after each implementation step**:
   - Run type check: `npm run typecheck`
   - Run lint: `npm run lint`
   - Fix any issues found
   - Update ROADMAP.md with completion status
   - Commit changes with descriptive message

## Notes

- This project is a local reference manager using CSL-JSON files as single source of truth
- Always follow principles and rules in the specs
- Refer to relevant spec files when in doubt
