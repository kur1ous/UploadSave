export type ExportMode = "folder" | "zip";
export type ThemeMode = "light" | "dark" | "system";
export type MediaType = "image" | "audio" | "video" | "document" | "archive" | "code" | "other";

export interface CollectionSummary {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
  totalSizeBytes: number;
}

export interface CollectionItem {
  id: string;
  collectionId: string;
  sourcePath: string;
  relativePath: string;
  storagePath: string;
  kind: "file";
  sizeBytes: number;
  extension: string;
  mediaType: MediaType;
  createdAt: string;
}

export interface CollectionDetail extends CollectionSummary {
  items: CollectionItem[];
}

export interface JobRecord {
  id: string;
  type: "import" | "export";
  collectionId: string;
  status: "queued" | "running" | "success" | "error" | "cancelled";
  message: string | null;
  progressCurrent: number;
  progressTotal: number;
  payloadJson: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCollectionInput {
  name: string;
  description?: string;
}

export interface ExportInput {
  collectionId: string;
  mode: ExportMode;
  destinationPath: string;
  overwrite: "skip" | "replace";
}

export interface ImportInput {
  collectionId: string;
  sourcePaths: string[];
}
