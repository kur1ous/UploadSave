import type { CollectionItem, MediaType } from "../../shared/types";

export type SortField = "name" | "size" | "type" | "date";
export type SortDirection = "asc" | "desc";
export type MediaFilter = "all" | MediaType;

export interface SortState {
  field: SortField;
  direction: SortDirection;
}

export function selectVisibleItems(items: CollectionItem[], filter: string, sort: SortState, mediaFilter: MediaFilter = "all"): CollectionItem[] {
  const normalizedFilter = filter.trim().toLowerCase();
  const filtered = items.filter((item) => {
    const matchesText =
      !normalizedFilter ||
      item.relativePath.toLowerCase().includes(normalizedFilter) ||
      item.extension.toLowerCase().includes(normalizedFilter) ||
      item.mediaType.toLowerCase().includes(normalizedFilter);

    const matchesMedia = mediaFilter === "all" || item.mediaType === mediaFilter;

    return matchesText && matchesMedia;
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (sort.field) {
      case "size":
        return a.sizeBytes - b.sizeBytes;
      case "type":
        return a.extension.localeCompare(b.extension);
      case "date":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "name":
      default:
        return a.relativePath.localeCompare(b.relativePath);
    }
  });

  return sort.direction === "asc" ? sorted : sorted.reverse();
}

export function toggleSort(current: SortState, nextField: SortField): SortState {
  if (current.field !== nextField) {
    return { field: nextField, direction: "asc" };
  }

  return {
    field: nextField,
    direction: current.direction === "asc" ? "desc" : "asc"
  };
}
