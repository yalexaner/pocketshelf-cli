import { loadBackup, getFilePath } from "../storage";

interface InfoOptions {
  file?: string;
  json?: boolean;
}

export async function infoCommand(options: InfoOptions): Promise<void> {
  const filePath = getFilePath(options.file);
  const backup = await loadBackup(options.file);

  const publications = backup.publications ?? [];

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          file: filePath,
          appVersion: backup.appVersion ?? "unknown",
          publicationCount: publications.length,
        },
        null,
        2
      )
    );
    return;
  }

  console.log(`File: ${filePath}`);
  console.log(`App Version: ${backup.appVersion ?? "unknown"}`);
  console.log(`Publications: ${publications.length}`);
}
