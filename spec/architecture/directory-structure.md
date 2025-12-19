# Directory Structure

## Project Layout

```
reference-manager/
├── spec/                          # Specifications
│
├── src/
│   ├── cli/                       # CLI-related
│   │   ├── index.ts               # CLI entry point
│   │   ├── commands/              # Command implementations
│   │   │   ├── add.ts             # Add reference
│   │   │   ├── search.ts          # Search
│   │   │   ├── list.ts            # List
│   │   │   ├── remove.ts          # Remove
│   │   │   ├── update.ts          # Update
│   │   │   └── server.ts          # Server management
│   │   └── output/                # Output formats
│   │       ├── json.ts
│   │       ├── bibtex.ts
│   │       └── pretty.ts
│   │
│   ├── server/                    # HTTP server
│   │   ├── index.ts               # Server entry point
│   │   ├── routes/                # API routes
│   │   │   ├── references.ts
│   │   │   └── health.ts
│   │   └── portfile.ts            # Portfile management
│   │
│   ├── core/                      # Core logic
│   │   ├── library.ts             # Library management
│   │   ├── library.test.ts        # Library tests
│   │   ├── reference.ts           # Reference entity
│   │   ├── reference.test.ts      # Reference tests
│   │   ├── csl-json/              # CSL-JSON processing
│   │   │   ├── parser.ts          # Parser
│   │   │   ├── parser.test.ts
│   │   │   ├── serializer.ts      # Serializer
│   │   │   ├── serializer.test.ts
│   │   │   ├── validator.ts       # Validation
│   │   │   ├── validator.test.ts
│   │   │   └── types.ts           # CSL-JSON type definitions
│   │   ├── identifier/            # Identifier-related
│   │   │   ├── generator.ts       # ID generation
│   │   │   ├── generator.test.ts
│   │   │   ├── uuid.ts            # UUID management
│   │   │   ├── normalize.ts       # Normalization
│   │   │   ├── normalize.test.ts
│   │   │   └── types.ts           # Identifier type definitions
│   │   └── index.ts               # Core module exports
│   │
│   ├── features/                  # Feature modules
│   │   ├── search/                # Search
│   │   │   ├── index.ts
│   │   │   ├── normalizer.ts      # Text normalization
│   │   │   ├── normalizer.test.ts
│   │   │   ├── tokenizer.ts       # Tokenization
│   │   │   ├── tokenizer.test.ts
│   │   │   ├── matcher.ts         # Matching logic
│   │   │   ├── matcher.test.ts
│   │   │   ├── sorter.ts          # Sorting
│   │   │   ├── sorter.test.ts
│   │   │   └── types.ts           # Search type definitions
│   │   ├── duplicate/             # Duplicate detection
│   │   │   ├── index.ts
│   │   │   ├── detector.ts
│   │   │   ├── detector.test.ts
│   │   │   └── types.ts           # Duplicate detection type definitions
│   │   ├── merge/                 # 3-way merge
│   │   │   ├── index.ts
│   │   │   ├── three-way.ts
│   │   │   ├── three-way.test.ts
│   │   │   └── types.ts           # Merge type definitions
│   │   └── file-watcher/          # File watching
│   │       ├── index.ts
│   │       ├── file-watcher.ts
│   │       ├── file-watcher.test.ts
│   │       └── types.ts           # File watcher type definitions
│   │
│   ├── config/                    # Configuration management
│   │   ├── index.ts
│   │   ├── loader.ts              # Config file loading
│   │   ├── loader.test.ts
│   │   ├── schema.ts              # Config schema
│   │   └── defaults.ts            # Default values
│   │
│   └── utils/                     # Utilities
│       ├── logger.ts              # Logging
│       ├── logger.test.ts
│       ├── file.ts                # File operations
│       ├── file.test.ts
│       ├── hash.ts                # Hashing
│       ├── hash.test.ts
│       ├── backup.ts              # Backup
│       └── backup.test.ts
│
├── tests/                         # Shared test resources
│   └── fixtures/                  # Test data
│       └── sample.csl.json
│
├── bin/                           # Executable files
│   └── reference-manager.js       # CLI entry point
│
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── biome.json                     # Linter/Formatter config
├── .github/
│   └── workflows/
│       └── ci.yml                 # GitHub Actions CI
├── README.md
└── LICENSE
```

## Directory Responsibilities

| Directory | Responsibility |
|-----------|----------------|
| `src/cli/` | commander-based CLI with per-command files |
| `src/server/` | Hono-based HTTP server with portfile management |
| `src/core/` | CSL-JSON operations, ID generation, core logic |
| `src/features/` | Feature modules: search, duplicate detection, merge |
| `src/config/` | Config resolution (env → current dir → user config) |
| `src/utils/` | Shared utilities: logging, file ops, hashing |
| `tests/fixtures/` | Shared test fixtures (sample CSL-JSON files) |
| `bin/` | CLI entry point for npm global install |

## Colocation Strategy

Tests and types are colocated with source files:

```
src/core/
├── library.ts
├── library.test.ts      # Unit test for library.ts
├── reference.ts
├── reference.test.ts    # Unit test for reference.ts
└── csl-json/
    ├── parser.ts
    ├── parser.test.ts
    ├── types.ts         # CSL-JSON type definitions
    └── ...
```

Benefits:
- Easy to find related tests and types
- Encourages test coverage for each module
- Simplifies imports in test files
- Types stay close to their implementation

## Module Boundaries

```
┌─────────────────────────────────────────────────────────┐
│                         CLI                             │
│  (commands/, output/)                                   │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                       Server                            │
│  (routes/, portfile)                                    │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                      Features                           │
│  (search/, duplicate/, merge/, file-watcher/)           │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                        Core                             │
│  (library, reference, csl-json/, identifier/)           │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                 Config / Utils                          │
└─────────────────────────────────────────────────────────┘
```

- Upper layers may depend on lower layers
- Lower layers must not depend on upper layers
- Types are colocated within each layer