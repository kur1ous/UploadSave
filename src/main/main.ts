import { app, BrowserWindow, clipboard, dialog, ipcMain, nativeTheme, type OpenDialogOptions, type SaveDialogOptions } from "electron";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { ipcChannels } from "../shared/ipc";
import type {
  CollectionDetail,
  CollectionItem,
  CreateSmartCollectionInput,
  ExportInput,
  ImportInput,
  JobRecord,
  SmartCollectionDetail,
  SmartCollectionSummary,
  SmartExportPreset,
  SmartPresetInput,
  ThemeMode,
  UpdateSmartCollectionInput
} from "../shared/types";
import { UploadSaveDb } from "./services/db";
import { ensureAppPaths } from "./services/paths";
import { evaluateSmartRule } from "./services/ruleEngine";
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
    autoHideMenuBar: true,
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

  mainWindow.setMenuBarVisibility(false);

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
    throw new Error("Name is required");
  }
  return trimmed;
}

function ensureSmartExists(smartCollectionId: string): void {
  const row = db.getSmartCollectionRow(smartCollectionId);
  if (!row) {
    throw new Error("Smart collection not found");
  }
}

function resolveSmartItems(smartCollectionId: string): CollectionItem[] {
  const row = db.getSmartCollectionRow(smartCollectionId);
  if (!row) {
    throw new Error("Smart collection not found");
  }

  const allItems = db.listAllItems();
  return evaluateSmartRule(allItems, row.rule);
}

function hydrateSmartSummary(summary: SmartCollectionSummary): SmartCollectionSummary {
  const allItems = db.listAllItems();
  const matched = evaluateSmartRule(allItems, summary.rule);
  return {
    ...summary,
    matchedCount: matched.length
  };
}

