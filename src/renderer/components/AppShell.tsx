import type { CollectionSummary, SmartCollectionSummary, ThemeMode } from "../../shared/types";
import { SidebarCollections } from "./SidebarCollections";
import { ThemeToggle } from "./ThemeToggle";

interface AppShellProps {
  collections: CollectionSummary[];
  smartCollections: SmartCollectionSummary[];
  activeCollectionId: string | null;
  activeSmartCollectionId: string | null;
  onOpenDashboard: () => void;
  onOpenCollection: (collectionId: string) => void;
  onOpenSmartCollection: (smartCollectionId: string) => void;
  onCreateSmartCollection: () => void;
  onOpenSettings: () => void;
  themeMode: ThemeMode;
  onThemeModeChange: (mode: ThemeMode) => void;
  children: React.ReactNode;
}

export function AppShell({
  collections,
  smartCollections,
  activeCollectionId,
  activeSmartCollectionId,
  onOpenDashboard,
  onOpenCollection,
  onOpenSmartCollection,
  onCreateSmartCollection,
  onOpenSettings,
  themeMode,
  onThemeModeChange,
  children
}: AppShellProps): JSX.Element {
  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="brand-row">
          <div className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22">
              <path
                d="M12 3v12m0-12-4 4m4-4 4 4M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="brand-block">
            <h1>UploadSave</h1>
            <p>Reusable bulk file kits</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button className="sidebar-nav-item" type="button" onClick={onOpenDashboard}>
            Dashboard
          </button>
          <button className="sidebar-nav-item" type="button" onClick={onOpenSettings}>
            Settings
          </button>
        </nav>

        <section className="sidebar-section">
          <header className="sidebar-section-header">
            <h3>Collections</h3>
          </header>
          <SidebarCollections collections={collections} activeCollectionId={activeCollectionId} onOpenCollection={onOpenCollection} />
        </section>

        <section className="sidebar-section smart-sidebar">
          <div className="sidebar-section-header row-inline">
            <h3>Smart</h3>
            <button className="ghost-button" type="button" onClick={onCreateSmartCollection}>
              New
            </button>
          </div>

          {smartCollections.length === 0 ? (
            <div className="sidebar-empty">No smart collections yet</div>
          ) : (
            <ul className="sidebar-list">
              {smartCollections.map((smart) => (
                <li key={smart.id}>
                  <button
                    type="button"
                    className={`sidebar-item ${activeSmartCollectionId === smart.id ? "active" : ""}`}
                    onClick={() => onOpenSmartCollection(smart.id)}
                  >
                    <span className="sidebar-item-name">{smart.name}</span>
                    <span className="sidebar-item-meta">{smart.matchedCount} matches</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="sidebar-footer">
          <div className="quick-tip">
            <p className="quick-tip-label">Quick tip</p>
            <p>Create your first collection to get started.</p>
          </div>
          <ThemeToggle mode={themeMode} onChange={onThemeModeChange} />
        </div>
      </aside>

      <main className="app-main">{children}</main>
    </div>
  );
}
