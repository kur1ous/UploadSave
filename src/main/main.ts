import { app, BrowserWindow, dialog, ipcMain, nativeTheme, type OpenDialogOptions, type SaveDialogOptions } from "electron";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { ipcChannels } from "../shared/ipc";
import type { CollectionDetail, ExportInput, ImportInput, JobRecord, ThemeMode } from "../shared/types";
import { UploadSaveDb } from "./services/db";
import { ensureAppPaths } from "./services/paths";
import { StorageService } from "./services/storageService";

let mainWindow: BrowserWindow | null = null;
let db: UploadSaveDb;
let storageService: StorageService;
let themePrefPath = "";

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 680,
    backgroundColor: "#0f1115",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(__dirname, "../../dist/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function showOpenDialog(options: OpenDialogOptions) {
  return mainWindow ? dialog.showOpenDialog(mainWindow, options) : dialog.showOpenDialog(options);
}

function showSaveDialog(options: SaveDialogOptions) {
  return mainWindow ? dialog.showSaveDialog(mainWindow, options) : dialog.showSaveDialog(options);
}

function emitJobUpdated(job: JobRecord, window: BrowserWindow | null): void {
  if (window && !window.isDestroyed()) {
    window.webContents.send(ipcChannels.jobUpdated, job);
  }
}

function newJob(type: JobRecord["type"], collectionId: string, payloadJson: string | null = null): JobRecord {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    type,
    collectionId,
    status: "queued",
    message: null,
    progressCurrent: 0,
    progressTotal: 0,
    payloadJson,
    createdAt: now,
    updatedAt: now
  };
}

function ensureNonEmptyName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Collection name is required");
  }
  return trimmed;
}

async function loadThemePreference(): Promise<ThemeMode> {
  try {
    const raw = await fsp.readFile(themePrefPath, "utf8");
    const parsed = JSON.parse(raw) as { mode?: ThemeMode };
    if (parsed.mode === "light" || parsed.mode === "dark" || parsed.mode === "system") {
      return parsed.mode;
    }
  } catch {
    return "system";
  }

  return "system";
}

async function saveThemePreference(mode: ThemeMode): Promise<void> {
  await fsp.writeFile(themePrefPath, JSON.stringify({ mode }, null, 2), "utf8");
  nativeTheme.themeSource = mode;
}

