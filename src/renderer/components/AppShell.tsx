import type { CollectionSummary, ThemeMode } from "../../shared/types";
import { SidebarCollections } from "./SidebarCollections";
import { ThemeToggle } from "./ThemeToggle";

interface AppShellProps {
  collections: CollectionSummary[];
  activeCollectionId: string | null;
  onOpenDashboard: () => void;
  onOpenCollection: (collectionId: string) => void;
  onOpenSettings: () => void;
  themeMode: ThemeMode;
  onThemeModeChange: (mode: ThemeMode) => void;
  children: React.ReactNode;
}

export function AppShell({
  collections,
  activeCollectionId,
  onOpenDashboard,
  onOpenCollection,
  onOpenSettings,
  themeMode,
  onThemeModeChange,
  children
}: AppShellProps): JSX.Element {
  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="brand-block">
          <h1>UploadSave</h1>
          <p>Reusable bulk file kits</p>
        </div>

        <div className="sidebar-controls">
          <button className="primary-button" type="button" onClick={onOpenDashboard}>
            Dashboard
          </button>
          <button className="ghost-button" type="button" onClick={onOpenSettings}>
            Settings
          </button>
        </div>

        <SidebarCollections
          collections={collections}
          activeCollectionId={activeCollectionId}
          onOpenCollection={onOpenCollection}
        />

        <div className="sidebar-footer">
          <ThemeToggle mode={themeMode} onChange={onThemeModeChange} />
        </div>
      </aside>

      <main className="app-main">{children}</main>
    </div>
  );
}
