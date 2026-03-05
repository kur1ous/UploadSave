import { app } from "electron";
import fs from "node:fs";
import path from "node:path";

export interface AppPaths {
  rootDir: string;
  dbPath: string;
  storageDir: string;
  tempDir: string;
}

export function ensureAppPaths(): AppPaths {
  const rootDir = path.join(app.getPath("appData"), "UploadSave");
  const dbPath = path.join(rootDir, "uploadsave.db");
  const storageDir = path.join(rootDir, "storage");
  const tempDir = path.join(rootDir, "temp");

  fs.mkdirSync(rootDir, { recursive: true });
  fs.mkdirSync(storageDir, { recursive: true });
  fs.mkdirSync(tempDir, { recursive: true });

  return { rootDir, dbPath, storageDir, tempDir };
}

export function safeJoin(baseDir: string, relativePath: string): string {
  const resolved = path.resolve(baseDir, relativePath);
  const normalizedBase = path.resolve(baseDir);
  if (!resolved.startsWith(normalizedBase)) {
    throw new Error(`Unsafe relative path: ${relativePath}`);
  }
  return resolved;
}

export function normalizeRelativePath(input: string): string {
  const cleaned = input.replace(/\\/g, "/").replace(/^\/+/, "");
  const chunks = cleaned.split("/").filter(Boolean);
  for (const chunk of chunks) {
    if (chunk === "..") {
      throw new Error(`Unsafe relative path segment in ${input}`);
    }
  }
  return chunks.join("/");
}
