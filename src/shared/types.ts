export type ExportMode = "folder" | "zip";
export type ThemeMode = "light" | "dark" | "system";
export type MediaType = "image" | "audio" | "video" | "document" | "archive" | "code" | "other";

export type RuleConditionType =
  | "mediaType"
  | "tagIncludes"
  | "tagExcludes"
  | "pathContains"
  | "extensionIs"
  | "sizeRange"
  | "importedDateRange";

export interface SmartRuleCondition {
  id: string;
  type: RuleConditionType;
  mediaType?: MediaType;
  tagId?: string;
  textValue?: string;
  minBytes?: number;
  maxBytes?: number;
  fromDate?: string;
  toDate?: string;
}

export interface SmartRule {
  conditions: SmartRuleCondition[];
}

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
  tagIds: string[];
  createdAt: string;
}

export interface CollectionDetail extends CollectionSummary {
  items: CollectionItem[];
}

export interface TagRecord {
  id: string;
  name: string;
  createdAt: string;
}

export interface SmartCollectionSummary {
  id: string;
  name: string;
  description: string | null;
  rule: SmartRule;
  createdAt: string;
  updatedAt: string;
  matchedCount: number;
}

export interface SmartCollectionDetail extends SmartCollectionSummary {
  previewItems: CollectionItem[];
  presets: SmartExportPreset[];
}

export interface SmartExportPreset {
  id: string;
  smartCollectionId: string;
  name: string;
  mode: ExportMode;
  destinationPath: string;
  overwrite: "skip" | "replace";
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
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

export interface CreateSmartCollectionInput {
  name: string;
  description?: string;
  rule: SmartRule;
}

export interface UpdateSmartCollectionInput {
  id: string;
  name: string;
  description?: string;
  rule: SmartRule;
}

export interface ExportInput {
  collectionId: string;
  mode: ExportMode;
  destinationPath: string;
  overwrite: "skip" | "replace";
}

export interface SmartPresetInput {
  id?: string;
  name: string;
  mode: ExportMode;
  destinationPath: string;
  overwrite: "skip" | "replace";
}

export interface ImportInput {
  collectionId: string;
  sourcePaths: string[];
}
