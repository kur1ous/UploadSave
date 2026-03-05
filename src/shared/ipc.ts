export const ipcChannels = {
  createCollection: "collection:create",
  listCollections: "collection:list",
  getCollection: "collection:get",
  deleteCollection: "collection:delete",
  removeItems: "collection:removeItems",
  importIntoCollection: "collection:import",
  exportCollection: "collection:export",
  listJobs: "job:list",
  pickImportPaths: "dialog:pickImportPaths",
  pickImportFiles: "dialog:pickImportFiles",
  pickImportFolders: "dialog:pickImportFolders",
  pickExportDestination: "dialog:pickExportDestination",
  jobUpdated: "job:updated"
} as const;
