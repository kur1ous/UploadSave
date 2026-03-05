import type { CollectionSummary } from "../../shared/types";
import { formatBytes } from "../utils/format";

interface SidebarCollectionsProps {
  collections: CollectionSummary[];
  activeCollectionId: string | null;
  onOpenCollection: (collectionId: string) => void;
}

export function SidebarCollections({ collections, activeCollectionId, onOpenCollection }: SidebarCollectionsProps): JSX.Element {
  if (collections.length === 0) {
    return <div className="sidebar-empty">No collections yet</div>;
  }

  return (
    <ul className="sidebar-list">
      {collections.map((collection) => (
        <li key={collection.id}>
          <button
            type="button"
            className={`sidebar-item ${activeCollectionId === collection.id ? "active" : ""}`}
            onClick={() => onOpenCollection(collection.id)}
          >
            <span className="sidebar-item-name">{collection.name}</span>
            <span className="sidebar-item-meta">
              {collection.itemCount} files - {formatBytes(collection.totalSizeBytes)}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
