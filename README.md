# UploadSave

UploadSave is a Windows-first Electron desktop app for organizing reusable bulk file uploads.

You can import files or folders once, keep them as snapshot copies, and export any collection again as either a normal folder tree or a zip archive.

## Why UploadSave

If you repeatedly upload the same assets (images, audio, docs, code, project folders), UploadSave removes the repeated manual re-selection step by keeping clean, reusable collections.

## Features

- Create named collections with optional descriptions
- Import both:
  - individual files (images, audio, video, docs, archives, code files)
  - full folders (recursive snapshot import)
- Automatic file type classification (`image`, `audio`, `video`, `document`, `archive`, `code`, `other`)
- Search/filter/sort files inside a collection
- Export collection as:
  - folder tree
  - zip archive
- Job activity panel for import/export progress and status
- Delete individual files or entire collections
- Styled in-app delete confirmation modal
- Light / dark / system theme support

## Tech Stack

- Electron (main + preload)
- React + Vite + TypeScript (renderer)
- SQLite (`better-sqlite3`) for metadata
- `archiver` for zip exports
- `electron-builder` for Windows packaging
- `vitest` for unit tests

## Project Status

- Target platform: Windows (v1)
- Local-only app (no cloud sync/auth)

## Quick Start

### 1) Prerequisites

- Node.js 20+
- npm 10+
- Windows (recommended for v1)

### 2) Install

```powershell
npm install
```

Note: `postinstall` automatically rebuilds native dependencies for Electron.

### 3) Run in development

```powershell
npm run dev
```

### 4) Build

```powershell
npm run build
```

### 5) Run built app locally

```powershell
npm start
```

## Packaging (Windows)

```powershell
npx electron-builder --win
```

Output will be in `release/`.

## Scripts

- `npm run dev` - run Vite + Electron + TS watch
- `npm run build` - build renderer and Electron TS output
- `npm start` - launch Electron from built output
- `npm test` - run unit tests once
- `npm run test:watch` - run tests in watch mode
- `npm run rebuild` - rebuild native modules for Electron ABI

## App Data Storage

UploadSave stores app data under:

- `%APPDATA%/UploadSave`

This includes:

- `uploadsave.db` (SQLite metadata)
- `storage/` (snapshot file copies)
- `temp/` (temporary export files)
- `theme.json` (UI theme preference)

## Usage

### Create and import

1. Create a collection.
2. Use either:
   - `Select Files` (for individual files)
   - `Select Folders` (for directory snapshots)
3. Imported files are copied into UploadSave-managed storage.

### Organize

- Filter by path/type text
- Filter by media type (images/audio/video/etc.)
- Sort by path, size, type, or imported time
- Remove selected files from a collection

### Export

1. Open a collection
2. Click `Export`
3. Choose mode (`folder` or `zip`)
4. Pick destination and overwrite behavior

### Delete collections

- From dashboard cards or collection header
- Confirmation modal allows optional deletion of stored snapshots

## Troubleshooting

### Blank window / preload bridge unavailable

- Run:

```powershell
npm run build
npm start
```

- If needed, kill stale Electron processes:

```powershell
taskkill /F /IM electron.exe
```

### App fails to start due to native module errors

- Rebuild native dependencies:

```powershell
npm run rebuild
```

- If still broken:

```powershell
Remove-Item -Recurse -Force node_modules, package-lock.json
npm install
```

### File picker only shows folders

Use `Select Files` instead of `Select Folders` in the collection import panel.

## Testing

```powershell
npm test
```

Current tests cover:

- path normalization and traversal safety
- selector logic (sorting/filtering/media filtering)

## Repository Docs

- Contributor guide: [CONTRIBUTING.md](./CONTRIBUTING.md)
- Architecture notes: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)

## License

No license file is included yet. Add a `LICENSE` file before open-source distribution.
