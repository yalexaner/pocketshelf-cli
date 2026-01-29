import { loadBackup } from "../storage";

interface StatsOptions {
  file?: string;
  json?: boolean;
}

export async function statsCommand(options: StatsOptions): Promise<void> {
  const backup = await loadBackup(options.file);
  const publications = backup.publications ?? [];

  const total = publications.length;
  const byType = new Map<string, number>();
  const byShelf = new Map<string, number>();

  for (const p of publications) {
    const type = p.publicationType ?? "unknown";
    const shelf = p.shelf ?? "Unknown";

    byType.set(type, (byType.get(type) ?? 0) + 1);
    byShelf.set(shelf, (byShelf.get(shelf) ?? 0) + 1);
  }

  const typeEntries = Array.from(byType.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  );
  const shelfEntries = Array.from(byShelf.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          total,
          byType: Object.fromEntries(typeEntries),
          byShelf: Object.fromEntries(shelfEntries),
        },
        null,
        2
      )
    );
    return;
  }

  console.log(`Total publications: ${total}`);
  for (const [type, count] of typeEntries) {
    console.log(`  ${type}: ${count}`);
  }

  console.log();
  console.log("By shelf:");
  for (const [shelf, count] of shelfEntries) {
    console.log(`  ${shelf}: ${count}`);
  }
}
