import * as p from "@clack/prompts";
import { loadBackup, saveBackup, getFilePath } from "../storage";
import { generateId } from "../utils/id";
import { getCurrentCocoaTimestamp, formatCocoaTimestamp, formatDuration } from "../utils/date";
import { shortId } from "../utils/format";
import { parsePageRange, parseDuration } from "../utils/parse";
import type { Backup, Publication, ReadingSession } from "../types";

function printBlock(title: string, lines: string[]): void {
  console.log("│");
  console.log(`┌ ${title}`);
  console.log("│");
  for (const line of lines) {
    console.log(`│ ${line}`);
  }
  console.log("│");
  console.log("└─");
}

interface InteractiveOptions {
  file?: string;
}

export async function interactiveCommand(options: InteractiveOptions): Promise<void> {
  const filePath = getFilePath(options.file);

  p.intro("Bookshelf - Interactive Mode");

  let backup: Backup;
  try {
    backup = await loadBackup(options.file);
  } catch (error) {
    p.outro("Failed to load backup file. Make sure it exists and is valid JSON.");
    process.exit(1);
  }

  await mainMenu(backup, filePath);

  p.outro("Goodbye!");
}

async function mainMenu(backup: Backup, filePath: string): Promise<void> {
  while (true) {
    const publications = backup.publications ?? [];
    const bookCount = publications.length;

    const action = await p.select({
      message: "What would you like to do?",
      options: [
        { value: "browse", label: `Browse books (${bookCount})` },
        { value: "add", label: "Add a book" },
        { value: "stats", label: "View statistics" },
        { value: "exit", label: "Exit" },
      ],
    });

    if (p.isCancel(action) || action === "exit") {
      return;
    }

    switch (action) {
      case "browse":
        backup = await browseBooks(backup, filePath);
        break;
      case "add":
        backup = await addBookInteractive(backup, filePath);
        break;
      case "stats":
        await viewStats(backup);
        break;
    }
  }
}

async function browseBooks(backup: Backup, filePath: string): Promise<Backup> {
  const publications = backup.publications ?? [];

  if (publications.length === 0) {
    printBlock("INFO", ["No books in your library yet.", "Add one from the main menu!"]);
    return backup;
  }

  const bookOptions = publications.map((book) => ({
    value: book.id!,
    label: `${book.name ?? "Untitled"}`,
    hint: `${book.author ?? "Unknown author"} - ${book.shelf ?? "No shelf"}`,
  }));

  bookOptions.push({ value: "__back__", label: "Back to main menu", hint: "" });

  const selectedId = await p.select({
    message: "Select a book:",
    options: bookOptions,
  });

  if (p.isCancel(selectedId) || selectedId === "__back__") {
    return backup;
  }

  const selectedBook = publications.find((b) => b.id === selectedId);
  if (selectedBook) {
    backup = await bookMenu(backup, selectedBook, filePath);
  }

  return backup;
}

async function bookMenu(backup: Backup, book: Publication, filePath: string): Promise<Backup> {
  while (true) {
    const sessionCount = book.readingSessions?.length ?? 0;

    const action = await p.select({
      message: `${book.name}`,
      options: [
        { value: "view", label: "View details" },
        { value: "edit", label: "Edit book" },
        { value: "sessions", label: `View sessions (${sessionCount})` },
        { value: "add-session", label: "Add reading session" },
        { value: "delete", label: "Delete book" },
        { value: "back", label: "Back to book list" },
      ],
    });

    if (p.isCancel(action) || action === "back") {
      return backup;
    }

    switch (action) {
      case "view":
        viewBookDetails(book);
        break;
      case "edit":
        backup = await editBookInteractive(backup, book, filePath);
        // Refresh book reference after edit
        book = backup.publications?.find((b) => b.id === book.id) ?? book;
        break;
      case "sessions":
        viewSessions(book);
        break;
      case "add-session":
        backup = await addSessionInteractive(backup, book, filePath);
        book = backup.publications?.find((b) => b.id === book.id) ?? book;
        break;
      case "delete": {
        const deleted = await deleteBookInteractive(backup, book, filePath);
        if (deleted) {
          backup = deleted;
          return backup;
        }
        break;
      }
    }
  }
}

