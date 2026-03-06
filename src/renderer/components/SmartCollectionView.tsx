import { useEffect, useMemo, useState } from "react";
import type {
  CollectionItem,
  JobRecord,
  MediaType,
  SmartCollectionDetail,
  SmartExportPreset,
  SmartPresetInput,
  SmartRule,
  SmartRuleCondition,
  TagRecord
} from "../../shared/types";
import { formatBytes, formatDate } from "../utils/format";

interface SmartCollectionViewProps {
  smartCollection: SmartCollectionDetail | null;
  jobs: JobRecord[];
  tags: TagRecord[];
  onBack: () => void;
  onReload: () => Promise<void>;
  onUpdateSmartCollection: (id: string, name: string, description: string, rule: SmartRule) => Promise<void>;
  onDeleteSmartCollection: (id: string, name: string) => Promise<void>;
  onSavePreset: (smartCollectionId: string, preset: SmartPresetInput) => Promise<void>;
  onRunPreset: (smartCollectionId: string, presetId: string) => Promise<void>;
}

function blankCondition(): SmartRuleCondition {
  return {
    id: crypto.randomUUID(),
    type: "mediaType",
    mediaType: "image"
  };
}

function mediaOptions(): MediaType[] {
  return ["image", "audio", "video", "document", "archive", "code", "other"];
}

