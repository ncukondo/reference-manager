# Suggested Commands

## Development
```bash
npm run dev          # Start Vite dev server
npm run build        # Build (vite build + tsc declarations)
```

## Testing
```bash
npm test             # Run unit tests (non-watch, default)
npm run test:unit    # Run unit tests
npm run test:e2e     # Run e2e tests
npm run test:all     # Run all tests
npm run test:watch   # Watch mode for development
npm test -- <pattern> # Run specific test file
```

## Quality Checks
```bash
npm run typecheck    # TypeScript type checking
npm run lint         # Biome linting
npm run lint:fix     # Fix lint issues
npm run format       # Format code with Biome
```

## Running CLI
```bash
node bin/reference-manager.js <command>
# or after npm link:
ref <command>
reference-manager <command>
```