function getSmartDetail(smartCollectionId: string): SmartCollectionDetail {
  const row = db.getSmartCollectionRow(smartCollectionId);
  if (!row) {
    throw new Error("Smart collection not found");
  }

  const matched = evaluateSmartRule(db.listAllItems(), row.rule);
  const presets = db.listSmartExportPresets(smartCollectionId);

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    rule: row.rule,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    matchedCount: matched.length,
    previewItems: matched.slice(0, 250),
    presets
  };
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

  const queueImportJob = (
    collectionId: string,
    sourcePaths: string[],
    payloadJson: string | null,
    onSettled?: () => Promise<void>
  ): JobRecord => {
    const job = newJob("import", collectionId, payloadJson);
    db.createJob(job);
    emitJobUpdated(job, mainWindow);

    void storageService
      .importIntoCollection(collectionId, sourcePaths, job, mainWindow)
      .catch((error: unknown) => {
        const now = new Date().toISOString();
        const failed: JobRecord = {
          ...job,
          status: "error",
          updatedAt: now,
          message: error instanceof Error ? error.message : "Import failed"
        };
        db.updateJob(failed.id, failed.status, failed.progressCurrent, failed.progressTotal, failed.message, failed.payloadJson, failed.updatedAt);
        emitJobUpdated(failed, mainWindow);
      })
      .finally(() => {
        if (onSettled) {
          void onSettled();
        }
      });

    return job;
  };

  const queueExportJob = (
    exportOwnerId: string,
    items: CollectionItem[],
    mode: "folder" | "zip",
    destinationPath: string,
    overwrite: "skip" | "replace",
    payloadJson: string | null
  ): JobRecord => {
    const job = newJob("export", exportOwnerId, payloadJson);
    db.createJob(job);
    emitJobUpdated(job, mainWindow);

    void storageService.exportCollection(exportOwnerId, items, mode, destinationPath, overwrite, job, mainWindow).catch((error: unknown) => {
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
  };

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

  ipcMain.handle(ipcChannels.deleteCollection, async (_event, payload: { collectionId: string; deleteStoredFiles: boolean }) => {
    const items = db.deleteCollection(payload.collectionId);
    if (payload.deleteStoredFiles) {
      for (const item of items) {
        if (fs.existsSync(item.storagePath)) {
          await fsp.rm(item.storagePath, { force: true });
        }
      }
    }
  });

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

  ipcMain.handle(ipcChannels.listTags, () => db.listTags());

  ipcMain.handle(ipcChannels.createTag, (_event, payload: { name: string }) => {
    const name = ensureNonEmptyName(payload.name);
    return db.createTag(randomUUID(), name, new Date().toISOString());
  });

  ipcMain.handle(ipcChannels.renameTag, (_event, payload: { id: string; name: string }) => {
    const name = ensureNonEmptyName(payload.name);
    return db.renameTag(payload.id, name);
  });

  ipcMain.handle(ipcChannels.deleteTag, (_event, payload: { id: string }) => {
    db.deleteTag(payload.id);
  });

  ipcMain.handle(ipcChannels.setItemTags, (_event, payload: { itemId: string; tagIds: string[] }) => {
    return db.setItemTags(payload.itemId, payload.tagIds);
  });

  ipcMain.handle(ipcChannels.createSmartCollection, (_event, input: CreateSmartCollectionInput) => {
    const now = new Date().toISOString();
    const id = randomUUID();
    db.createSmartCollection(id, ensureNonEmptyName(input.name), input.description, input.rule, now);
    return hydrateSmartSummary(db.listSmartCollections().find((item) => item.id === id) as SmartCollectionSummary);
  });

  ipcMain.handle(ipcChannels.updateSmartCollection, (_event, input: UpdateSmartCollectionInput) => {
    const now = new Date().toISOString();
    db.updateSmartCollection(input.id, ensureNonEmptyName(input.name), input.description, input.rule, now);
    return getSmartDetail(input.id);
  });

  ipcMain.handle(ipcChannels.deleteSmartCollection, (_event, payload: { id: string }) => {
    db.deleteSmartCollection(payload.id);
  });

  ipcMain.handle(ipcChannels.listSmartCollections, (): SmartCollectionSummary[] => {
    return db.listSmartCollections().map(hydrateSmartSummary);
  });

  ipcMain.handle(ipcChannels.getSmartCollection, (_event, payload: { id: string }): SmartCollectionDetail => {
    return getSmartDetail(payload.id);
  });

  ipcMain.handle(ipcChannels.resolveSmartCollectionItems, (_event, payload: { id: string }): CollectionItem[] => {
    return resolveSmartItems(payload.id);
  });

  ipcMain.handle(ipcChannels.saveSmartExportPreset, (_event, payload: { smartCollectionId: string; preset: SmartPresetInput }) => {
    ensureSmartExists(payload.smartCollectionId);
    const now = new Date().toISOString();
    const id = payload.preset.id ?? randomUUID();
    return db.saveSmartExportPreset(
      payload.smartCollectionId,
      id,
      ensureNonEmptyName(payload.preset.name),
      payload.preset.mode,
      payload.preset.destinationPath,
      payload.preset.overwrite,
      now
    );
  });

  ipcMain.handle(ipcChannels.runSmartExportPreset, (_event, payload: { smartCollectionId: string; presetId: string }): JobRecord => {
    const preset = db.getSmartPreset(payload.presetId);
    if (!preset) {
      throw new Error("Preset not found");
    }
    if (preset.smartCollectionId !== payload.smartCollectionId) {
      throw new Error("Preset does not belong to smart collection");
    }

    const items = resolveSmartItems(payload.smartCollectionId);
    const job = queueExportJob(
      payload.smartCollectionId,
      items,
      preset.mode,
      preset.destinationPath,
      preset.overwrite,
      JSON.stringify({ source: "smartPreset", presetId: payload.presetId })
    );

    db.touchSmartPresetLastRun(payload.presetId, new Date().toISOString());
    return job;
  });

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

  ipcMain.handle(ipcChannels.importFromClipboard, async (_event, payload: { collectionId: string }): Promise<JobRecord> => {
    const collection = db.getCollection(payload.collectionId);
    if (!collection) {
      throw new Error("Collection not found");
    }

    const image = clipboard.readImage();
    if (image.isEmpty()) {
      throw new Error("Clipboard does not contain an image to import.");
    }

    const tempName = `clipboard-${Date.now()}-${randomUUID()}.png`;
    const tempPath = path.join(appPaths.tempDir, tempName);
    await fsp.writeFile(tempPath, image.toPNG());

    const removeTempFile = async (): Promise<void> => {
      if (fs.existsSync(tempPath)) {
        await fsp.rm(tempPath, { force: true });
      }
    };

    return queueImportJob(payload.collectionId, [tempPath], JSON.stringify({ source: "clipboard-image" }), removeTempFile);
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
    return queueImportJob(input.collectionId, input.sourcePaths, JSON.stringify({ sourcePaths: input.sourcePaths }));
  });

  ipcMain.handle(ipcChannels.exportCollection, async (_event, input: ExportInput): Promise<JobRecord> => {
    const collection = db.getCollection(input.collectionId);
    if (!collection) {
      throw new Error("Collection not found");
    }

    return queueExportJob(
      input.collectionId,
      collection.items,
      input.mode,
      input.destinationPath,
      input.overwrite,
      JSON.stringify({ source: "collectionExport", collectionId: input.collectionId })
    );
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



