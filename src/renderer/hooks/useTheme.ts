import { useEffect, useState } from "react";
import type { ThemeMode } from "../../shared/types";
import { applyThemeMode } from "../utils/theme";
import type { UploadSaveApi } from "../../shared/api";

function getApi(): UploadSaveApi | null {
  const maybeWindow = window as Window & { uploadSave?: UploadSaveApi };
  return maybeWindow.uploadSave ?? null;
}

export function useTheme(): {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
} {
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");

  useEffect(() => {
    const api = getApi();
    if (!api) {
      return;
    }

    void api.getThemePreference().then((mode) => {
      setThemeModeState(mode);
      applyThemeMode(mode);
    });
  }, []);

  const setThemeMode = (mode: ThemeMode): void => {
    setThemeModeState(mode);
    applyThemeMode(mode);

    const api = getApi();
    if (!api) {
      return;
    }

    void api.setThemePreference(mode);
  };

  return { themeMode, setThemeMode };
}
