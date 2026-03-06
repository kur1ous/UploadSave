import type { CollectionSummary, JobRecord } from "../../shared/types";
import { CollectionCard, CreateCollectionCard } from "./CollectionCard";
import { JobQueuePanel } from "./JobQueuePanel";

interface DashboardViewProps {
  collections: CollectionSummary[];
  jobs: JobRecord[];
  onOpenCollection: (collectionId: string) => void;
  onCreateCollection: (name: string, description: string) => Promise<void>;
  onDeleteCollection: (collection: CollectionSummary) => void;
}

interface MetricCard {
  label: string;
  value: number;
  accent: "emerald" | "cyan" | "amber" | "magenta";
  icon: JSX.Element;
}

function UploadIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" width="38" height="38">
      <path d="M12 4v10m0-10-4 4m4-4 4 4M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FolderIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1H3zM3 10h18l-1.5 8a2 2 0 0 1-2 1.6H6.5A2 2 0 0 1 4.6 18z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FileIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18">
      <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 3v5h5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowDownIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18">
      <path d="M12 4v13m0 0-4-4m4 4 4-4M5 20h14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowUpIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18">
      <path d="M12 20V7m0 0-4 4m4-4 4 4M5 4h14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MetricsRow({ cards }: { cards: MetricCard[] }): JSX.Element {
  return (
    <section className="metrics-grid">
      {cards.map((card) => (
        <article key={card.label} className="metric-card">
          <div className="metric-head">
            <p>{card.label}</p>
            <span className={`metric-icon metric-${card.accent}`}>{card.icon}</span>
          </div>
          <strong>{card.value}</strong>
        </article>
      ))}
    </section>
  );
}

export function DashboardView({ collections, jobs, onOpenCollection, onCreateCollection, onDeleteCollection }: DashboardViewProps): JSX.Element {
  const recent = collections.slice(0, 6);
  const totalFiles = collections.reduce((sum, collection) => sum + collection.itemCount, 0);
  const totalImports = jobs.filter((job) => job.type === "import").length;
  const totalExports = jobs.filter((job) => job.type === "export").length;

  const metricCards: MetricCard[] = [
    { label: "Collections", value: collections.length, accent: "emerald", icon: <FolderIcon /> },
    { label: "Total Files", value: totalFiles, accent: "cyan", icon: <FileIcon /> },
    { label: "Imports", value: totalImports, accent: "amber", icon: <ArrowDownIcon /> },
    { label: "Exports", value: totalExports, accent: "magenta", icon: <ArrowUpIcon /> }
  ];

  return (
    <div className="dashboard-view fade-in">
      <section className="hero">
        <div className="hero-content">
          <p className="hero-badge">Collection workspace</p>
          <h2>Build reusable upload kits once, export anytime.</h2>
          <p className="hero-subtitle">Organize your files into collections for quick bulk operations.</p>
        </div>
        <div className="hero-emblem" aria-hidden="true">
          <UploadIcon />
        </div>
      </section>

      <MetricsRow cards={metricCards} />

      <div className="dashboard-grid">
        <CreateCollectionCard onCreate={onCreateCollection} />

        <section className="collections-panel">
          <header className="panel-header">
            <h3>Recent collections</h3>
            <p>{collections.length} total</p>
          </header>

          {recent.length === 0 ? (
            <div className="empty-panel">
              <div className="empty-panel-icon" aria-hidden="true">
                <FolderIcon />
              </div>
              <strong>No collections yet</strong>
              <p>Start by creating your first collection.</p>
            </div>
          ) : (
            <div className="collection-card-grid">
              {recent.map((collection) => (
                <CollectionCard key={collection.id} collection={collection} onOpen={onOpenCollection} onDelete={onDeleteCollection} />
              ))}
            </div>
          )}
        </section>
      </div>

      <JobQueuePanel jobs={jobs} />
    </div>
  );
}
