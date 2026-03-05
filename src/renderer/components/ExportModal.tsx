import { useState } from "react";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (mode: "folder" | "zip", destinationPath: string, overwrite: "skip" | "replace") => Promise<void>;
}

export function ExportModal({ isOpen, onClose, onExport }: ExportModalProps): JSX.Element | null {
  const [mode, setMode] = useState<"folder" | "zip">("folder");
  const [destinationPath, setDestinationPath] = useState("");
  const [overwrite, setOverwrite] = useState<"skip" | "replace">("skip");
  const [isRunning, setIsRunning] = useState(false);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <header>
          <h3>Export collection</h3>
        </header>

        <label className="field-label">
          Mode
          <select value={mode} onChange={(event) => setMode(event.target.value as "folder" | "zip")}>
            <option value="folder">Folder tree</option>
            <option value="zip">Zip archive</option>
          </select>
        </label>

        <label className="field-label">
          Destination path
          <div className="row-inline">
            <input className="text-input" value={destinationPath} readOnly placeholder="Choose destination" />
            <button
              className="ghost-button"
              type="button"
              onClick={() => {
                void window.uploadSave.pickExportDestination(mode).then((picked) => {
                  if (picked) {
                    setDestinationPath(picked);
                  }
                });
              }}
            >
              Browse
            </button>
          </div>
        </label>

        <label className="field-label">
          Existing files
          <select value={overwrite} onChange={(event) => setOverwrite(event.target.value as "skip" | "replace") }>
            <option value="skip">Skip existing</option>
            <option value="replace">Replace existing</option>
          </select>
        </label>

        <footer className="modal-actions">
          <button className="ghost-button" type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="primary-button"
            disabled={!destinationPath || isRunning}
            type="button"
            onClick={() => {
              setIsRunning(true);
              void onExport(mode, destinationPath, overwrite)
                .then(() => onClose())
                .finally(() => setIsRunning(false));
            }}
          >
            {isRunning ? "Starting..." : "Start export"}
          </button>
        </footer>
      </div>
    </div>
  );
}
