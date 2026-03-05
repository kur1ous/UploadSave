import type { ThemeMode } from "../../shared/types";

interface ThemeToggleProps {
  mode: ThemeMode;
  onChange: (mode: ThemeMode) => void;
}

const options: ThemeMode[] = ["light", "dark", "system"];

export function ThemeToggle({ mode, onChange }: ThemeToggleProps): JSX.Element {
  return (
    <div className="theme-toggle" role="group" aria-label="Theme mode">
      {options.map((option) => (
        <button
          key={option}
          className={`theme-toggle-button ${mode === option ? "active" : ""}`}
          onClick={() => onChange(option)}
          type="button"
        >
          {option}
        </button>
      ))}
    </div>
  );
}
