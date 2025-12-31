// Cocoa/Core Foundation timestamps are seconds since January 1, 2001
const COCOA_EPOCH = Date.UTC(2001, 0, 1);

export function cocoaToDate(cocoaTimestamp: number): Date {
  return new Date(COCOA_EPOCH + cocoaTimestamp * 1000);
}

export function dateToLocalString(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatCocoaTimestamp(cocoaTimestamp: number): string {
  return dateToLocalString(cocoaToDate(cocoaTimestamp));
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