app.whenReady().then(async () => {
  const appPaths = ensureAppPaths();
  db = new UploadSaveDb(appPaths.dbPath);
  storageService = new StorageService(db, appPaths.storageDir, appPaths.tempDir, emitJobUpdated);

  themePrefPath = path.join(appPaths.rootDir, "theme.json");
  nativeTheme.themeSource = await loadThemePreference();

  createWindow();

  ipcMain.handle(ipcChannels.createCollection, (_event, input: { name: string; description?: string }) => {
    const now = new Date().toISOString();
    const id = randomUUID();
    db.createCollection(id, ensureNonEmptyName(input.name), input.description, now);
    const created = db.getCollection(id);
    if (!created) {
      throw new Error("Failed to create collection");
    }
    return created;
  });

  ipcMain.handle(ipcChannels.listCollections, () => db.listCollections());

  ipcMain.handle(ipcChannels.getCollection, (_event, collectionId: string) => db.getCollection(collectionId));

  ipcMain.handle(
    ipcChannels.deleteCollection,
    async (_event, payload: { collectionId: string; deleteStoredFiles: boolean }) => {
      const items = db.deleteCollection(payload.collectionId);
      if (payload.deleteStoredFiles) {
        for (const item of items) {
          if (fs.existsSync(item.storagePath)) {
            await fsp.rm(item.storagePath, { force: true });
          }
        }
      }
    }
  );

  ipcMain.handle(
    ipcChannels.removeItems,
    async (_event, payload: { collectionId: string; itemIds: string[] }): Promise<CollectionDetail | null> => {
      const removed = db.removeItems(payload.collectionId, payload.itemIds, new Date().toISOString());
      for (const item of removed) {
        if (fs.existsSync(item.storagePath)) {
          await fsp.rm(item.storagePath, { force: true });
        }
      }
      return db.getCollection(payload.collectionId);
    }
  );

  ipcMain.handle(ipcChannels.listJobs, (): JobRecord[] => db.listJobs());

  ipcMain.handle(ipcChannels.pickImportPaths, async () => {
    const result = await showOpenDialog({
      title: "Select files or folders",
      properties: ["openFile", "openDirectory", "multiSelections"]
    });
    return result.canceled ? [] : result.filePaths;
  });

  ipcMain.handle(ipcChannels.pickImportFiles, async () => {
    const result = await showOpenDialog({
      title: "Select files",
      properties: ["openFile", "multiSelections"]
    });
    return result.canceled ? [] : result.filePaths;
  });

  ipcMain.handle(ipcChannels.pickImportFolders, async () => {
    const result = await showOpenDialog({
      title: "Select folders",
      properties: ["openDirectory", "multiSelections"]
    });
    return result.canceled ? [] : result.filePaths;
  });

  ipcMain.handle(ipcChannels.pickExportDestination, async (_event, mode: "folder" | "zip") => {
    if (mode === "folder") {
      const result = await showOpenDialog({
        title: "Select export folder",
        properties: ["openDirectory", "createDirectory"]
      });
      return result.canceled ? null : result.filePaths[0] ?? null;
    }

    const result = await showSaveDialog({
      title: "Save zip file",
      defaultPath: "collection.zip",
      filters: [{ name: "Zip", extensions: ["zip"] }]
    });
    return result.canceled ? null : result.filePath ?? null;
  });

  ipcMain.handle(ipcChannels.importIntoCollection, async (_event, input: ImportInput): Promise<JobRecord> => {
    const job = newJob("import", input.collectionId, JSON.stringify({ sourcePaths: input.sourcePaths }));
    db.createJob(job);
    emitJobUpdated(job, mainWindow);

    void storageService.importIntoCollection(input.collectionId, input.sourcePaths, job, mainWindow).catch((error: unknown) => {
      const now = new Date().toISOString();
      const failed: JobRecord = {
        ...job,
        status: "error",
        updatedAt: now,
        message: error instanceof Error ? error.message : "Import failed"
      };
      db.updateJob(failed.id, failed.status, failed.progressCurrent, failed.progressTotal, failed.message, failed.payloadJson, failed.updatedAt);
      emitJobUpdated(failed, mainWindow);
    });

    return job;
  });

  ipcMain.handle(ipcChannels.exportCollection, async (_event, input: ExportInput): Promise<JobRecord> => {
    const collection = db.getCollection(input.collectionId);
    if (!collection) {
      throw new Error("Collection not found");
    }

    const job = newJob("export", input.collectionId, JSON.stringify({ mode: input.mode, destinationPath: input.destinationPath }));
    db.createJob(job);
    emitJobUpdated(job, mainWindow);

    void storageService
      .exportCollection(input.collectionId, collection.items, input.mode, input.destinationPath, input.overwrite, job, mainWindow)
      .catch((error: unknown) => {
        const now = new Date().toISOString();
        const failed: JobRecord = {
          ...job,
          status: "error",
          updatedAt: now,
          message: error instanceof Error ? error.message : "Export failed"
        };
        db.updateJob(failed.id, failed.status, failed.progressCurrent, failed.progressTotal, failed.message, failed.payloadJson, failed.updatedAt);
        emitJobUpdated(failed, mainWindow);
      });

    return job;
  });

  ipcMain.handle("theme:get", async (): Promise<ThemeMode> => loadThemePreference());

  ipcMain.handle("theme:set", async (_event, mode: ThemeMode) => {
    if (mode !== "light" && mode !== "dark" && mode !== "system") {
      throw new Error("Invalid theme mode");
    }
    await saveThemePreference(mode);
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
