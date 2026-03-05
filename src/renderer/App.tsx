import { useEffect, useMemo, useState } from "react";
import type { CollectionDetail, CollectionSummary, JobRecord } from "../shared/types";
import { AppShell } from "./components/AppShell";
import { DashboardView } from "./components/DashboardView";
import { CollectionView } from "./components/CollectionView";
import { SettingsView } from "./components/SettingsView";
import { useTheme } from "./hooks/useTheme";
import type { UploadSaveApi } from "../shared/api";
import { DeleteCollectionModal } from "./components/DeleteCollectionModal";

type Route =
  | { name: "dashboard" }
  | { name: "collection"; collectionId: string }
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
  const [selectedCollection, setSelectedCollection] = useState<CollectionDetail | null>(null);
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
    const next = await api.listCollections();
    setCollections(next);
  }

  async function refreshJobs(): Promise<void> {
    const next = await api.listJobs();
    setJobs(next);
  }

  async function loadCollection(collectionId: string): Promise<void> {
    const detail = await api.getCollection(collectionId);
    setSelectedCollection(detail);
    if (detail) {
      setRoute({ name: "collection", collectionId: detail.id });
    }
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
        await Promise.all([refreshCollections(), refreshJobs()]);
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
      }
    });

    return unsubscribe;
  }, [route]);

  const activeCollectionId = route.name === "collection" ? route.collectionId : null;

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

    return (
      <CollectionView
        collection={selectedCollection}
        jobs={jobs}
        onReload={() => loadCollection(route.collectionId)}
        onBack={() => setRoute({ name: "dashboard" })}
        onCollectionUpdated={() => {
          void refreshCollections();
          void loadCollection(route.collectionId);
        }}
        onDeleteCollection={requestDeleteCollection}
      />
    );
  }, [collections, error, isLoading, jobs, route, selectedCollection, themeMode, setThemeMode]);

  return (
    <>
      <AppShell
        collections={collections}
        activeCollectionId={activeCollectionId}
        onOpenDashboard={() => setRoute({ name: "dashboard" })}
        onOpenCollection={(collectionId) => {
          void loadCollection(collectionId);
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
