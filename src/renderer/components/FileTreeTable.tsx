import { useMemo } from "react";
import type { CollectionItem } from "../../shared/types";
import { selectVisibleItems, toggleSort, type MediaFilter, type SortState } from "../utils/collections";
import { formatBytes, formatDate } from "../utils/format";

interface FileTreeTableProps {
  items: CollectionItem[];
  filter: string;
  mediaFilter: MediaFilter;
  sort: SortState;
  selectedIds: Set<string>;
  onToggleSort: (field: SortState["field"]) => void;
  onSelectItem: (itemId: string) => void;
}

const columns: Array<{ key: SortState["field"]; label: string }> = [
  { key: "name", label: "Path" },
  { key: "size", label: "Size" },
  { key: "type", label: "Type" },
  { key: "date", label: "Imported" }
];

export function FileTreeTable({ items, filter, mediaFilter, sort, selectedIds, onToggleSort, onSelectItem }: FileTreeTableProps): JSX.Element {
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export { toggleSort };
