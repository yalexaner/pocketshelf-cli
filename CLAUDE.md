# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun install              # Install dependencies
bun run index.ts         # Run CLI
bun run index.ts --help  # Show available commands
```

## Architecture

CLI tool for managing Pocketshelf iOS app backup files. Reads/writes a JSON backup file containing book library data.

### Data Flow

```
Backup JSON file → storage.ts (load/save with Zod validation) → commands/*.ts → stdout
```

### Key Design Decisions

- **Zod schemas use `.passthrough()`** to preserve unknown fields from the iOS app. Never remove this - it ensures forward compatibility when the app adds new fields.
- **Timestamps are Cocoa format** (seconds since Jan 1, 2001). Use `src/utils/date.ts` for conversions.
- **IDs are UUID v4**, displayed as 8-char prefix in CLI output.
- **Auto-backup**: `saveBackup()` creates a `.bak` file before every write operation.
- **File path resolution**: `--file` flag → `$BOOKSHELF_FILE` env var → `./file` default.

### Module Structure

- `src/types.ts` - Zod schemas and TypeScript types for Backup, Publication, ReadingSession
- `src/storage.ts` - File I/O with validation (loadBackup, saveBackup)
- `src/commands/` - CLI command implementations (list, show, add, edit, delete, stats, info)
- `src/utils/` - Helpers for date conversion, ID generation, input parsing, output formatting
- `index.ts` - Commander CLI setup and command registration
