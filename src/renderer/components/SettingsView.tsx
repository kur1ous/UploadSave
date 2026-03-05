import type { ThemeMode } from "../../shared/types";

interface SettingsViewProps {
  themeMode: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
}

export function SettingsView({ themeMode, onThemeChange }: SettingsViewProps): JSX.Element {
  return (
    <div className="settings-view fade-in">
      <h2>Settings</h2>
      <section className="settings-card">
        <h3>Theme</h3>
        <p>Choose how UploadSave should look.</p>
        <select value={themeMode} onChange={(event) => onThemeChange(event.target.value as ThemeMode)}>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="system">System</option>
        </select>
      </section>
    </div>
  );
}
