import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import archiver from "archiver";
import type { BrowserWindow } from "electron";
import type { CollectionItem, JobRecord, MediaType } from "../../shared/types";
import { normalizeRelativePath, safeJoin } from "./paths";
import { UploadSaveDb } from "./db";

interface SourceFile {
  sourcePath: string;
  relativePath: string;
  sizeBytes: number;
  extension: string;
  mediaType: MediaType;
}

const mediaTypeExtensions: Record<MediaType, string[]> = {
  image: [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg", ".ico", ".tiff", ".avif"],
  audio: [".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac", ".wma"],
  video: [".mp4", ".mov", ".mkv", ".webm", ".avi", ".wmv", ".m4v"],
  document: [".pdf", ".doc", ".docx", ".txt", ".md", ".rtf", ".ppt", ".pptx", ".xls", ".xlsx", ".csv"],
  archive: [".zip", ".rar", ".7z", ".tar", ".gz"],
  code: [".js", ".ts", ".tsx", ".jsx", ".py", ".java", ".cs", ".cpp", ".c", ".go", ".rs", ".json", ".yaml", ".yml", ".html", ".css"] ,
  other: []
};

function detectMediaType(extension: string): MediaType {
  for (const [mediaType, extensions] of Object.entries(mediaTypeExtensions) as Array<[MediaType, string[]]>) {
    if (extensions.includes(extension)) {
      return mediaType;
    }
  }
  return "other";
}

function makeUniqueRelativePath(relativePath: string, seen: Map<string, number>): string {
  const normalized = normalizeRelativePath(relativePath);
  const current = seen.get(normalized) ?? 0;

  if (current === 0) {
    seen.set(normalized, 1);
    return normalized;
  }

  const parsed = path.posix.parse(normalized);
  let next = current + 1;
  let candidate = normalizeRelativePath(path.posix.join(parsed.dir, `${parsed.name} (${next})${parsed.ext}`));

  while (seen.has(candidate)) {
    next += 1;
    candidate = normalizeRelativePath(path.posix.join(parsed.dir, `${parsed.name} (${next})${parsed.ext}`));
  }

  seen.set(normalized, next);
  seen.set(candidate, 1);
  return candidate;
}

export class StorageService {
  constructor(
    private readonly db: UploadSaveDb,
    private readonly storageDir: string,
    private readonly tempDir: string,
    private readonly onJobUpdate: (job: JobRecord, targetWindow: BrowserWindow | null) => void
  ) {}

  async importIntoCollection(
    collectionId: string,
    sourcePaths: string[],
    job: JobRecord,
    targetWindow: BrowserWindow | null
  ): Promise<void> {
    const discovered = this.discoverSourceFiles(sourcePaths);
    this.updateJob(job, "running", 0, discovered.length, "Scanning sources...", null, targetWindow);

    const inserts: Array<{
      id: string;
      collectionId: string;
      sourcePath: string;
      relativePath: string;
      storagePath: string;
      sizeBytes: number;
      extension: string;
      mediaType: MediaType;
    }> = [];

    let processed = 0;
    for (const file of discovered) {
      const itemId = randomUUID();
      const storageName = `${itemId}${file.extension}`;
      const targetStoragePath = path.join(this.storageDir, storageName);
      await fsp.copyFile(file.sourcePath, targetStoragePath);

      inserts.push({
        id: itemId,
        collectionId,
        sourcePath: file.sourcePath,
        relativePath: file.relativePath,
        storagePath: targetStoragePath,
        sizeBytes: file.sizeBytes,
        extension: file.extension,
        mediaType: file.mediaType
      });

      processed += 1;
      this.updateJob(job, "running", processed, discovered.length, `Imported ${processed}/${discovered.length}`, null, targetWindow);
    }

    this.db.insertItems(inserts, new Date().toISOString());
    this.updateJob(job, "success", discovered.length, discovered.length, `Imported ${discovered.length} files`, null, targetWindow);
  }

  async exportCollection(
    collectionId: string,
    items: CollectionItem[],
    mode: "folder" | "zip",
    destinationPath: string,
    overwrite: "skip" | "replace",
    job: JobRecord,
    targetWindow: BrowserWindow | null
  ): Promise<void> {
    this.updateJob(job, "running", 0, items.length, "Preparing export...", null, targetWindow);

    if (mode === "folder") {
      await this.exportFolder(items, destinationPath, overwrite, job, targetWindow);
    } else {
      await this.exportZip(collectionId, items, destinationPath, overwrite, job, targetWindow);
    }
  }

  private async exportFolder(
    items: CollectionItem[],
    destinationPath: string,
    overwrite: "skip" | "replace",
    job: JobRecord,
    targetWindow: BrowserWindow | null
  ): Promise<void> {
    fs.mkdirSync(destinationPath, { recursive: true });

    let processed = 0;
    for (const item of items) {
      const relativePath = normalizeRelativePath(item.relativePath);
      const finalPath = safeJoin(destinationPath, relativePath);
      fs.mkdirSync(path.dirname(finalPath), { recursive: true });

      if (fs.existsSync(finalPath)) {
        if (overwrite === "skip") {
          processed += 1;
          this.updateJob(job, "running", processed, items.length, `Skipped existing ${relativePath}`, null, targetWindow);
          continue;
        }
        await fsp.rm(finalPath, { force: true });
      }

      await fsp.copyFile(item.storagePath, finalPath);
      processed += 1;
      this.updateJob(job, "running", processed, items.length, `Exported ${processed}/${items.length}`, null, targetWindow);
    }

    this.updateJob(job, "success", items.length, items.length, `Exported ${items.length} files`, null, targetWindow);
  }

  private async exportZip(
    collectionId: string,
    items: CollectionItem[],
    destinationPath: string,
    overwrite: "skip" | "replace",
    job: JobRecord,
    targetWindow: BrowserWindow | null
  ): Promise<void> {
    let zipPath = destinationPath;
    if (!zipPath.toLowerCase().endsWith(".zip")) {
      zipPath = `${zipPath}.zip`;
    }

    if (fs.existsSync(zipPath)) {
      if (overwrite === "skip") {
        this.updateJob(job, "success", 0, items.length, `Skipped export: ${zipPath} already exists`, null, targetWindow);
        return;
      }
      await fsp.rm(zipPath, { force: true });
    }

    await new Promise<void>((resolve, reject) => {
      const output = fs.createWriteStream(zipPath);
      const archive = archiver("zip", { zlib: { level: 9 } });

      output.on("close", () => resolve());
      output.on("error", reject);
      archive.on("error", reject);

      archive.pipe(output);

      let processed = 0;
      for (const item of items) {
        const relativePath = normalizeRelativePath(item.relativePath);
        archive.file(item.storagePath, { name: relativePath });
        processed += 1;
        this.updateJob(job, "running", processed, items.length, `Queued ${processed}/${items.length}`, JSON.stringify({ zipPath, collectionId }), targetWindow);
      }

      archive.finalize().catch(reject);
    });

    this.updateJob(job, "success", items.length, items.length, `Created zip at ${zipPath}`, JSON.stringify({ zipPath }), targetWindow);
  }

  private discoverSourceFiles(sourcePaths: string[]): SourceFile[] {
    const output: SourceFile[] = [];
    const seenRelativePaths = new Map<string, number>();

    for (const sourcePath of sourcePaths) {
      const stat = fs.statSync(sourcePath);
      const basename = path.basename(sourcePath);

      if (stat.isFile()) {
        const extension = path.extname(sourcePath).toLowerCase();
        const relativePath = makeUniqueRelativePath(basename, seenRelativePaths);
        output.push({
          sourcePath,
          relativePath,
          sizeBytes: stat.size,
          extension,
          mediaType: detectMediaType(extension)
        });
      }

      if (stat.isDirectory()) {
        this.walkDirectory(sourcePath, basename, output, seenRelativePaths);
      }
    }

    return output;
  }

  private walkDirectory(rootDir: string, rootName: string, output: SourceFile[], seenRelativePaths: Map<string, number>): void {
    const entries = fs.readdirSync(rootDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(rootDir, entry.name);
      const relPath = normalizeRelativePath(path.join(rootName, path.relative(rootDir, fullPath)));

      if (entry.isDirectory()) {
        this.walkDirectory(fullPath, path.join(rootName, entry.name), output, seenRelativePaths);
        continue;
      }

      if (entry.isFile()) {
        const stat = fs.statSync(fullPath);
        const extension = path.extname(fullPath).toLowerCase();
        output.push({
          sourcePath: fullPath,
          relativePath: makeUniqueRelativePath(relPath, seenRelativePaths),
          sizeBytes: stat.size,
          extension,
          mediaType: detectMediaType(extension)
        });
      }
    }
  }

  private updateJob(
    job: JobRecord,
    status: JobRecord["status"],
    progressCurrent: number,
    progressTotal: number,
    message: string | null,
    payloadJson: string | null,
    targetWindow: BrowserWindow | null
  ): void {
    const updated: JobRecord = {
      ...job,
      status,
      progressCurrent,
      progressTotal,
      message,
      payloadJson,
      updatedAt: new Date().toISOString()
    };

    this.db.updateJob(
      updated.id,
      updated.status,
      updated.progressCurrent,
      updated.progressTotal,
      updated.message,
      updated.payloadJson,
      updated.updatedAt
    );

    this.onJobUpdate(updated, targetWindow);
  }
}
