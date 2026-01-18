import { loadBackup } from "../storage";
import { shortId, printTable } from "../utils/format";
import type { Publication } from "../types";

interface ListBooksOptions {
  file?: string;
  json?: boolean;
  shelf?: string;
  type?: string;
  author?: string;
}

export async function listBooksCommand(options: ListBooksOptions): Promise<void> {
  const backup = await loadBackup(options.file);
  let publications = backup.publications ?? [];

  // Apply filters
  if (options.shelf) {
    publications = publications.filter(
      (p) => p.shelf?.toLowerCase() === options.shelf!.toLowerCase()
    );
  }
  if (options.type) {
    publications = publications.filter(
      (p) => p.publicationType?.toLowerCase() === options.type!.toLowerCase()
    );
  }
  if (options.author) {
    publications = publications.filter((p) =>
      p.author?.toLowerCase().includes(options.author!.toLowerCase())
    );
  }

  if (options.json) {
    console.log(JSON.stringify(publications, null, 2));
    return;
  }

  if (publications.length === 0) {
    console.log("No books found.");
    return;
  }

  printTable(
    [
      { header: "ID", width: 8 },
      { header: "Title", width: 25 },
      { header: "Author", width: 20 },
      { header: "Type", width: 10 },
      { header: "Shelf", width: 18 },
    ],
    publications.map((p) => [
      shortId(p.id ?? ""),
      p.name ?? "",
      p.author ?? "",
      p.publicationType ?? "",
      p.shelf ?? "",
    ])
  );
}

interface ListOptions {
  file?: string;
  json?: boolean;
}

export async function listShelvesCommand(options: ListOptions): Promise<void> {
  const backup = await loadBackup(options.file);
  const publications = backup.publications ?? [];

  const shelfCounts = new Map<string, number>();
  for (const p of publications) {
    const shelf = p.shelf ?? "Unknown";
    shelfCounts.set(shelf, (shelfCounts.get(shelf) ?? 0) + 1);
  }

  const shelves = Array.from(shelfCounts.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  if (options.json) {
    console.log(JSON.stringify(Object.fromEntries(shelves), null, 2));
    return;
  }

  if (shelves.length === 0) {
    console.log("No shelves found.");
    return;
  }

  printTable(
    [
      { header: "Shelf", width: 25 },
      { header: "Count", width: 6, align: "right" },
    ],
    shelves
  );
}

export async function listAuthorsCommand(options: ListOptions): Promise<void> {
  const backup = await loadBackup(options.file);
  const publications = backup.publications ?? [];

  const authorCounts = new Map<string, number>();
  for (const p of publications) {
    const author = p.author ?? "Unknown";
    authorCounts.set(author, (authorCounts.get(author) ?? 0) + 1);
  }

  const authors = Array.from(authorCounts.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  if (options.json) {
    console.log(JSON.stringify(Object.fromEntries(authors), null, 2));
    return;
  }

  if (authors.length === 0) {
    console.log("No authors found.");
    return;
  }

  printTable(
    [
      { header: "Author", width: 35 },
      { header: "Books", width: 6, align: "right" },
    ],
    authors
  );
}
