interface ImportDropzoneProps {
  onPickFiles: () => Promise<void>;
  onPickFolders: () => Promise<void>;
}

export function ImportDropzone({ onPickFiles, onPickFolders }: ImportDropzoneProps): JSX.Element {
  return (
    <section className="import-dropzone">
      <h3>Import files or folders</h3>
      <p>Supports individual files like images, audio, video, docs, and full folders as snapshots.</p>
      <div className="row-inline">
        <button className="primary-button" type="button" onClick={() => void onPickFiles()}>
          Select Files
        </button>
        <button className="ghost-button" type="button" onClick={() => void onPickFolders()}>
          Select Folders
        </button>
      </div>
    </section>
  );
}
