export const ipcChannels = {
  createCollection: "collection:create",
  listCollections: "collection:list",
  getCollection: "collection:get",
  deleteCollection: "collection:delete",
  removeItems: "collection:removeItems",
  importIntoCollection: "collection:import",
  importFromClipboard: "collection:importFromClipboard",
  exportCollection: "collection:export",

  createSmartCollection: "smart:create",
  updateSmartCollection: "smart:update",
  deleteSmartCollection: "smart:delete",
  listSmartCollections: "smart:list",
  getSmartCollection: "smart:get",
  resolveSmartCollectionItems: "smart:resolve",

  listTags: "tag:list",
  createTag: "tag:create",
  renameTag: "tag:rename",
  deleteTag: "tag:delete",
  setItemTags: "tag:setItemTags",

  saveSmartExportPreset: "smartPreset:save",
  runSmartExportPreset: "smartPreset:run",

  listJobs: "job:list",
  pickImportPaths: "dialog:pickImportPaths",
  pickImportFiles: "dialog:pickImportFiles",
  pickImportFolders: "dialog:pickImportFolders",
  pickExportDestination: "dialog:pickExportDestination",
  jobUpdated: "job:updated"
} as const;
