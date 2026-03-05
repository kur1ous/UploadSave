interface DeleteCollectionModalProps {
  isOpen: boolean;
  collectionName: string;
  deleteSnapshots: boolean;
  isDeleting: boolean;
  onToggleSnapshots: (next: boolean) => void;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

export function DeleteCollectionModal({
  isOpen,
  collectionName,
  deleteSnapshots,
  isDeleting,
  onToggleSnapshots,
  onCancel,
  onConfirm
}: DeleteCollectionModalProps): JSX.Element | null {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card delete-modal">
        <header>
          <h3>Delete collection</h3>
          <p>
            You are deleting <strong>{collectionName}</strong>. This removes it from your workspace.
          </p>
        </header>

        <label className="delete-checkbox-row">
          <input type="checkbox" checked={deleteSnapshots} onChange={(event) => onToggleSnapshots(event.target.checked)} />
          <span>Also delete snapshot files from UploadSave storage</span>
        </label>

        <p className="delete-warning">This action cannot be undone.</p>

        <footer className="modal-actions">
          <button className="ghost-button" type="button" onClick={onCancel} disabled={isDeleting}>
            Cancel
          </button>
          <button
            className="danger-button"
            type="button"
            disabled={isDeleting}
            onClick={() => {
              void onConfirm();
            }}
          >
            {isDeleting ? "Deleting..." : "Delete collection"}
          </button>
        </footer>
      </div>
    </div>
  );
}
