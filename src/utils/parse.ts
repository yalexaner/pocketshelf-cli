import { dateToCocoaTimestamp } from "./date";

export interface PageRange {
  start: number;
  end: number;
}

export function parsePageRange(input: string): PageRange | null {
  // Accepts formats: "1-350", "1 - 350", "1..350"
  const match = input.match(/^(\d+)\s*[-\.]+\s*(\d+)$/);
  if (!match) return null;

  const start = parseInt(match[1]!, 10);
  const end = parseInt(match[2]!, 10);

  if (isNaN(start) || isNaN(end) || start < 0 || end < start) {
    return null;
  }

  return { start, end };
}

export function parseDuration(input: string): number | null {
  // Accepts formats: "3600" (seconds), "1h30m", "90m", "1.5h"
  const trimmed = input.trim();

  // Pure seconds
  if (/^\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10);
  }

  // Hours and minutes: "1h30m", "1h", "30m"
  const timeMatch = trimmed.match(/^(?:(\d+(?:\.\d+)?)\s*h)?\s*(?:(\d+)\s*m)?$/i);
  if (timeMatch && (timeMatch[1] || timeMatch[2])) {
    const hours = parseFloat(timeMatch[1] ?? "0");
    const minutes = parseInt(timeMatch[2] ?? "0", 10);
    return Math.round(hours * 3600 + minutes * 60);
  }

  return null;
}

export function parseDate(input: string): number | null {
  // Accepts formats: "2025-01-01", "Jan 1, 2025", or relative "today", "yesterday"
  const trimmed = input.trim().toLowerCase();

  if (trimmed === "today" || trimmed === "now") {
    return dateToCocoaTimestamp(new Date());
  }

  if (trimmed === "yesterday") {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return dateToCocoaTimestamp(date);
  }

  // Try parsing as date string
  const parsed = new Date(input);
  if (!isNaN(parsed.getTime())) {
    return dateToCocoaTimestamp(parsed);
  }

  return null;
}
