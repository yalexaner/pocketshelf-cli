import { readFile } from "node:fs/promises";
import { loadBackup, saveBackup } from "../storage";
import { generateId } from "../utils/id";
import { getCurrentCocoaTimestamp } from "../utils/date";
import { parsePageRange, parseDuration } from "../utils/parse";
import { shortId } from "../utils/format";
import type { Publication, ReadingSession } from "../types";

interface AddBookOptions {
  file?: string;
  author?: string;
  type?: string;
  bookType?: string;
  shelf?: string;
  narrator?: string;
  isbn?: string;
  publisher?: string;
  pages?: string;
  duration?: string;
  from?: string;
}

export async function addBookCommand(
  name: string | undefined,
  options: AddBookOptions
): Promise<void> {
  // Import from file mode
  if (options.from) {
    await importBooksFromFile(options.from, options.file);
    return;
  }

  if (!name) {
    console.error("Error: Book name is required");
    process.exit(1);
  }

  const backup = await loadBackup(options.file);
  const publications = backup.publications ?? [];

  // Parse pages or duration
  let start = 0;
  let end = 0;
  let progressMeasurementType = "pages";

  if (options.pages) {
    const range = parsePageRange(options.pages);
    if (!range) {
      console.error("Error: Invalid page range format. Use: 1-350");
      process.exit(1);
    }
    start = range.start;
    end = range.end;
  } else if (options.duration) {
    const duration = parseDuration(options.duration);
    if (duration === null) {
      console.error("Error: Invalid duration format. Use: 3600 or 1h30m");
      process.exit(1);
    }
    end = duration;
    progressMeasurementType = "time";
  }

  if ((options.type ?? "book") === "audiobook" && !options.pages && !options.duration) {
    progressMeasurementType = "time";
  }

  const newBook: Publication = {
    id: generateId(),
    name,
    author: options.author,
    publicationType: options.type ?? "book",
    bookType: options.bookType,
    shelf: options.shelf ?? "To Read",
    narrator: options.narrator,
    isbn: options.isbn,
    publisher: options.publisher,
    source: "manual",
    added: getCurrentCocoaTimestamp(),
    start,
    end,
    progressMeasurementType,
    readingSessions: [],
    categoryLabels: [],
    bookGenre: [],
    glossaryItems: [],
  };

  publications.push(newBook);
  backup.publications = publications;

  await saveBackup(backup, options.file);

  console.log(`Added book "${name}" (ID: ${shortId(newBook.id!)})`);
}

async function importBooksFromFile(
  importPath: string,
  backupPath?: string
): Promise<void> {
  const content = await readFile(importPath, "utf-8");
  let booksToImport: Partial<Publication>[];

  try {
    const parsed = JSON.parse(content);
    booksToImport = Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    console.error("Error: Invalid JSON file");
    process.exit(1);
  }

  // Validate required fields
  for (const book of booksToImport) {
    if (!book.name) {
      console.error("Error: Each book must have a 'name' field");
      process.exit(1);
    }
    if (!book.author) {
      console.error(`Error: Book "${book.name}" must have an 'author' field`);
      process.exit(1);
    }
    if (!book.publicationType) {
      console.error(
        `Error: Book "${book.name}" must have a 'publicationType' field`
      );
      process.exit(1);
    }
  }

  const backup = await loadBackup(backupPath);
  const publications = backup.publications ?? [];

  let addedCount = 0;
  for (const book of booksToImport) {
    const newBook: Publication = {
      id: generateId(),
      source: "manual",
      added: getCurrentCocoaTimestamp(),
      shelf: "To Read",
      start: 0,
      end: 0,
      progressMeasurementType: "pages",
      readingSessions: [],
      categoryLabels: [],
      bookGenre: [],
      glossaryItems: [],
      ...book,
    };

    publications.push(newBook);
    addedCount++;
  }

  backup.publications = publications;
  await saveBackup(backup, backupPath);

  console.log(`Added ${addedCount} book(s)`);
}

interface AddSessionOptions {
  file?: string;
  start?: string;
  end?: string;
  date?: string;
  notes?: string;
}

export async function addSessionCommand(
  bookId: string,
  options: AddSessionOptions
): Promise<void> {
  const backup = await loadBackup(options.file);
  const publications = backup.publications ?? [];

  // Find the book
  const normalizedId = bookId.toUpperCase();
  const book = publications.find(
    (p) =>
      p.id?.toUpperCase() === normalizedId ||
      p.id?.toUpperCase().startsWith(normalizedId)
  );

  if (!book) {
    console.error(`Error: Book not found: ${bookId}`);
    process.exit(1);
  }

  const progressType = book.progressMeasurementType ?? "pages";
  let startValue: number;
  let endValue: number;

  if (progressType === "time") {
    startValue = options.start ? parseDuration(options.start) ?? NaN : 0;
    endValue = options.end ? parseDuration(options.end) ?? NaN : 0;
    if (isNaN(startValue) || isNaN(endValue)) {
      console.error("Error: Start and end must be valid durations");
      process.exit(1);
    }
  } else {
    startValue = options.start ? parseInt(options.start, 10) : 0;
    endValue = options.end ? parseInt(options.end, 10) : 0;
    if (isNaN(startValue) || isNaN(endValue)) {
      console.error("Error: Start and end must be numbers");
      process.exit(1);
    }
  }

  if (startValue > endValue) {
    console.error("Error: End must be greater than or equal to Start");
    process.exit(1);
  }

  const newSession: ReadingSession = {
    id: generateId(),
    startDate: getCurrentCocoaTimestamp(),
    startValue,
    endValue,
    notes: options.notes ? [options.notes] : [],
  };

  if (!book.readingSessions) {
    book.readingSessions = [];
  }
  book.readingSessions.push(newSession);

  await saveBackup(backup, options.file);

  const progressLabel = progressType === "time" ? "time" : "pages";
  console.log(
    `Added session to "${book.name}" (${progressLabel} ${startValue} -> ${endValue})`
  );
}
