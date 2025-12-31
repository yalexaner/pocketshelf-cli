export function shortId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 1) + "…";
}

export function padEnd(str: string, length: number): string {
  if (str.length >= length) return str;
  return str + " ".repeat(length - str.length);
}

export function padStart(str: string, length: number): string {
  if (str.length >= length) return str;
  return " ".repeat(length - str.length) + str;
}

interface Column {
  header: string;
  width: number;
  align?: "left" | "right";
}

export function printTable(
  columns: Column[],
  rows: (string | number | undefined)[][]
): void {
  // Print header
  const headerLine = columns
    .map((col) => padEnd(col.header, col.width))
    .join("  ");
  console.log(headerLine);

  // Print rows
  for (const row of rows) {
    const line = columns
      .map((col, i) => {
        const value = String(row[i] ?? "");
        const truncated = truncate(value, col.width);
        return col.align === "right"
          ? padStart(truncated, col.width)
          : padEnd(truncated, col.width);
      })
      .join("  ");
    console.log(line);
  }
}
