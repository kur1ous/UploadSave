import type { CollectionItem, SmartRule } from "../../shared/types";

function normalizeExtension(value: string): string {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return "";
  }
  return trimmed.startsWith(".") ? trimmed : `.${trimmed}`;
}

export function evaluateSmartRule(items: CollectionItem[], rule: SmartRule): CollectionItem[] {
  const conditions = rule.conditions ?? [];
  if (conditions.length === 0) {
    return items;
  }

  return items.filter((item) => {
    return conditions.every((condition) => {
      switch (condition.type) {
        case "mediaType":
          return Boolean(condition.mediaType) && item.mediaType === condition.mediaType;

        case "tagIncludes": {
          const tagId = condition.tagId;
          if (!tagId) {
            return false;
          }
          return item.tagIds.includes(tagId);
        }

        case "tagExcludes": {
          const tagId = condition.tagId;
          if (!tagId) {
            return false;
          }
          return !item.tagIds.includes(tagId);
        }

        case "pathContains": {
          const needle = condition.textValue?.trim().toLowerCase() ?? "";
          return needle.length > 0 && item.relativePath.toLowerCase().includes(needle);
        }

        case "extensionIs": {
          const ext = normalizeExtension(condition.textValue ?? "");
          return ext.length > 0 && item.extension.toLowerCase() === ext;
        }

        case "sizeRange": {
          const min = Number.isFinite(condition.minBytes) ? (condition.minBytes as number) : undefined;
          const max = Number.isFinite(condition.maxBytes) ? (condition.maxBytes as number) : undefined;
          if (min === undefined && max === undefined) {
            return true;
          }
          if (min !== undefined && item.sizeBytes < min) {
            return false;
          }
          if (max !== undefined && item.sizeBytes > max) {
            return false;
          }
          return true;
        }

        case "importedDateRange": {
          const itemMs = new Date(item.createdAt).getTime();
          const fromMs = condition.fromDate ? new Date(condition.fromDate).getTime() : undefined;
          const toMs = condition.toDate ? new Date(condition.toDate).getTime() : undefined;
          if (fromMs !== undefined && !Number.isNaN(fromMs) && itemMs < fromMs) {
            return false;
          }
          if (toMs !== undefined && !Number.isNaN(toMs) && itemMs > toMs) {
            return false;
          }
          return true;
        }

        default:
          return true;
      }
    });
  });
}
