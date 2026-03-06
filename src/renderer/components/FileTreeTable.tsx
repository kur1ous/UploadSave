import { useMemo } from "react";
import type { CollectionItem, TagRecord } from "../../shared/types";
import { selectVisibleItems, toggleSort, type MediaFilter, type SortState } from "../utils/collections";
import { formatBytes, formatDate } from "../utils/format";

interface FileTreeTableProps {
  items: CollectionItem[];
  filter: string;
  mediaFilter: MediaFilter;
  sort: SortState;
  selectedIds: Set<string>;
  tags: TagRecord[];
  onToggleSort: (field: SortState["field"]) => void;
  onSelectItem: (itemId: string) => void;
  onSetItemTags: (itemId: string, tagIds: string[]) => void;
}

const columns: Array<{ key: SortState["field"]; label: string }> = [
  { key: "name", label: "Path" },
  { key: "size", label: "Size" },
  { key: "type", label: "Type" },
  { key: "date", label: "Imported" }
];

export function FileTreeTable({
  items,
  filter,
  mediaFilter,
  sort,
  selectedIds,
  tags,
  onToggleSort,
  onSelectItem,
  onSetItemTags
}: FileTreeTableProps): JSX.Element {
  const visible = useMemo(() => selectVisibleItems(items, filter, sort, mediaFilter), [items, filter, sort, mediaFilter]);

  if (visible.length === 0) {
    return <div className="status-card">No files match this filter.</div>;
  }

  return (
    <div className="file-table-wrapper">
      <table className="file-table">
        <thead>
          <tr>
            <th>Select</th>
            {columns.map((column) => (
              <th key={column.key}>
                <button className="sort-button" type="button" onClick={() => onToggleSort(column.key)}>
                  {column.label}
                  {sort.field === column.key ? (sort.direction === "asc" ? " ^" : " v") : ""}
                </button>
              </th>
            ))}
            <th>Tags</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((item) => (
            <tr key={item.id}>
              <td>
                <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => onSelectItem(item.id)} />
              </td>
              <td>{item.relativePath}</td>
              <td>{formatBytes(item.sizeBytes)}</td>
              <td>
                <span className={`media-badge media-${item.mediaType}`}>{item.mediaType}</span>
                <span className="media-extension"> {item.extension || "-"}</span>
              </td>
              <td>{formatDate(item.createdAt)}</td>
              <td>
                {tags.length === 0 ? (
                  <span className="media-extension">No tags</span>
                ) : (
                  <select
                    className="tag-multi-select"
                    multiple
                    value={item.tagIds}
                    onChange={(event) => {
                      const selected = Array.from(event.currentTarget.selectedOptions).map((option) => option.value);
                      onSetItemTags(item.id, selected);
                    }}
                  >
                    {tags.map((tag) => (
                      <option key={tag.id} value={tag.id}>
                        {tag.name}
                      </option>
                    ))}
                  </select>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export { toggleSort };