function viewBookDetails(book: Publication): void {
  const progressType = book.progressMeasurementType ?? "pages";
  const progressLabel = progressType === "time" ? "Duration" : "Pages";
  const progressValue =
    progressType === "time"
      ? formatDuration(book.end ?? 0)
      : `${book.start ?? 0} - ${book.end ?? 0}`;

  const lines: string[] = [];
  lines.push(`ID:        ${shortId(book.id ?? "")}`);
  lines.push(`Title:     ${book.name ?? "Untitled"}`);
  lines.push(`Author:    ${book.author ?? "Unknown"}`);
  lines.push(`Type:      ${book.publicationType ?? "book"}`);
  if (book.bookType) lines.push(`Format:    ${book.bookType}`);
  lines.push(`Shelf:     ${book.shelf ?? "Unknown"}`);
  if (book.narrator) lines.push(`Narrator:  ${book.narrator}`);
  if (book.isbn) lines.push(`ISBN:      ${book.isbn}`);
  if (book.publisher) lines.push(`Publisher: ${book.publisher}`);
  lines.push(`${progressLabel.padEnd(9)}  ${progressValue}`);
  if (book.added) lines.push(`Added:     ${formatCocoaTimestamp(book.added)}`);
  lines.push(`Sessions:  ${book.readingSessions?.length ?? 0}`);

  if (book.bookDescription) {
    lines.push("");
    lines.push("Description:");
    // Split by newlines to preserve paragraphs
    const paragraphs = book.bookDescription.split(/\n+/);
    for (let p = 0; p < paragraphs.length; p++) {
      if (p > 0) lines.push(""); // Blank line between paragraphs
      const words = paragraphs[p]!.trim().split(" ");
      let line = "";
      for (const word of words) {
        if (!word) continue;
        if (line.length + word.length > 50) {
          lines.push("  " + line);
          line = word;
        } else {
          line += (line.length > 0 ? " " : "") + word;
        }
      }
      if (line.length > 0) lines.push("  " + line);
    }
  }

  printBlock("BOOK DETAILS", lines);
}

