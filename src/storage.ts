import { readFile, writeFile, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { BackupSchema, type Backup } from "./types";

const DEFAULT_FILE_PATH = "./file";

export function getFilePath(overridePath?: string): string {
  return overridePath ?? process.env.BOOKSHELF_FILE ?? DEFAULT_FILE_PATH;
}

export async function loadBackup(filePath?: string): Promise<Backup> {
  const path = getFilePath(filePath);
  const content = await readFile(path, "utf-8");
  const json = JSON.parse(content);
  return BackupSchema.parse(json);
}

export async function createBackup(filePath?: string): Promise<string> {
  const path = getFilePath(filePath);
  const backupPath = `${path}.bak`;

  if (existsSync(path)) {
    await copyFile(path, backupPath);
  }

  return backupPath;
}

export async function saveBackup(
  backup: Backup,
  filePath?: string
): Promise<void> {
  const path = getFilePath(filePath);

  // Create backup before writing
  await createBackup(filePath);

  // Write the backup as JSON (single line to match original format)
  const content = JSON.stringify(backup);
  await writeFile(path, content, "utf-8");
}
