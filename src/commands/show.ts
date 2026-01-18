import { loadBackup } from "../storage";
import { shortId } from "../utils/format";
import { formatCocoaTimestamp, formatDuration } from "../utils/date";
import type { Publication, ReadingSession } from "../types";

interface ShowOptions {
  file?: string;
  json?: boolean;
}

function findPublication(
  publications: Publication[],
  id: string
): Publication | undefined {
  const normalizedId = id.toUpperCase();
  return publications.find(
    (p) =>
      p.id?.toUpperCase() === normalizedId ||
      p.id?.toUpperCase().startsWith(normalizedId)
  );
}

function formatProgress(pub: Publication): string {
  const type = pub.progressMeasurementType ?? "pages";
  const start = pub.start ?? 0;
  const end = pub.end ?? 0;

  if (type === "time") {
    return `${formatDuration(start)} - ${formatDuration(end)}`;
  }
  return `pages ${start}-${end}`;
}

function formatSessionProgress(session: ReadingSession, type: string): string {
  const start = session.startValue ?? 0;
  const end = session.endValue ?? 0;

  if (type === "time") {
    return `${formatDuration(start)} -> ${formatDuration(end)}`;
  }
  return `pages ${start} -> ${end}`;
}

export async function showCommand(
  id: string,
  options: ShowOptions
): Promise<void> {
  const backup = await loadBackup(options.file);
  const publications = backup.publications ?? [];

  const pub = findPublication(publications, id);

  if (!pub) {
    console.error(`Book not found: ${id}`);
    process.exit(1);
  }

  if (options.json) {
    console.log(JSON.stringify(pub, null, 2));
    return;
  }

  console.log(`Title: ${pub.name ?? "Unknown"}`);
  console.log(`Author: ${pub.author ?? "Unknown"}`);

  const typeInfo = [pub.publicationType, pub.bookType]
    .filter(Boolean)
    .join(" (");
  console.log(`Type: ${typeInfo}${pub.bookType ? ")" : ""}`);

  console.log(`Shelf: ${pub.shelf ?? "Unknown"}`);

  if (pub.narrator) {
    console.log(`Narrator: ${pub.narrator}`);
  }
  if (pub.isbn) {
    console.log(`ISBN: ${pub.isbn}`);
  }
  if (pub.publisher) {
    console.log(`Publisher: ${pub.publisher}`);
  }

  console.log(`Progress: ${formatProgress(pub)}`);

  if (pub.added) {
    console.log(`Added: ${formatCocoaTimestamp(pub.added)}`);
  }

  const sessions = pub.readingSessions ?? [];
  console.log(`\nReading Sessions (${sessions.length}):`);

  if (sessions.length === 0) {
    console.log("  No sessions recorded.");
  } else {
    const progressType = pub.progressMeasurementType ?? "pages";
    sessions.forEach((session, i) => {
      const date = session.startDate
        ? formatCocoaTimestamp(session.startDate)
        : "Unknown date";
      const progress = formatSessionProgress(session, progressType);
      console.log(`  #${i + 1}: ${date} - ${progress}`);
    });
  }

  if (pub.bookDescription) {
    console.log(`\nDescription:\n${pub.bookDescription}`);
  }
}

export async function showSessionsCommand(
  id: string,
  options: ShowOptions
): Promise<void> {
  const backup = await loadBackup(options.file);
  const publications = backup.publications ?? [];

  const pub = findPublication(publications, id);

  if (!pub) {
    console.error(`Book not found: ${id}`);
    process.exit(1);
  }

  const sessions = pub.readingSessions ?? [];

  if (options.json) {
    console.log(JSON.stringify(sessions, null, 2));
    return;
  }

  console.log(`Sessions for: ${pub.name} (${shortId(pub.id ?? "")})`);
  console.log();

  if (sessions.length === 0) {
    console.log("No sessions recorded.");
    return;
  }

  const progressType = pub.progressMeasurementType ?? "pages";
  sessions.forEach((session, i) => {
    const date = session.startDate
      ? formatCocoaTimestamp(session.startDate)
      : "Unknown date";
    const progress = formatSessionProgress(session, progressType);
    console.log(`#${i + 1}`);
    console.log(`  ID: ${shortId(session.id ?? "")}`);
    console.log(`  Date: ${date}`);
    console.log(`  Progress: ${progress}`);
    if (session.notes && session.notes.length > 0) {
      console.log(`  Notes: ${JSON.stringify(session.notes)}`);
    }
    console.log();
  });
}
