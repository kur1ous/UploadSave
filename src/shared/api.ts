import type {
  CollectionDetail,
  CollectionSummary,
  CreateCollectionInput,
  ExportInput,
  ImportInput,
  JobRecord,
  ThemeMode
} from "./types";

export interface UploadSaveApi {
  createCollection: (input: CreateCollectionInput) => Promise<CollectionSummary>;
  listCollections: () => Promise<CollectionSummary[]>;
  getCollection: (collectionId: string) => Promise<CollectionDetail | null>;
  deleteCollection: (collectionId: string, deleteStoredFiles: boolean) => Promise<void>;
  removeItems: (collectionId: string, itemIds: string[]) => Promise<CollectionDetail | null>;
  importIntoCollection: (input: ImportInput) => Promise<JobRecord>;
  exportCollection: (input: ExportInput) => Promise<JobRecord>;
  listJobs: () => Promise<JobRecord[]>;
  pickImportPaths: () => Promise<string[]>;
  pickImportFiles: () => Promise<string[]>;
  pickImportFolders: () => Promise<string[]>;
  pickExportDestination: (mode: "folder" | "zip") => Promise<string | null>;
  onJobUpdated: (listener: (job: JobRecord) => void) => () => void;
  getThemePreference: () => Promise<ThemeMode>;
  setThemePreference: (mode: ThemeMode) => Promise<void>;
}

declare global {
  interface Window {
    uploadSave: UploadSaveApi;
  }
}
