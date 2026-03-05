import type { ThemeMode } from "../../shared/types";

export function applyThemeMode(mode: ThemeMode): void {
  const root = document.documentElement;
  root.dataset.theme = mode;
}
