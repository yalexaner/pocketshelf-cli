import { loadBackup, saveBackup } from "../storage";
import { parsePageRange, parseDuration } from "../utils/parse";
import type { Publication } from "../types";

interface EditBookOptions {
  file?: string;
  name?: string;
  author?: string;
  type?: string;
  bookType?: string;
  shelf?: string;
  narrator?: string;
  isbn?: string;
  publisher?: string;
  pages?: string;
  duration?: string;
  description?: string;
}

export async function editBookCommand(
  id: string,
  options: EditBookOptions
): Promise<void> {
  const backup = await loadBackup(options.file);
  const publications = backup.publications ?? [];

  // Find the book
  const normalizedId = id.toUpperCase();
  const bookIndex = publications.findIndex(
    (p) =>
      p.id?.toUpperCase() === normalizedId ||
      p.id?.toUpperCase().startsWith(normalizedId)
  );

  if (bookIndex === -1) {
    console.error(`Error: Book not found: ${id}`);
    process.exit(1);
  }

  const book = publications[bookIndex]!;

  // Apply updates
  if (options.name !== undefined) book.name = options.name;
  if (options.author !== undefined) book.author = options.author;
  if (options.type !== undefined) book.publicationType = options.type;
  if (options.bookType !== undefined) book.bookType = options.bookType;
  if (options.shelf !== undefined) book.shelf = options.shelf;
  if (options.narrator !== undefined) book.narrator = options.narrator;
  if (options.isbn !== undefined) book.isbn = options.isbn;
  if (options.publisher !== undefined) book.publisher = options.publisher;
  if (options.description !== undefined) book.bookDescription = options.description;

  if (options.pages) {
    const range = parsePageRange(options.pages);
    if (!range) {
      console.error("Error: Invalid page range format. Use: 1-350");
      process.exit(1);
    }
    book.start = range.start;
    book.end = range.end;
    book.progressMeasurementType = "pages";
  }

  if (options.duration) {
    const duration = parseDuration(options.duration);
    if (duration === null) {
      console.error("Error: Invalid duration format. Use: 3600 or 1h30m");
      process.exit(1);
    }
    book.start = 0;
    book.end = duration;
    book.progressMeasurementType = "time";
  }

  await saveBackup(backup, options.file);

  console.log(`Updated "${book.name}"`);
}

interface EditSessionOptions {
  file?: string;
  start?: string;
  end?: string;
  notes?: string;
}

export async function editSessionCommand(
  sessionId: string,
  options: EditSessionOptions
): Promise<void> {
  const backup = await loadBackup(options.file);
  const publications = backup.publications ?? [];

  // Find the session across all books
  const normalizedId = sessionId.toUpperCase();
  let foundSession = null;
  let foundBook = null;

  for (const book of publications) {
    const sessions = book.readingSessions ?? [];
    const session = sessions.find(
      (s) =>
        s.id?.toUpperCase() === normalizedId ||
        s.id?.toUpperCase().startsWith(normalizedId)
    );
    if (session) {
      foundSession = session;
      foundBook = book;
      break;
    }
  }

  if (!foundSession || !foundBook) {
    console.error(`Error: Session not found: ${sessionId}`);
    process.exit(1);
  }

  // Apply updates
  const progressType = foundBook.progressMeasurementType ?? "pages";

  if (options.start !== undefined) {
    if (progressType === "time") {
      const value = parseDuration(options.start);
      if (value === null) {
        console.error("Error: Start must be a valid duration");
        process.exit(1);
      }
      foundSession.startValue = value;
    } else {
      const value = parseInt(options.start, 10);
      if (isNaN(value)) {
        console.error("Error: Start must be a number");
        process.exit(1);
      }
      foundSession.startValue = value;
    }
  }

  if (options.end !== undefined) {
    if (progressType === "time") {
      const value = parseDuration(options.end);
      if (value === null) {
        console.error("Error: End must be a valid duration");
        process.exit(1);
      }
      foundSession.endValue = value;
    } else {
      const value = parseInt(options.end, 10);
      if (isNaN(value)) {
        console.error("Error: End must be a number");
        process.exit(1);
      }
      foundSession.endValue = value;
    }
  }

  const effectiveStart = foundSession.startValue ?? 0;
  const effectiveEnd = foundSession.endValue ?? 0;
  if (effectiveStart > effectiveEnd) {
    console.error("Error: End must be greater than or equal to Start");
    process.exit(1);
  }

  if (options.notes !== undefined) {
    foundSession.notes = options.notes ? [options.notes] : [];
  }

  await saveBackup(backup, options.file);

  console.log(`Updated session for "${foundBook.name}"`);
}
