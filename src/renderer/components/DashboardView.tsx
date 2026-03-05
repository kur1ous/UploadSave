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

export function DashboardView({ collections, jobs, onOpenCollection, onCreateCollection, onDeleteCollection }: DashboardViewProps): JSX.Element {
  const recent = collections.slice(0, 6);

  return (
    <div className="dashboard-view fade-in">
      <section className="hero">
        <p className="eyebrow">Collection workspace</p>
        <h2>Build reusable upload kits once, export anytime.</h2>
      </section>

      <div className="dashboard-grid">
        <CreateCollectionCard onCreate={onCreateCollection} />

        <section className="collections-panel">
          <header>
            <h3>Recent collections</h3>
            <p>{collections.length} total</p>
          </header>

          {recent.length === 0 ? (
            <div className="status-card">Start by creating your first collection.</div>
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
