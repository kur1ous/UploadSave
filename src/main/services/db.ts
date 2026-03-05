import Database from "better-sqlite3";
import type { CollectionDetail, CollectionItem, CollectionSummary, JobRecord, MediaType } from "../../shared/types";

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

export class UploadSaveDb {
  private readonly db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
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
    `);

    const columns = this.db.prepare("PRAGMA table_info(items)").all() as Array<{ name: string }>;
    const hasMediaType = columns.some((column) => column.name === "media_type");
    if (!hasMediaType) {
      this.db.exec("ALTER TABLE items ADD COLUMN media_type TEXT NOT NULL DEFAULT 'other';");
    }
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

    const items = this.db.prepare(`
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
    `).all(collectionId) as CollectionItem[];

    return {
      ...summary,
      items
    };
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

  removeItems(collectionId: string, itemIds: string[], now: string): CollectionItem[] {
    if (itemIds.length === 0) {
      return [];
    }

    const placeholders = itemIds.map(() => "?").join(",");
    const items = this.db.prepare(`
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
    `).all(collectionId, ...itemIds) as CollectionItem[];

    this.db.prepare(`
      DELETE FROM items
      WHERE collection_id = ? AND id IN (${placeholders})
    `).run(collectionId, ...itemIds);

    this.db.prepare(`UPDATE collections SET updated_at = ? WHERE id = ?`).run(now, collectionId);

    return items;
  }

  deleteCollection(collectionId: string): CollectionItem[] {
    const items = this.db.prepare(`
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
    `).all(collectionId) as CollectionItem[];

    const tx = this.db.transaction(() => {
      this.db.prepare(`DELETE FROM items WHERE collection_id = ?`).run(collectionId);
      this.db.prepare(`DELETE FROM jobs WHERE collection_id = ?`).run(collectionId);
      this.db.prepare(`DELETE FROM collections WHERE id = ?`).run(collectionId);
    });

    tx();
    return items;
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
