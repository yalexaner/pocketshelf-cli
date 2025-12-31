import { readFile } from "node:fs/promises";
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
