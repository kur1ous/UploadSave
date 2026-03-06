import type {
  CollectionDetail,
  CollectionItem,
  CollectionSummary,
  CreateCollectionInput,
  CreateSmartCollectionInput,
  ExportInput,
  ImportInput,
  JobRecord,
  SmartCollectionDetail,
  SmartCollectionSummary,
  SmartExportPreset,
  SmartPresetInput,
  TagRecord,
  ThemeMode,
  UpdateSmartCollectionInput
} from "./types";

export interface UploadSaveApi {
  createCollection: (input: CreateCollectionInput) => Promise<CollectionSummary>;
  listCollections: () => Promise<CollectionSummary[]>;
  getCollection: (collectionId: string) => Promise<CollectionDetail | null>;
  deleteCollection: (collectionId: string, deleteStoredFiles: boolean) => Promise<void>;
  removeItems: (collectionId: string, itemIds: string[]) => Promise<CollectionDetail | null>;

  createSmartCollection: (input: CreateSmartCollectionInput) => Promise<SmartCollectionSummary>;
  updateSmartCollection: (input: UpdateSmartCollectionInput) => Promise<SmartCollectionDetail>;
  deleteSmartCollection: (id: string) => Promise<void>;
  listSmartCollections: () => Promise<SmartCollectionSummary[]>;
  getSmartCollection: (id: string) => Promise<SmartCollectionDetail>;
  resolveSmartCollectionItems: (id: string) => Promise<CollectionItem[]>;

  listTags: () => Promise<TagRecord[]>;
  createTag: (name: string) => Promise<TagRecord>;
  renameTag: (id: string, name: string) => Promise<TagRecord | null>;
  deleteTag: (id: string) => Promise<void>;
  setItemTags: (itemId: string, tagIds: string[]) => Promise<string[]>;

  saveSmartExportPreset: (smartCollectionId: string, preset: SmartPresetInput) => Promise<SmartExportPreset>;
  runSmartExportPreset: (smartCollectionId: string, presetId: string) => Promise<JobRecord>;

  importIntoCollection: (input: ImportInput) => Promise<JobRecord>;
  importFromClipboard: (collectionId: string) => Promise<JobRecord>;
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
