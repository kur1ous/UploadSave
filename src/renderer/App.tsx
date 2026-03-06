import { useEffect, useMemo, useState } from "react";
import type {
  CollectionDetail,
  CollectionSummary,
  JobRecord,
  SmartCollectionDetail,
  SmartCollectionSummary,
  SmartPresetInput,
  SmartRule,
  TagRecord
} from "../shared/types";
import { AppShell } from "./components/AppShell";
import { DashboardView } from "./components/DashboardView";
import { CollectionView } from "./components/CollectionView";
import { SettingsView } from "./components/SettingsView";
import { SmartCollectionView } from "./components/SmartCollectionView";
import { useTheme } from "./hooks/useTheme";
import type { UploadSaveApi } from "../shared/api";
import { DeleteCollectionModal } from "./components/DeleteCollectionModal";

type Route =
  | { name: "dashboard" }
  | { name: "collection"; collectionId: string }
  | { name: "smartCollection"; smartCollectionId: string }
  | { name: "settings" };

interface PendingDelete {
  collectionId: string;
  collectionName: string;
}

function getApi(): UploadSaveApi | null {
  const maybeWindow = window as Window & { uploadSave?: UploadSaveApi };
  return maybeWindow.uploadSave ?? null;
}

export function App(): JSX.Element {
  const api = getApi();
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [smartCollections, setSmartCollections] = useState<SmartCollectionSummary[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<CollectionDetail | null>(null);
  const [selectedSmartCollection, setSelectedSmartCollection] = useState<SmartCollectionDetail | null>(null);
  const [tags, setTags] = useState<TagRecord[]>([]);
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [route, setRoute] = useState<Route>({ name: "dashboard" });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [deleteSnapshots, setDeleteSnapshots] = useState(false);
  const [isDeletingCollection, setIsDeletingCollection] = useState(false);
  const { themeMode, setThemeMode } = useTheme();

  if (!api) {
    return (
      <div className="status-card status-card-error" style={{ margin: 24 }}>
        Preload bridge is unavailable. Rebuild and restart with `npm run build` then `npm start`, or run `npm run dev`.
      </div>
    );
  }

  async function refreshCollections(): Promise<void> {
    setCollections(await api.listCollections());
  }

  async function refreshSmartCollections(): Promise<void> {
    setSmartCollections(await api.listSmartCollections());
  }

  async function refreshTags(): Promise<void> {
    setTags(await api.listTags());
  }

  async function refreshJobs(): Promise<void> {
    setJobs(await api.listJobs());
  }

  async function loadCollection(collectionId: string): Promise<void> {
    const detail = await api.getCollection(collectionId);
    setSelectedCollection(detail);
    if (detail) {
      setRoute({ name: "collection", collectionId: detail.id });
    }
  }

  async function loadSmartCollection(smartCollectionId: string): Promise<void> {
    const detail = await api.getSmartCollection(smartCollectionId);
    setSelectedSmartCollection(detail);
    setRoute({ name: "smartCollection", smartCollectionId });
  }

  function requestDeleteCollection(collectionId: string, collectionName: string): void {
    setPendingDelete({ collectionId, collectionName });
    setDeleteSnapshots(false);
  }

  useEffect(() => {
    const bootstrap = async (): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);
        await Promise.all([refreshCollections(), refreshSmartCollections(), refreshTags(), refreshJobs()]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load app state");
      } finally {
        setIsLoading(false);
      }
    };

    void bootstrap();
  }, []);

  useEffect(() => {
    const unsubscribe = api.onJobUpdated((job) => {
      setJobs((current) => {
        const existingIndex = current.findIndex((entry) => entry.id === job.id);
        if (existingIndex === -1) {
          return [job, ...current].slice(0, 50);
        }
        const copy = [...current];
        copy[existingIndex] = job;
        return copy;
      });

      if (route.name === "collection" && route.collectionId === job.collectionId && (job.status === "success" || job.status === "error")) {
        void loadCollection(route.collectionId);
        void refreshCollections();
        void refreshSmartCollections();
      }

      if (route.name === "smartCollection" && route.smartCollectionId === job.collectionId && (job.status === "success" || job.status === "error")) {
        void loadSmartCollection(route.smartCollectionId);
      }
    });

    return unsubscribe;
  }, [route]);

  const activeCollectionId = route.name === "collection" ? route.collectionId : null;
  const activeSmartCollectionId = route.name === "smartCollection" ? route.smartCollectionId : null;

  const content = useMemo(() => {
    if (isLoading) {
      return <div className="status-card">Loading workspace...</div>;
    }

    if (error) {
      return <div className="status-card status-card-error">{error}</div>;
    }

    if (route.name === "dashboard") {
      return (
        <DashboardView
          collections={collections}
          jobs={jobs}
          onOpenCollection={(collectionId) => {
            void loadCollection(collectionId);
          }}
          onCreateCollection={async (name, description) => {
            const created = await api.createCollection({ name, description });
            await refreshCollections();
            await loadCollection(created.id);
          }}
          onDeleteCollection={(collection) => requestDeleteCollection(collection.id, collection.name)}
        />
      );
    }

    if (route.name === "settings") {
      return <SettingsView themeMode={themeMode} onThemeChange={setThemeMode} />;
    }

    if (route.name === "smartCollection") {
      return (
        <SmartCollectionView
          smartCollection={selectedSmartCollection}
          jobs={jobs}
          tags={tags}
          onBack={() => setRoute({ name: "dashboard" })}
          onReload={() => loadSmartCollection(route.smartCollectionId)}
          onUpdateSmartCollection={async (id, name, description, rule) => {
            await api.updateSmartCollection({ id, name, description, rule });
            await refreshSmartCollections();
            await loadSmartCollection(id);
          }}
          onDeleteSmartCollection={async (id, name) => {
            const confirmed = window.confirm(`Delete smart collection \"${name}\"?`);
            if (!confirmed) {
              return;
            }
            await api.deleteSmartCollection(id);
            await refreshSmartCollections();
            setSelectedSmartCollection(null);
            setRoute({ name: "dashboard" });
          }}
          onSavePreset={async (smartCollectionId: string, preset: SmartPresetInput) => {
            await api.saveSmartExportPreset(smartCollectionId, preset);
            await loadSmartCollection(smartCollectionId);
          }}
          onRunPreset={async (smartCollectionId: string, presetId: string) => {
            await api.runSmartExportPreset(smartCollectionId, presetId);
            await refreshJobs();
          }}
        />
      );
    }

    return (
      <CollectionView
        collection={selectedCollection}
        jobs={jobs}
        tags={tags}
        onReload={() => loadCollection(route.collectionId)}
        onBack={() => setRoute({ name: "dashboard" })}
        onCollectionUpdated={() => {
          void refreshCollections();
          void refreshSmartCollections();
          void loadCollection(route.collectionId);
        }}
        onDeleteCollection={requestDeleteCollection}
        onCreateTag={async (name) => {
          await api.createTag(name);
          await refreshTags();
        }}
        onRenameTag={async (id, name) => {
          await api.renameTag(id, name);
          await refreshTags();
          if (route.name === "collection") {
            await loadCollection(route.collectionId);
          }
          if (route.name === "smartCollection") {
            await loadSmartCollection(route.smartCollectionId);
          }
        }}
        onDeleteTag={async (id) => {
          await api.deleteTag(id);
          await refreshTags();
          if (route.name === "collection") {
            await loadCollection(route.collectionId);
          }
          if (route.name === "smartCollection") {
            await loadSmartCollection(route.smartCollectionId);
          }
        }}
        onSetItemTags={async (itemId, tagIds) => {
          await api.setItemTags(itemId, tagIds);
        }}
      />
    );
  }, [collections, error, isLoading, jobs, route, selectedCollection, selectedSmartCollection, tags, themeMode, setThemeMode]);

  return (
    <>
      <AppShell
        collections={collections}
        smartCollections={smartCollections}
        activeCollectionId={activeCollectionId}
        activeSmartCollectionId={activeSmartCollectionId}
        onOpenDashboard={() => setRoute({ name: "dashboard" })}
        onOpenCollection={(collectionId) => {
          void loadCollection(collectionId);
        }}
        onOpenSmartCollection={(smartCollectionId) => {
          void loadSmartCollection(smartCollectionId);
        }}
        onCreateSmartCollection={() => {
          const nextName = `Smart Collection ${smartCollections.length + 1}`;

          void api
            .createSmartCollection({
              name: nextName,
              description: "",
              rule: { conditions: [] }
            })
            .then(async (created) => {
              await refreshSmartCollections();
              await loadSmartCollection(created.id);
            })
            .catch((error: unknown) => {
              setError(error instanceof Error ? error.message : "Failed to create smart collection");
            });
        }}
        onOpenSettings={() => setRoute({ name: "settings" })}
        themeMode={themeMode}
        onThemeModeChange={setThemeMode}
      >
        {content}
      </AppShell>

      <DeleteCollectionModal
        isOpen={pendingDelete !== null}
        collectionName={pendingDelete?.collectionName ?? ""}
        deleteSnapshots={deleteSnapshots}
        isDeleting={isDeletingCollection}
        onToggleSnapshots={setDeleteSnapshots}
        onCancel={() => {
          if (isDeletingCollection) {
            return;
          }
          setPendingDelete(null);
        }}
        onConfirm={async () => {
          if (!pendingDelete) {
            return;
          }

          setIsDeletingCollection(true);
          try {
            await api.deleteCollection(pendingDelete.collectionId, deleteSnapshots);
            await refreshCollections();
            await refreshSmartCollections();

            if (route.name === "collection" && route.collectionId === pendingDelete.collectionId) {
              setSelectedCollection(null);
              setRoute({ name: "dashboard" });
            }

            setPendingDelete(null);
          } finally {
            setIsDeletingCollection(false);
          }
        }}
      />
    </>
  );
}

