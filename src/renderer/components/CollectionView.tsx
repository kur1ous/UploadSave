import { useEffect, useMemo, useState } from "react";
import type { CollectionDetail, JobRecord } from "../../shared/types";
import { FileTreeTable, toggleSort } from "./FileTreeTable";
import { ImportDropzone } from "./ImportDropzone";
import { ExportModal } from "./ExportModal";
import { JobQueuePanel } from "./JobQueuePanel";
import type { MediaFilter, SortState } from "../utils/collections";

interface CollectionViewProps {
  collection: CollectionDetail | null;
  jobs: JobRecord[];
  onReload: () => Promise<void>;
  onBack: () => void;
  onCollectionUpdated: () => void;
  onDeleteCollection: (collectionId: string, collectionName: string) => void;
}

function isTextInputFocused(): boolean {
  const active = document.activeElement as HTMLElement | null;
  if (!active) {
    return false;
  }

  const tag = active.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || active.isContentEditable;
}

export function CollectionView({ collection, jobs, onReload, onBack, onCollectionUpdated, onDeleteCollection }: CollectionViewProps): JSX.Element {
  const [filter, setFilter] = useState("");
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>("all");
  const [sort, setSort] = useState<SortState>({ field: "name", direction: "asc" });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [clipboardMessage, setClipboardMessage] = useState<string | null>(null);

  const collectionJobs = useMemo(() => {
    if (!collection) {
      return [];
    }
    return jobs.filter((job) => job.collectionId === collection.id);
  }, [jobs, collection]);

  const importFromClipboard = async (): Promise<void> => {
    if (!collection) {
      return;
    }

    try {
      await window.uploadSave.importFromClipboard(collection.id);
      setClipboardMessage("Clipboard image queued for import.");
      onCollectionUpdated();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Clipboard import failed.";
      setClipboardMessage(message);
    }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!collection) {
        return;
      }

      const isPaste = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v";
      if (!isPaste || isTextInputFocused()) {
        return;
      }

      event.preventDefault();
      void importFromClipboard();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [collection]);

  if (!collection) {
    return <div className="status-card">Collection not found.</div>;
  }

  return (
    <div className="collection-view fade-in">
      <header className="collection-header">
        <div>
          <button className="ghost-button" onClick={onBack} type="button">
            Back
          </button>
          <h2>{collection.name}</h2>
          <p>{collection.description ?? "No description"}</p>
        </div>
        <div className="row-inline">
          <button className="ghost-button" type="button" onClick={() => void onReload()}>
            Refresh
          </button>
          <button className="primary-button" type="button" onClick={() => setIsExportOpen(true)}>
            Export
          </button>
          <button className="danger-button" type="button" onClick={() => onDeleteCollection(collection.id, collection.name)}>
            Delete collection
          </button>
        </div>
      </header>

      <ImportDropzone
        onPickFiles={async () => {
          const sourcePaths = await window.uploadSave.pickImportFiles();
          if (sourcePaths.length === 0) {
            return;
          }
          await window.uploadSave.importIntoCollection({ collectionId: collection.id, sourcePaths });
          onCollectionUpdated();
        }}
        onPickFolders={async () => {
          const sourcePaths = await window.uploadSave.pickImportFolders();
          if (sourcePaths.length === 0) {
            return;
          }
          await window.uploadSave.importIntoCollection({ collectionId: collection.id, sourcePaths });
          onCollectionUpdated();
        }}
        onPasteClipboard={importFromClipboard}
      />

      {clipboardMessage ? <div className="status-card">{clipboardMessage}</div> : null}

      <section className="toolbar">
        <input
          className="text-input"
          placeholder="Filter by path, extension, or type"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />
        <select className="toolbar-select" value={mediaFilter} onChange={(event) => setMediaFilter(event.target.value as MediaFilter)}>
          <option value="all">All types</option>
          <option value="image">Images</option>
          <option value="audio">Audio</option>
          <option value="video">Video</option>
          <option value="document">Documents</option>
          <option value="archive">Archives</option>
          <option value="code">Code</option>
          <option value="other">Other</option>
        </select>
        <button
          className="ghost-button"
          type="button"
          disabled={selectedIds.size === 0}
          onClick={() => {
            void window.uploadSave.removeItems(collection.id, Array.from(selectedIds)).then((updated) => {
              setSelectedIds(new Set());
              if (updated) {
                onCollectionUpdated();
              }
            });
          }}
        >
          Remove selected ({selectedIds.size})
        </button>
      </section>

      <FileTreeTable
        items={collection.items}
        filter={filter}
        mediaFilter={mediaFilter}
        sort={sort}
        selectedIds={selectedIds}
        onToggleSort={(field) => setSort((current) => toggleSort(current, field))}
        onSelectItem={(itemId) => {
          setSelectedIds((current) => {
            const copy = new Set(current);
            if (copy.has(itemId)) {
              copy.delete(itemId);
            } else {
              copy.add(itemId);
            }
            return copy;
          });
        }}
      />

      <JobQueuePanel jobs={collectionJobs} />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        onExport={async (mode, destinationPath, overwrite) => {
          await window.uploadSave.exportCollection({
            collectionId: collection.id,
            mode,
            destinationPath,
            overwrite
          });
        }}
      />
    </div>
  );
}
