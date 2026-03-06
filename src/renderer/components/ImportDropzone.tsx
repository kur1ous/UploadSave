interface ImportDropzoneProps {
  onPickFiles: () => Promise<void>;
  onPickFolders: () => Promise<void>;
  onPasteClipboard: () => Promise<void>;
}

export function ImportDropzone({ onPickFiles, onPickFolders, onPasteClipboard }: ImportDropzoneProps): JSX.Element {
  return (
    <section className="import-dropzone">
      <h3>Import files or folders</h3>
      <p>Supports files, folders, and clipboard screenshots. Tip: press Ctrl+V to paste from clipboard.</p>
      <div className="row-inline">
        <button className="primary-button" type="button" onClick={() => void onPickFiles()}>
          Select Files
        </button>
        <button className="ghost-button" type="button" onClick={() => void onPickFolders()}>
          Select Folders
        </button>
        <button className="ghost-button" type="button" onClick={() => void onPasteClipboard()}>
          Paste Clipboard
        </button>
      </div>
    </section>
  );
}
