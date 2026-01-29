# Working Guidelines

## Required First Step

**Before starting any work, read `spec/_index.md` first.**

## Workflow

Follow `spec/meta/development-process.md` for complete workflow:

1. Read `spec/_index.md` → identify relevant specs
2. Read `spec/meta/development-process.md` → understand workflow
3. Read necessary specs (always check `spec/core/`)
4. Check `spec/tasks/ROADMAP.md` → verify current phase and next steps
5. Follow TDD process (see `spec/guidelines/testing.md`)
6. Quality checks → ROADMAP update → commit → push

## Quick Reference

| Task | Reference |
|------|-----------|
| Development workflow | `spec/meta/development-process.md` |
| TDD process | `spec/guidelines/testing.md` |
| Spec directory guide | `spec/_index.md` |
| Current tasks | `spec/tasks/ROADMAP.md` |

## Notes

- Pre-release phase: breaking changes acceptable
- All specs written in English to minimize token usage
- Refer to relevant spec files when in doubt
- Read `package.json` as needed to check test commands, build scripts, CLI entry points, etc.
