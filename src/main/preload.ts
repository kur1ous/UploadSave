import { contextBridge, ipcRenderer } from "electron";
import { ipcChannels } from "../shared/ipc";
import type { UploadSaveApi } from "../shared/api";
import type { JobRecord, ThemeMode } from "../shared/types";

const api: UploadSaveApi = {
  createCollection: (input) => ipcRenderer.invoke(ipcChannels.createCollection, input),
  listCollections: () => ipcRenderer.invoke(ipcChannels.listCollections),
  getCollection: (collectionId) => ipcRenderer.invoke(ipcChannels.getCollection, collectionId),
  deleteCollection: (collectionId, deleteStoredFiles) =>
    ipcRenderer.invoke(ipcChannels.deleteCollection, { collectionId, deleteStoredFiles }),
  removeItems: (collectionId, itemIds) => ipcRenderer.invoke(ipcChannels.removeItems, { collectionId, itemIds }),
  importIntoCollection: (input) => ipcRenderer.invoke(ipcChannels.importIntoCollection, input),
  exportCollection: (input) => ipcRenderer.invoke(ipcChannels.exportCollection, input),
  listJobs: () => ipcRenderer.invoke(ipcChannels.listJobs),
  pickImportPaths: () => ipcRenderer.invoke(ipcChannels.pickImportPaths),
  pickImportFiles: () => ipcRenderer.invoke(ipcChannels.pickImportFiles),
  pickImportFolders: () => ipcRenderer.invoke(ipcChannels.pickImportFolders),
  pickExportDestination: (mode) => ipcRenderer.invoke(ipcChannels.pickExportDestination, mode),
  onJobUpdated: (listener) => {
    const wrapped = (_event: Electron.IpcRendererEvent, payload: JobRecord) => listener(payload);
    ipcRenderer.on(ipcChannels.jobUpdated, wrapped);
    return () => ipcRenderer.removeListener(ipcChannels.jobUpdated, wrapped);
  },
  getThemePreference: () => ipcRenderer.invoke("theme:get") as Promise<ThemeMode>,
  setThemePreference: (mode) => ipcRenderer.invoke("theme:set", mode)
};

contextBridge.exposeInMainWorld("uploadSave", api);
