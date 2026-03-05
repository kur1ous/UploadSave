# Contributing to UploadSave

Thanks for contributing.

## Development Setup

1. Install dependencies:

```powershell
npm install
```

2. Start dev mode:

```powershell
npm run dev
```

3. Before opening a PR:

```powershell
npm run build
npm test
```

## Branch and PR Expectations

- Keep PRs focused on one feature/fix.
- Include a short summary of behavior changes.
- Include screenshots for UI changes.
- Mention any migration or data-impacting changes.

## Code Style

- TypeScript strict mode is enabled.
- Prefer clear, small components and typed IPC boundaries.
- Keep renderer code free of Node.js direct access; use preload API.
- Avoid introducing breaking storage/schema changes without migration.

## Testing Guidance

Add/update tests for:

- path safety and normalization logic
- selectors/filter/sort behavior
- any bugfixes with deterministic logic

## Electron + Native Module Notes

`better-sqlite3` is native. If Electron ABI changes, run:

```powershell
npm run rebuild
```

## Commit Message Guidance

Use short, action-oriented messages. Examples:

- `feat: add media-type filter to collection table`
- `fix: correct electron preload startup path`
- `docs: expand readme with setup and troubleshooting`
