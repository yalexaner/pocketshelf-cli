import * as readline from "node:readline";
import { loadBackup, saveBackup } from "../storage";
import { shortId } from "../utils/format";

interface DeleteBookOptions {
  file?: string;
  force?: boolean;
}

async function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} (y/N) `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
    });
  });
}

export async function deleteBookCommand(
  id: string,
  options: DeleteBookOptions
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

  // Confirm deletion unless --force
  if (!options.force) {
    const confirmed = await confirm(`Delete "${book.name}"?`);
    if (!confirmed) {
      console.log("Cancelled");
      return;
    }
  }

  publications.splice(bookIndex, 1);
  backup.publications = publications;

  await saveBackup(backup, options.file);

  console.log(`Deleted "${book.name}"`);
}

interface DeleteSessionOptions {
  file?: string;
  force?: boolean;
}

export async function deleteSessionCommand(
  sessionId: string,
  options: DeleteSessionOptions
): Promise<void> {
  const backup = await loadBackup(options.file);
  const publications = backup.publications ?? [];

  // Find the session across all books
  const normalizedId = sessionId.toUpperCase();
  let foundSessionIndex = -1;
  let foundBook = null;

  for (const book of publications) {
    const sessions = book.readingSessions ?? [];
    const index = sessions.findIndex(
      (s) =>
        s.id?.toUpperCase() === normalizedId ||
        s.id?.toUpperCase().startsWith(normalizedId)
    );
    if (index !== -1) {
      foundSessionIndex = index;
      foundBook = book;
      break;
    }
  }

  if (foundSessionIndex === -1 || !foundBook) {
    console.error(`Error: Session not found: ${sessionId}`);
    process.exit(1);
  }

  const session = foundBook.readingSessions![foundSessionIndex]!;

  // Confirm deletion unless --force
  if (!options.force) {
    const confirmed = await confirm(
      `Delete session ${shortId(session.id ?? "")} from "${foundBook.name}"?`
    );
    if (!confirmed) {
      console.log("Cancelled");
      return;
    }
  }

  foundBook.readingSessions!.splice(foundSessionIndex, 1);

  await saveBackup(backup, options.file);

  console.log(`Deleted session from "${foundBook.name}"`);
}
