# Architecture Overview

This document describes the current UploadSave v1 architecture.

## High-Level Structure

- `src/main` - Electron main process + backend services
- `src/main/preload.ts` - secure bridge API exposed to renderer
- `src/renderer` - React UI
- `src/shared` - shared types and IPC channel constants

## Main Process Responsibilities

- Manage app window lifecycle
- Own all filesystem access (import/export/delete)
- Manage SQLite metadata through `UploadSaveDb`
- Run import/export jobs and emit progress events
- Handle native dialogs (file/folder pickers, export paths)

## Renderer Responsibilities

- Present collections, files, filters, and job state
- Trigger actions via `window.uploadSave` preload API
- Never directly access arbitrary filesystem paths

## Storage Model

App data directory: `%APPDATA%/UploadSave`

- `uploadsave.db` - metadata tables (`collections`, `items`, `jobs`)
- `storage/` - internal snapshot copies of imported files
- `temp/` - temporary export workspace

Each imported item stores:

- source path
- relative path inside collection
- storage path
- file size
- extension
- media type classification

## Import Flow

1. User selects files or folders in renderer.
2. Renderer calls `importIntoCollection` via preload API.
3. Main process discovers files recursively (for folders).
4. Files are copied to internal storage.
5. Metadata rows are inserted in SQLite.
6. Job progress is emitted over IPC.

## Export Flow

1. Renderer requests export mode (`folder` or `zip`) and destination.
2. Main process resolves safe relative paths.
3. Files are copied to destination folder OR streamed into zip.
4. Job progress/status is emitted over IPC.

## Safety Notes

- Path traversal protection in path join/normalization helpers
- Renderer sandboxed from privileged fs operations by design (through preload API)
- Deleting a collection can optionally delete stored snapshot files

## Future Extension Points

- Drag-and-drop import in renderer
- Thumbnail/preview support for images/audio
- Duplicate detection via content hashes
- Import presets and batch tagging