function PreviewTable({ items }: { items: CollectionItem[] }): JSX.Element {
  if (items.length === 0) {
    return <div className="status-card">No matching files yet.</div>;
  }

  return (
    <div className="file-table-wrapper">
      <table className="file-table">
        <thead>
          <tr>
            <th>Path</th>
            <th>Type</th>
            <th>Size</th>
            <th>Imported</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.relativePath}</td>
              <td>
                <span className={`media-badge media-${item.mediaType}`}>{item.mediaType}</span>
                <span className="media-extension"> {item.extension}</span>
              </td>
              <td>{formatBytes(item.sizeBytes)}</td>
              <td>{formatDate(item.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SmartCollectionView({
  smartCollection,
  jobs,
  tags,
  onBack,
  onReload,
  onUpdateSmartCollection,
  onDeleteSmartCollection,
  onSavePreset,
  onRunPreset
}: SmartCollectionViewProps): JSX.Element {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [conditions, setConditions] = useState<SmartRuleCondition[]>([]);
  const [presetName, setPresetName] = useState("Quick Export");
  const [presetMode, setPresetMode] = useState<"folder" | "zip">("zip");
  const [presetDestination, setPresetDestination] = useState("");
  const [presetOverwrite, setPresetOverwrite] = useState<"skip" | "replace">("skip");

  useEffect(() => {
    if (!smartCollection) {
      return;
    }

    setName(smartCollection.name);
    setDescription(smartCollection.description ?? "");
    setConditions(smartCollection.rule.conditions ?? []);
  }, [smartCollection]);

  const smartJobs = useMemo(() => {
    if (!smartCollection) {
      return [];
    }
    return jobs.filter((job) => job.collectionId === smartCollection.id).slice(0, 8);
  }, [jobs, smartCollection]);

  if (!smartCollection) {
    return <div className="status-card">Smart collection not found.</div>;
  }

  const currentRule: SmartRule = { conditions };

  return (
    <div className="collection-view fade-in">
      <header className="collection-header">
        <div>
          <button className="ghost-button" onClick={onBack} type="button">
            Back
          </button>
          <h2>Smart: {smartCollection.name}</h2>
          <p>Matched items: {smartCollection.matchedCount}</p>
        </div>
        <div className="row-inline">
          <button className="ghost-button" type="button" onClick={() => void onReload()}>
            Refresh
          </button>
          <button className="primary-button" type="button" onClick={() => void onUpdateSmartCollection(smartCollection.id, name, description, currentRule)}>
            Save Rules
          </button>
          <button className="danger-button" type="button" onClick={() => void onDeleteSmartCollection(smartCollection.id, smartCollection.name)}>
            Delete Smart
          </button>
        </div>
      </header>

      <section className="tag-editor">
        <h3>Definition</h3>
        <input className="text-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Smart collection name" />
        <textarea className="text-input" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Description" />
      </section>

      <section className="tag-editor">
        <h3>Rule Builder (AND conditions)</h3>
        <div className="rule-list">
          {conditions.map((condition, index) => (
            <div key={condition.id} className="rule-row">
              <select
                className="toolbar-select"
                value={condition.type}
                onChange={(event) => {
                  const nextType = event.target.value as SmartRuleCondition["type"];
                  setConditions((current) => {
                    const copy = [...current];
                    copy[index] = { id: condition.id, type: nextType };
                    return copy;
                  });
                }}
              >
                <option value="mediaType">Media Type</option>
                <option value="tagIncludes">Tag Includes</option>
                <option value="tagExcludes">Tag Excludes</option>
                <option value="pathContains">Path Contains</option>
                <option value="extensionIs">Extension Is</option>
                <option value="sizeRange">Size Range</option>
                <option value="importedDateRange">Imported Date Range</option>
              </select>

              {condition.type === "mediaType" ? (
                <select
                  className="toolbar-select"
                  value={condition.mediaType ?? "image"}
                  onChange={(event) => {
                    const next = event.target.value as MediaType;
                    setConditions((current) => {
                      const copy = [...current];
                      copy[index] = { ...copy[index], mediaType: next };
                      return copy;
                    });
                  }}
                >
                  {mediaOptions().map((mediaType) => (
                    <option key={mediaType} value={mediaType}>
                      {mediaType}
                    </option>
                  ))}
                </select>
              ) : null}

              {(condition.type === "tagIncludes" || condition.type === "tagExcludes") ? (
                <select
                  className="toolbar-select"
                  value={condition.tagId ?? tags[0]?.id ?? ""}
                  onChange={(event) => {
                    const next = event.target.value;
                    setConditions((current) => {
                      const copy = [...current];
                      copy[index] = { ...copy[index], tagId: next };
                      return copy;
                    });
                  }}
                >
                  {tags.map((tag) => (
                    <option key={tag.id} value={tag.id}>
                      {tag.name}
                    </option>
                  ))}
                </select>
              ) : null}

              {(condition.type === "pathContains" || condition.type === "extensionIs") ? (
                <input
                  className="text-input"
                  placeholder={condition.type === "pathContains" ? "text" : ".png"}
                  value={condition.textValue ?? ""}
                  onChange={(event) => {
                    const next = event.target.value;
                    setConditions((current) => {
                      const copy = [...current];
                      copy[index] = { ...copy[index], textValue: next };
                      return copy;
                    });
                  }}
                />
              ) : null}

              {condition.type === "sizeRange" ? (
                <>
                  <input
                    className="text-input"
                    type="number"
                    placeholder="Min bytes"
                    value={condition.minBytes ?? ""}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      setConditions((current) => {
                        const copy = [...current];
                        copy[index] = { ...copy[index], minBytes: Number.isFinite(next) ? next : undefined };
                        return copy;
                      });
                    }}
                  />
                  <input
                    className="text-input"
                    type="number"
                    placeholder="Max bytes"
                    value={condition.maxBytes ?? ""}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      setConditions((current) => {
                        const copy = [...current];
                        copy[index] = { ...copy[index], maxBytes: Number.isFinite(next) ? next : undefined };
                        return copy;
                      });
                    }}
                  />
                </>
              ) : null}

              {condition.type === "importedDateRange" ? (
                <>
                  <input
                    className="text-input"
                    type="date"
                    value={condition.fromDate ?? ""}
                    onChange={(event) => {
                      const next = event.target.value;
                      setConditions((current) => {
                        const copy = [...current];
                        copy[index] = { ...copy[index], fromDate: next };
                        return copy;
                      });
                    }}
                  />
                  <input
                    className="text-input"
                    type="date"
                    value={condition.toDate ?? ""}
                    onChange={(event) => {
                      const next = event.target.value;
                      setConditions((current) => {
                        const copy = [...current];
                        copy[index] = { ...copy[index], toDate: next };
                        return copy;
                      });
                    }}
                  />
                </>
              ) : null}

              <button className="danger-button" type="button" onClick={() => setConditions((current) => current.filter((entry) => entry.id !== condition.id))}>
                Remove
              </button>
            </div>
          ))}
        </div>

        <button className="ghost-button" type="button" onClick={() => setConditions((current) => [...current, blankCondition()])}>
          Add Condition
        </button>
      </section>

      <section className="tag-editor">
        <h3>Export Presets</h3>
        <div className="rule-row">
          <input className="text-input" value={presetName} onChange={(event) => setPresetName(event.target.value)} placeholder="Preset name" />
          <select className="toolbar-select" value={presetMode} onChange={(event) => setPresetMode(event.target.value as "folder" | "zip")}>
            <option value="zip">zip</option>
            <option value="folder">folder</option>
          </select>
          <input className="text-input" value={presetDestination} onChange={(event) => setPresetDestination(event.target.value)} placeholder="Destination path" />
          <button
            className="ghost-button"
            type="button"
            onClick={() => {
              void window.uploadSave.pickExportDestination(presetMode).then((picked) => {
                if (picked) {
                  setPresetDestination(picked);
                }
              });
            }}
          >
            Browse
          </button>
          <select className="toolbar-select" value={presetOverwrite} onChange={(event) => setPresetOverwrite(event.target.value as "skip" | "replace")}>
            <option value="skip">skip</option>
            <option value="replace">replace</option>
          </select>
          <button
            className="primary-button"
            type="button"
            onClick={() =>
              void onSavePreset(smartCollection.id, {
                name: presetName,
                mode: presetMode,
                destinationPath: presetDestination,
                overwrite: presetOverwrite
              })
            }
          >
            Save Preset
          </button>
        </div>

        <div className="preset-list">
          {smartCollection.presets.map((preset: SmartExportPreset) => (
            <div key={preset.id} className="preset-row">
              <strong>{preset.name}</strong>
              <span>{preset.mode}</span>
              <span>{preset.destinationPath}</span>
              <span>{preset.lastRunAt ? `Last run: ${formatDate(preset.lastRunAt)}` : "Never run"}</span>
              <button className="primary-button" type="button" onClick={() => void onRunPreset(smartCollection.id, preset.id)}>
                Run
              </button>
            </div>
          ))}
          {smartCollection.presets.length === 0 ? <span className="media-extension">No presets saved.</span> : null}
        </div>
      </section>

      <section className="tag-editor">
        <h3>Preview ({smartCollection.previewItems.length})</h3>
        <PreviewTable items={smartCollection.previewItems} />
      </section>

      <section className="job-panel">
        <h3>Smart Activity</h3>
        {smartJobs.length === 0 ? (
          <div className="status-card">No smart export jobs yet.</div>
        ) : (
          <ul className="job-list">
            {smartJobs.map((job) => (
              <li key={job.id} className={`job-item status-${job.status}`}>
                <div className="job-row">
                  <span>{job.type.toUpperCase()}</span>
                  <span>{job.status}</span>
                </div>
                <div className="job-message">{job.message ?? "Running..."}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
