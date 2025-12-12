# Build System & Module System

## Language & Build

- Development language: TypeScript
- Runtime language: JavaScript
- Build tool: **Vite**
- TypeScript is not used at runtime (`ts-node`, `tsx` not included)

## Module Format

- ESM only
- `package.json` uses:
  ```json
  { "type": "module" }
  ```
