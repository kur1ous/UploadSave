import { useState } from "react";
import type { CollectionSummary } from "../../shared/types";
import { formatBytes } from "../utils/format";

interface CollectionCardProps {
  collection: CollectionSummary;
  onOpen: (collectionId: string) => void;
  onDelete: (collection: CollectionSummary) => void;
}

export function CollectionCard({ collection, onOpen, onDelete }: CollectionCardProps): JSX.Element {
  return (
    <div className="collection-card">
      <button className="collection-card-open" type="button" onClick={() => onOpen(collection.id)}>
        <div className="collection-card-header">
          <h3>{collection.name}</h3>
          <span>{collection.itemCount} files</span>
        </div>
        <p>{collection.description ?? "No description"}</p>
        <div className="collection-card-footer">
          <span>{formatBytes(collection.totalSizeBytes)}</span>
          <span>{new Date(collection.updatedAt).toLocaleDateString()}</span>
        </div>
      </button>

      <button className="danger-button" type="button" onClick={() => onDelete(collection)}>
        Delete
      </button>
    </div>
  );
}

interface CreateCollectionCardProps {
  onCreate: (name: string, description: string) => Promise<void>;
}

export function CreateCollectionCard({ onCreate }: CreateCollectionCardProps): JSX.Element {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <form
      className="create-collection-card"
      onSubmit={(event) => {
        event.preventDefault();
        if (!name.trim()) {
          return;
        }
        setIsSubmitting(true);
        void onCreate(name.trim(), description.trim())
          .then(() => {
            setName("");
            setDescription("");
          })
          .finally(() => setIsSubmitting(false));
      }}
    >
      <h3>Create collection</h3>
      <input
        className="text-input"
        placeholder="Collection name"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <textarea
        className="text-input"
        placeholder="Description (optional)"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
      />
      <button className="primary-button" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Creating..." : "Create"}
      </button>
    </form>
  );
}