async function addBookInteractive(backup: Backup, filePath: string): Promise<Backup> {
  const name = await p.text({
    message: "Book title:",
    placeholder: "Enter the book title",
    validate: (value) => {
      if (!value.trim()) return "Title is required";
    },
  });

  if (p.isCancel(name)) return backup;

  const author = await p.text({
    message: "Author:",
    placeholder: "Enter the author name",
  });

  if (p.isCancel(author)) return backup;

  const publicationType = await p.select({
    message: "Publication type:",
    options: [
      { value: "book", label: "Book" },
      { value: "audiobook", label: "Audiobook" },
    ],
  });

  if (p.isCancel(publicationType)) return backup;

  let bookType: string | undefined;
  if (publicationType === "book") {
    const bookTypeResult = await p.select({
      message: "Book format:",
      options: [
        { value: "paperback", label: "Paperback" },
        { value: "hardcover", label: "Hardcover" },
        { value: "ebook", label: "E-book" },
        { value: "skip", label: "Skip" },
      ],
    });

    if (p.isCancel(bookTypeResult)) return backup;
    if (bookTypeResult !== "skip") {
      bookType = bookTypeResult;
    }
  }

  const shelf = await p.text({
    message: "Shelf:",
    placeholder: "To Read",
    defaultValue: "To Read",
  });

  if (p.isCancel(shelf)) return backup;

  let start = 0;
  let end = 0;
  let progressMeasurementType = "pages";

  if (publicationType === "audiobook") {
    const durationInput = await p.text({
      message: "Duration (e.g., 10h30m or 37800):",
      placeholder: "Enter duration or leave empty",
    });

    if (p.isCancel(durationInput)) return backup;

    if (durationInput) {
      const duration = parseDuration(durationInput);
      if (duration !== null) {
        end = duration;
        progressMeasurementType = "time";
      } else {
        console.log("\n  ⚠ Invalid duration format. Using 0.\n");
      }
    }
  } else {
    const pagesInput = await p.text({
      message: "Page range (e.g., 1-350):",
      placeholder: "Enter page range or leave empty",
    });

    if (p.isCancel(pagesInput)) return backup;

    if (pagesInput) {
      const range = parsePageRange(pagesInput);
      if (range) {
        start = range.start;
        end = range.end;
      } else {
        console.log("\n  ⚠ Invalid page range format. Using 0-0.\n");
      }
    }
  }

  if (publicationType === "audiobook" && progressMeasurementType === "pages") {
    progressMeasurementType = "time";
  }

  let narrator: string | undefined;
  if (publicationType === "audiobook") {
    const narratorInput = await p.text({
      message: "Narrator:",
      placeholder: "Enter narrator name or leave empty",
    });

    if (p.isCancel(narratorInput)) return backup;
    if (narratorInput) narrator = narratorInput;
  }

  const newBook: Publication = {
    id: generateId(),
    name: name as string,
    author: (author as string) || undefined,
    publicationType: publicationType as string,
    bookType,
    shelf: (shelf as string) || "To Read",
    narrator,
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

  const publications = backup.publications ?? [];
  publications.push(newBook);
  backup.publications = publications;

  const spinner = p.spinner();
  spinner.start("Saving book...");

  try {
    await saveBackup(backup, filePath);
    spinner.stop(`Added "${name}" (ID: ${shortId(newBook.id!)})`);
  } catch (error) {
    spinner.stop("Failed to save book");
  }

  return backup;
}

async function editBookInteractive(
  backup: Backup,
  book: Publication,
  filePath: string
): Promise<Backup> {
  const fieldToEdit = await p.select({
    message: "Which field to edit?",
    options: [
      { value: "name", label: `Title: ${book.name ?? "Untitled"}` },
      { value: "author", label: `Author: ${book.author ?? "Unknown"}` },
      { value: "shelf", label: `Shelf: ${book.shelf ?? "Unknown"}` },
      { value: "publicationType", label: `Type: ${book.publicationType ?? "book"}` },
      { value: "bookType", label: `Book Format: ${book.bookType ?? "Not set"}` },
      { value: "narrator", label: `Narrator: ${book.narrator ?? "Not set"}` },
      { value: "isbn", label: `ISBN: ${book.isbn ?? "Not set"}` },
      { value: "publisher", label: `Publisher: ${book.publisher ?? "Not set"}` },
      { value: "pages", label: "Page range / Duration" },
      { value: "description", label: "Description" },
      { value: "cancel", label: "Cancel" },
    ],
  });

  if (p.isCancel(fieldToEdit) || fieldToEdit === "cancel") {
    return backup;
  }

  const publications = backup.publications ?? [];
  const bookIndex = publications.findIndex((b) => b.id === book.id);
  if (bookIndex === -1) return backup;

  switch (fieldToEdit) {
    case "name": {
      const newName = await p.text({
        message: "New title:",
        defaultValue: book.name ?? "",
        validate: (v) => (!v.trim() ? "Title is required" : undefined),
      });
      if (!p.isCancel(newName)) {
        publications[bookIndex]!.name = newName as string;
      }
      break;
    }
    case "author": {
      const newAuthor = await p.text({
        message: "New author:",
        defaultValue: book.author ?? "",
      });
      if (!p.isCancel(newAuthor)) {
        publications[bookIndex]!.author = newAuthor as string;
      }
      break;
    }
    case "shelf": {
      const newShelf = await p.text({
        message: "New shelf:",
        defaultValue: book.shelf ?? "",
      });
      if (!p.isCancel(newShelf)) {
        publications[bookIndex]!.shelf = newShelf as string;
      }
      break;
    }
    case "publicationType": {
      const newType = await p.select({
        message: "New publication type:",
        options: [
          { value: "book", label: "Book" },
          { value: "audiobook", label: "Audiobook" },
        ],
      });
      if (!p.isCancel(newType)) {
        publications[bookIndex]!.publicationType = newType as string;
      }
      break;
    }
    case "bookType": {
      const newBookType = await p.select({
        message: "New book format:",
        options: [
          { value: "paperback", label: "Paperback" },
          { value: "hardcover", label: "Hardcover" },
          { value: "ebook", label: "E-book" },
          { value: "clear", label: "Clear (remove value)" },
        ],
      });
      if (!p.isCancel(newBookType)) {
        publications[bookIndex]!.bookType = newBookType === "clear" ? undefined : (newBookType as string);
      }
      break;
    }
    case "narrator": {
      const newNarrator = await p.text({
        message: "New narrator (leave empty to clear):",
        defaultValue: book.narrator ?? "",
      });
      if (!p.isCancel(newNarrator)) {
        publications[bookIndex]!.narrator = (newNarrator as string) || undefined;
      }
      break;
    }
    case "isbn": {
      const newIsbn = await p.text({
        message: "New ISBN (leave empty to clear):",
        defaultValue: book.isbn ?? "",
      });
      if (!p.isCancel(newIsbn)) {
        publications[bookIndex]!.isbn = (newIsbn as string) || undefined;
      }
      break;
    }
    case "publisher": {
      const newPublisher = await p.text({
        message: "New publisher (leave empty to clear):",
        defaultValue: book.publisher ?? "",
      });
      if (!p.isCancel(newPublisher)) {
        publications[bookIndex]!.publisher = (newPublisher as string) || undefined;
      }
      break;
    }
    case "pages": {
      const progressType = book.progressMeasurementType ?? "pages";
      if (progressType === "time") {
        const newDuration = await p.text({
          message: "New duration (e.g., 10h30m):",
          defaultValue: formatDuration(book.end ?? 0),
        });
        if (!p.isCancel(newDuration)) {
          const duration = parseDuration(newDuration as string);
          if (duration !== null) {
            publications[bookIndex]!.end = duration;
          } else {
            console.log("\n  ⚠ Invalid duration format. No changes made.\n");
          }
        }
      } else {
        const newPages = await p.text({
          message: "New page range (e.g., 1-350):",
          defaultValue: `${book.start ?? 0}-${book.end ?? 0}`,
        });
        if (!p.isCancel(newPages)) {
          const range = parsePageRange(newPages as string);
          if (range) {
            publications[bookIndex]!.start = range.start;
            publications[bookIndex]!.end = range.end;
          } else {
            console.log("\n  ⚠ Invalid page range format. No changes made.\n");
          }
        }
      }
      break;
    }
    case "description": {
      const newDesc = await p.text({
        message: "New description (leave empty to clear):",
        defaultValue: book.bookDescription ?? "",
      });
      if (!p.isCancel(newDesc)) {
        publications[bookIndex]!.bookDescription = (newDesc as string) || undefined;
      }
      break;
    }
  }

  backup.publications = publications;

  const spinner = p.spinner();
  spinner.start("Saving changes...");

  try {
    await saveBackup(backup, filePath);
    spinner.stop("Changes saved");
  } catch (error) {
    spinner.stop("Failed to save changes");
  }

  return backup;
}

async function deleteBookInteractive(
  backup: Backup,
  book: Publication,
  filePath: string
): Promise<Backup | null> {
  const confirmed = await p.confirm({
    message: `Are you sure you want to delete "${book.name}"?`,
  });

  if (p.isCancel(confirmed) || !confirmed) {
    return null;
  }

  const publications = backup.publications ?? [];
  backup.publications = publications.filter((b) => b.id !== book.id);

  const spinner = p.spinner();
  spinner.start("Deleting book...");

  try {
    await saveBackup(backup, filePath);
    spinner.stop(`Deleted "${book.name}"`);
  } catch (error) {
    spinner.stop("Failed to delete book");
    return null;
  }

  return backup;
}

function viewSessions(book: Publication): void {
  const sessions = book.readingSessions ?? [];

  if (sessions.length === 0) {
    printBlock("READING SESSIONS", ["No reading sessions recorded for this book."]);
    return;
  }

  const progressType = book.progressMeasurementType ?? "pages";
  const isTime = progressType === "time";

  // First pass: calculate column widths
  const numWidth = Math.max(1, String(sessions.length).length);
  const dateWidth = 12; // Fixed: "Mon DD, YYYY"
  let startWidth = 5; // "Start".length
  let endWidth = 3; // "End".length

  const sessionData: { num: string; date: string; start: string; end: string; hasNote: boolean }[] = [];

  for (let i = 0; i < sessions.length; i++) {
    const session = sessions[i]!;
    const date = session.startDate ? formatCocoaTimestamp(session.startDate) : "Unknown";
    const startVal = session.startValue ?? 0;
    const endVal = session.endValue ?? 0;

    const startStr = isTime ? formatDuration(startVal) : `p.${startVal}`;
    const endStr = isTime ? formatDuration(endVal) : `p.${endVal}`;
    const hasNote = !!(session.notes?.length && session.notes[0]);

    startWidth = Math.max(startWidth, startStr.length);
    endWidth = Math.max(endWidth, endStr.length);

    sessionData.push({
      num: String(i + 1),
      date,
      start: startStr,
      end: endStr,
      hasNote,
    });
  }

  const lines: string[] = [];

  // Header row
  const header =
    "#".padStart(numWidth) + " | " +
    "Date".padEnd(dateWidth) + " | " +
    "Start".padEnd(startWidth) + " | " +
    "End".padEnd(endWidth);
  lines.push(header);

  // Separator row
  const separator =
    "─".repeat(numWidth) + "─┼─" +
    "─".repeat(dateWidth) + "─┼─" +
    "─".repeat(startWidth) + "─┼─" +
    "─".repeat(endWidth);
  lines.push(separator);

  // Data rows
  for (const data of sessionData) {
    const row =
      data.num.padStart(numWidth) + " | " +
      data.date.padEnd(dateWidth) + " | " +
      data.start.padEnd(startWidth) + " | " +
      data.end.padEnd(endWidth) +
      (data.hasNote ? " [note]" : "");
    lines.push(row);
  }

  printBlock(`READING SESSIONS (${sessions.length})`, lines);
}

async function addSessionInteractive(
  backup: Backup,
  book: Publication,
  filePath: string
): Promise<Backup> {
  const progressType = book.progressMeasurementType ?? "pages";
  const isTime = progressType === "time";

  const label = isTime ? "time" : "page";

  const startInput = await p.text({
    message: `Starting ${label}:`,
    placeholder: isTime ? "e.g., 1h30m or 5400" : "e.g., 50",
    validate: (v) => (!v.trim() ? `Starting ${label} is required` : undefined),
  });

  if (p.isCancel(startInput)) return backup;

  const endInput = await p.text({
    message: `Ending ${label}:`,
    placeholder: isTime ? "e.g., 2h or 7200" : "e.g., 100",
    validate: (v) => (!v.trim() ? `Ending ${label} is required` : undefined),
  });

  if (p.isCancel(endInput)) return backup;

  let startValue: number;
  let endValue: number;

  if (isTime) {
    const startDuration = parseDuration(startInput as string);
    const endDuration = parseDuration(endInput as string);
    if (startDuration === null || endDuration === null) {
      console.log("\n  ✗ Invalid time format. Session not added.\n");
      return backup;
    }
    startValue = startDuration;
    endValue = endDuration;
  } else {
    startValue = parseInt(startInput as string, 10);
    endValue = parseInt(endInput as string, 10);
    if (isNaN(startValue) || isNaN(endValue)) {
      console.log("\n  ✗ Invalid page number. Session not added.\n");
      return backup;
    }
  }

  if (startValue > endValue) {
    console.log("\n  ✗ End must be greater than or equal to Start. Session not added.\n");
    return backup;
  }

  const notesInput = await p.text({
    message: "Notes (optional):",
    placeholder: "Any notes about this session",
  });

  if (p.isCancel(notesInput)) return backup;

  const newSession: ReadingSession = {
    id: generateId(),
    startDate: getCurrentCocoaTimestamp(),
    startValue,
    endValue,
    notes: notesInput ? [notesInput as string] : [],
  };

  const publications = backup.publications ?? [];
  const bookIndex = publications.findIndex((b) => b.id === book.id);
  if (bookIndex === -1) return backup;

  if (!publications[bookIndex]!.readingSessions) {
    publications[bookIndex]!.readingSessions = [];
  }
  publications[bookIndex]!.readingSessions!.push(newSession);

  backup.publications = publications;

  const spinner = p.spinner();
  spinner.start("Saving session...");

  try {
    await saveBackup(backup, filePath);
    const progressLabel = isTime ? "time" : "pages";
    spinner.stop(`Added session (${progressLabel} ${startValue} -> ${endValue})`);
  } catch (error) {
    spinner.stop("Failed to save session");
  }

  return backup;
}

async function viewStats(backup: Backup): Promise<void> {
  const publications = backup.publications ?? [];

  const total = publications.length;
  const byType = new Map<string, number>();
  const byShelf = new Map<string, number>();
  let totalSessions = 0;

  for (const pub of publications) {
    const type = pub.publicationType ?? "unknown";
    const shelf = pub.shelf ?? "Unknown";

    byType.set(type, (byType.get(type) ?? 0) + 1);
    byShelf.set(shelf, (byShelf.get(shelf) ?? 0) + 1);
    totalSessions += pub.readingSessions?.length ?? 0;
  }

  const lines: string[] = [];
  lines.push(`Total publications:     ${total}`);
  lines.push(`Total reading sessions: ${totalSessions}`);
  lines.push("");
  lines.push("By type:");
  for (const [type, count] of Array.from(byType.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
    lines.push(`  ${type}: ${count}`);
  }
  lines.push("");
  lines.push("By shelf:");
  for (const [shelf, count] of Array.from(byShelf.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
    lines.push(`  ${shelf}: ${count}`);
  }

  printBlock("LIBRARY STATISTICS", lines);
}
