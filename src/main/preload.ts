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

  createSmartCollection: (input) => ipcRenderer.invoke(ipcChannels.createSmartCollection, input),
  updateSmartCollection: (input) => ipcRenderer.invoke(ipcChannels.updateSmartCollection, input),
  deleteSmartCollection: (id) => ipcRenderer.invoke(ipcChannels.deleteSmartCollection, { id }),
  listSmartCollections: () => ipcRenderer.invoke(ipcChannels.listSmartCollections),
  getSmartCollection: (id) => ipcRenderer.invoke(ipcChannels.getSmartCollection, { id }),
  resolveSmartCollectionItems: (id) => ipcRenderer.invoke(ipcChannels.resolveSmartCollectionItems, { id }),

  listTags: () => ipcRenderer.invoke(ipcChannels.listTags),
  createTag: (name) => ipcRenderer.invoke(ipcChannels.createTag, { name }),
  renameTag: (id, name) => ipcRenderer.invoke(ipcChannels.renameTag, { id, name }),
  deleteTag: (id) => ipcRenderer.invoke(ipcChannels.deleteTag, { id }),
  setItemTags: (itemId, tagIds) => ipcRenderer.invoke(ipcChannels.setItemTags, { itemId, tagIds }),

  saveSmartExportPreset: (smartCollectionId, preset) => ipcRenderer.invoke(ipcChannels.saveSmartExportPreset, { smartCollectionId, preset }),
  runSmartExportPreset: (smartCollectionId, presetId) => ipcRenderer.invoke(ipcChannels.runSmartExportPreset, { smartCollectionId, presetId }),

  importIntoCollection: (input) => ipcRenderer.invoke(ipcChannels.importIntoCollection, input),
  importFromClipboard: (collectionId) => ipcRenderer.invoke(ipcChannels.importFromClipboard, { collectionId }),
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
