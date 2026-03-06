import Database from "better-sqlite3";
import type {
  CollectionDetail,
  CollectionItem,
  CollectionSummary,
  JobRecord,
  MediaType,
  SmartCollectionSummary,
  SmartExportPreset,
  SmartRule,
  TagRecord
} from "../../shared/types";

interface InsertItemInput {
  id: string;
  collectionId: string;
  sourcePath: string;
  relativePath: string;
  storagePath: string;
  sizeBytes: number;
  extension: string;
  mediaType: MediaType;
}

interface DbSmartCollectionRow {
  id: string;
  name: string;
  description: string | null;
  rule: SmartRule;
  createdAt: string;
  updatedAt: string;
}

function parseRuleJson(raw: string): SmartRule {
  try {
    const parsed = JSON.parse(raw) as SmartRule;
    if (!Array.isArray(parsed.conditions)) {
      return { conditions: [] };
    }
    return parsed;
  } catch {
    return { conditions: [] };
  }
}

export class UploadSaveDb {
  private readonly db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.migrate();
  }

  migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS collections (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS items (
        id TEXT PRIMARY KEY,
        collection_id TEXT NOT NULL,
        source_path TEXT NOT NULL,
        relative_path TEXT NOT NULL,
        storage_path TEXT NOT NULL,
        kind TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        extension TEXT NOT NULL,
        media_type TEXT NOT NULL DEFAULT 'other',
        created_at TEXT NOT NULL,
        FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS item_tags (
        item_id TEXT NOT NULL,
        tag_id TEXT NOT NULL,
        PRIMARY KEY (item_id, tag_id),
        FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS smart_collections (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        rule_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS smart_collection_presets (
        id TEXT PRIMARY KEY,
        smart_collection_id TEXT NOT NULL,
        name TEXT NOT NULL,
        mode TEXT NOT NULL,
        destination_path TEXT NOT NULL,
        overwrite_mode TEXT NOT NULL,
        last_run_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (smart_collection_id) REFERENCES smart_collections(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        collection_id TEXT NOT NULL,
        status TEXT NOT NULL,
        message TEXT,
        progress_current INTEGER NOT NULL,
        progress_total INTEGER NOT NULL,
        payload_json TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_items_collection_id ON items(collection_id);
      CREATE INDEX IF NOT EXISTS idx_jobs_collection_id ON jobs(collection_id);
      CREATE INDEX IF NOT EXISTS idx_item_tags_item_id ON item_tags(item_id);
      CREATE INDEX IF NOT EXISTS idx_item_tags_tag_id ON item_tags(tag_id);
      CREATE INDEX IF NOT EXISTS idx_smart_presets_smart_collection_id ON smart_collection_presets(smart_collection_id);
    `);

    const itemColumns = this.db.prepare("PRAGMA table_info(items)").all() as Array<{ name: string }>;
    const hasMediaType = itemColumns.some((column) => column.name === "media_type");
    if (!hasMediaType) {
      this.db.exec("ALTER TABLE items ADD COLUMN media_type TEXT NOT NULL DEFAULT 'other';");
    }
  }

  private attachTagIds(items: CollectionItem[]): CollectionItem[] {
    if (items.length === 0) {
      return items;
    }

    const ids = items.map((item) => item.id);
    const placeholders = ids.map(() => "?").join(",");
    const tagRows = this.db.prepare(`
      SELECT item_id AS itemId, tag_id AS tagId
      FROM item_tags
      WHERE item_id IN (${placeholders})
    `).all(...ids) as Array<{ itemId: string; tagId: string }>;

    const tagsByItemId = new Map<string, string[]>();
    for (const row of tagRows) {
      const current = tagsByItemId.get(row.itemId) ?? [];
      current.push(row.tagId);
      tagsByItemId.set(row.itemId, current);
    }

    return items.map((item) => ({
      ...item,
      tagIds: tagsByItemId.get(item.id) ?? []
    }));
  }

  private mapItemsFromRows(rows: Array<Record<string, unknown>>): CollectionItem[] {
    const items = rows.map((row) => ({
      id: row.id as string,
      collectionId: row.collectionId as string,
      sourcePath: row.sourcePath as string,
      relativePath: row.relativePath as string,
      storagePath: row.storagePath as string,
      kind: row.kind as "file",
      sizeBytes: row.sizeBytes as number,
      extension: row.extension as string,
      mediaType: row.mediaType as MediaType,
      createdAt: row.createdAt as string,
      tagIds: []
    }));

    return this.attachTagIds(items);
  }

  createCollection(id: string, name: string, description: string | undefined, now: string): void {
    this.db.prepare(`
      INSERT INTO collections (id, name, description, created_at, updated_at)
      VALUES (@id, @name, @description, @created_at, @updated_at)
    `).run({
      id,
      name,
      description: description ?? null,
      created_at: now,
      updated_at: now
    });
  }

  listCollections(): CollectionSummary[] {
    return this.db.prepare(`
      SELECT
        c.id,
        c.name,
        c.description,
        c.created_at AS createdAt,
        c.updated_at AS updatedAt,
        COUNT(i.id) AS itemCount,
        COALESCE(SUM(i.size_bytes), 0) AS totalSizeBytes
      FROM collections c
      LEFT JOIN items i ON i.collection_id = c.id
      GROUP BY c.id
      ORDER BY c.updated_at DESC
    `).all() as CollectionSummary[];
  }

  getCollection(collectionId: string): CollectionDetail | null {
    const summary = this.db.prepare(`
      SELECT
        c.id,
        c.name,
        c.description,
        c.created_at AS createdAt,
        c.updated_at AS updatedAt,
        COUNT(i.id) AS itemCount,
        COALESCE(SUM(i.size_bytes), 0) AS totalSizeBytes
      FROM collections c
      LEFT JOIN items i ON i.collection_id = c.id
      WHERE c.id = ?
      GROUP BY c.id
    `).get(collectionId) as CollectionSummary | undefined;

    if (!summary) {
      return null;
    }

    const rows = this.db.prepare(`
      SELECT
        id,
        collection_id AS collectionId,
        source_path AS sourcePath,
        relative_path AS relativePath,
        storage_path AS storagePath,
        kind,
        size_bytes AS sizeBytes,
        extension,
        media_type AS mediaType,
        created_at AS createdAt
      FROM items
      WHERE collection_id = ?
      ORDER BY relative_path ASC
    `).all(collectionId) as Array<Record<string, unknown>>;

    return {
      ...summary,
      items: this.mapItemsFromRows(rows)
    };
  }

  getItemsByIds(itemIds: string[]): CollectionItem[] {
    if (itemIds.length === 0) {
      return [];
    }

    const placeholders = itemIds.map(() => "?").join(",");
    const rows = this.db.prepare(`
      SELECT
        id,
        collection_id AS collectionId,
        source_path AS sourcePath,
        relative_path AS relativePath,
        storage_path AS storagePath,
        kind,
        size_bytes AS sizeBytes,
        extension,
        media_type AS mediaType,
        created_at AS createdAt
      FROM items
      WHERE id IN (${placeholders})
    `).all(...itemIds) as Array<Record<string, unknown>>;

    return this.mapItemsFromRows(rows);
  }

  listAllItems(): CollectionItem[] {
    const rows = this.db.prepare(`
      SELECT
        id,
        collection_id AS collectionId,
        source_path AS sourcePath,
        relative_path AS relativePath,
        storage_path AS storagePath,
        kind,
        size_bytes AS sizeBytes,
        extension,
        media_type AS mediaType,
        created_at AS createdAt
      FROM items
      ORDER BY created_at DESC
    `).all() as Array<Record<string, unknown>>;

    return this.mapItemsFromRows(rows);
  }

  insertItems(items: InsertItemInput[], now: string): void {
    const insert = this.db.prepare(`
      INSERT INTO items (
        id, collection_id, source_path, relative_path, storage_path, kind, size_bytes, extension, media_type, created_at
      ) VALUES (
        @id, @collection_id, @source_path, @relative_path, @storage_path, 'file', @size_bytes, @extension, @media_type, @created_at
      )
    `);

    const updateCollection = this.db.prepare(`
      UPDATE collections SET updated_at = ? WHERE id = ?
    `);

    const transaction = this.db.transaction((rows: InsertItemInput[]) => {
      for (const row of rows) {
        insert.run({
          id: row.id,
          collection_id: row.collectionId,
          source_path: row.sourcePath,
          relative_path: row.relativePath,
          storage_path: row.storagePath,
          size_bytes: row.sizeBytes,
          extension: row.extension,
          media_type: row.mediaType,
          created_at: now
        });
      }
      if (rows.length > 0) {
        updateCollection.run(now, rows[0].collectionId);
      }
    });

    transaction(items);
  }

  listTags(): TagRecord[] {
    return this.db.prepare(`
      SELECT id, name, created_at AS createdAt
      FROM tags
      ORDER BY name COLLATE NOCASE ASC
    `).all() as TagRecord[];
  }

  createTag(id: string, name: string, now: string): TagRecord {
    this.db.prepare(`INSERT INTO tags (id, name, created_at) VALUES (?, ?, ?)`).run(id, name, now);
    return { id, name, createdAt: now };
  }

  renameTag(id: string, name: string): TagRecord | null {
    const result = this.db.prepare(`UPDATE tags SET name = ? WHERE id = ?`).run(name, id);
    if (result.changes === 0) {
      return null;
    }

    const row = this.db.prepare(`SELECT id, name, created_at AS createdAt FROM tags WHERE id = ?`).get(id) as TagRecord | undefined;
    return row ?? null;
  }

  deleteTag(id: string): void {
    this.db.prepare(`DELETE FROM tags WHERE id = ?`).run(id);
  }

  setItemTags(itemId: string, tagIds: string[]): string[] {
    const tx = this.db.transaction((nextTagIds: string[]) => {
      this.db.prepare(`DELETE FROM item_tags WHERE item_id = ?`).run(itemId);
      const insert = this.db.prepare(`INSERT OR IGNORE INTO item_tags (item_id, tag_id) VALUES (?, ?)`);
      for (const tagId of nextTagIds) {
        insert.run(itemId, tagId);
      }
    });

    tx(tagIds);
    return tagIds;
  }

  createSmartCollection(id: string, name: string, description: string | undefined, rule: SmartRule, now: string): void {
    this.db.prepare(`
      INSERT INTO smart_collections (id, name, description, rule_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, name, description ?? null, JSON.stringify(rule), now, now);
  }

  updateSmartCollection(id: string, name: string, description: string | undefined, rule: SmartRule, now: string): void {
    this.db.prepare(`
      UPDATE smart_collections
      SET name = ?, description = ?, rule_json = ?, updated_at = ?
      WHERE id = ?
    `).run(name, description ?? null, JSON.stringify(rule), now, id);
  }

  deleteSmartCollection(id: string): void {
    this.db.prepare(`DELETE FROM smart_collections WHERE id = ?`).run(id);
  }

  listSmartCollectionRows(): DbSmartCollectionRow[] {
    const rows = this.db.prepare(`
      SELECT
        id,
        name,
        description,
        rule_json AS ruleJson,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM smart_collections
      ORDER BY updated_at DESC
    `).all() as Array<{ id: string; name: string; description: string | null; ruleJson: string; createdAt: string; updatedAt: string }>;

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      rule: parseRuleJson(row.ruleJson),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }));
  }

  getSmartCollectionRow(id: string): DbSmartCollectionRow | null {
    const row = this.db.prepare(`
      SELECT
        id,
        name,
        description,
        rule_json AS ruleJson,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM smart_collections
      WHERE id = ?
    `).get(id) as { id: string; name: string; description: string | null; ruleJson: string; createdAt: string; updatedAt: string } | undefined;

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      rule: parseRuleJson(row.ruleJson),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  listSmartCollections(): SmartCollectionSummary[] {
    return this.listSmartCollectionRows().map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      rule: row.rule,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      matchedCount: 0
    }));
  }

  listSmartExportPresets(smartCollectionId: string): SmartExportPreset[] {
    return this.db.prepare(`
      SELECT
        id,
        smart_collection_id AS smartCollectionId,
        name,
        mode,
        destination_path AS destinationPath,
        overwrite_mode AS overwrite,
        last_run_at AS lastRunAt,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM smart_collection_presets
      WHERE smart_collection_id = ?
      ORDER BY created_at ASC
    `).all(smartCollectionId) as SmartExportPreset[];
  }

  saveSmartExportPreset(
    smartCollectionId: string,
    presetId: string,
    name: string,
    mode: "folder" | "zip",
    destinationPath: string,
    overwrite: "skip" | "replace",
    now: string
  ): SmartExportPreset {
    const exists = this.db.prepare(`SELECT id FROM smart_collection_presets WHERE id = ?`).get(presetId) as { id: string } | undefined;
    if (exists) {
      this.db.prepare(`
        UPDATE smart_collection_presets
        SET name = ?, mode = ?, destination_path = ?, overwrite_mode = ?, updated_at = ?
        WHERE id = ?
      `).run(name, mode, destinationPath, overwrite, now, presetId);
    } else {
      this.db.prepare(`
        INSERT INTO smart_collection_presets (
          id, smart_collection_id, name, mode, destination_path, overwrite_mode, last_run_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?)
      `).run(presetId, smartCollectionId, name, mode, destinationPath, overwrite, now, now);
    }

    return this.db.prepare(`
      SELECT
        id,
        smart_collection_id AS smartCollectionId,
        name,
        mode,
        destination_path AS destinationPath,
        overwrite_mode AS overwrite,
        last_run_at AS lastRunAt,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM smart_collection_presets
      WHERE id = ?
    `).get(presetId) as SmartExportPreset;
  }

  touchSmartPresetLastRun(presetId: string, now: string): void {
    this.db.prepare(`
      UPDATE smart_collection_presets
      SET last_run_at = ?, updated_at = ?
      WHERE id = ?
    `).run(now, now, presetId);
  }

  getSmartPreset(presetId: string): SmartExportPreset | null {
    const row = this.db.prepare(`
      SELECT
        id,
        smart_collection_id AS smartCollectionId,
        name,
        mode,
        destination_path AS destinationPath,
        overwrite_mode AS overwrite,
        last_run_at AS lastRunAt,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM smart_collection_presets
      WHERE id = ?
    `).get(presetId) as SmartExportPreset | undefined;

    return row ?? null;
  }

  removeItems(collectionId: string, itemIds: string[], now: string): CollectionItem[] {
    if (itemIds.length === 0) {
      return [];
    }

    const placeholders = itemIds.map(() => "?").join(",");
    const rows = this.db.prepare(`
      SELECT
        id,
        collection_id AS collectionId,
        source_path AS sourcePath,
        relative_path AS relativePath,
        storage_path AS storagePath,
        kind,
        size_bytes AS sizeBytes,
        extension,
        media_type AS mediaType,
        created_at AS createdAt
      FROM items
      WHERE collection_id = ? AND id IN (${placeholders})
    `).all(collectionId, ...itemIds) as Array<Record<string, unknown>>;

    this.db.prepare(`
      DELETE FROM items
      WHERE collection_id = ? AND id IN (${placeholders})
    `).run(collectionId, ...itemIds);

    this.db.prepare(`UPDATE collections SET updated_at = ? WHERE id = ?`).run(now, collectionId);

    return this.mapItemsFromRows(rows);
  }

  deleteCollection(collectionId: string): CollectionItem[] {
    const rows = this.db.prepare(`
      SELECT
        id,
        collection_id AS collectionId,
        source_path AS sourcePath,
        relative_path AS relativePath,
        storage_path AS storagePath,
        kind,
        size_bytes AS sizeBytes,
        extension,
        media_type AS mediaType,
        created_at AS createdAt
      FROM items
      WHERE collection_id = ?
    `).all(collectionId) as Array<Record<string, unknown>>;

    const tx = this.db.transaction(() => {
      this.db.prepare(`DELETE FROM items WHERE collection_id = ?`).run(collectionId);
      this.db.prepare(`DELETE FROM jobs WHERE collection_id = ?`).run(collectionId);
      this.db.prepare(`DELETE FROM collections WHERE id = ?`).run(collectionId);
    });

    tx();
    return this.mapItemsFromRows(rows);
  }

  createJob(job: JobRecord): void {
    this.db.prepare(`
      INSERT INTO jobs (
        id, type, collection_id, status, message, progress_current, progress_total, payload_json, created_at, updated_at
      ) VALUES (
        @id, @type, @collection_id, @status, @message, @progress_current, @progress_total, @payload_json, @created_at, @updated_at
      )
    `).run({
      id: job.id,
      type: job.type,
      collection_id: job.collectionId,
      status: job.status,
      message: job.message,
      progress_current: job.progressCurrent,
      progress_total: job.progressTotal,
      payload_json: job.payloadJson,
      created_at: job.createdAt,
      updated_at: job.updatedAt
    });
  }

  updateJob(
    id: string,
    status: JobRecord["status"],
    progressCurrent: number,
    progressTotal: number,
    message: string | null,
    payloadJson: string | null,
    updatedAt: string
  ): void {
    this.db.prepare(`
      UPDATE jobs
      SET status = ?, progress_current = ?, progress_total = ?, message = ?, payload_json = ?, updated_at = ?
      WHERE id = ?
    `).run(status, progressCurrent, progressTotal, message, payloadJson, updatedAt, id);
  }

  listJobs(limit = 50): JobRecord[] {
    return this.db.prepare(`
      SELECT
        id,
        type,
        collection_id AS collectionId,
        status,
        message,
        progress_current AS progressCurrent,
        progress_total AS progressTotal,
        payload_json AS payloadJson,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM jobs
      ORDER BY updated_at DESC
      LIMIT ?
    `).all(limit) as JobRecord[];
  }
}
