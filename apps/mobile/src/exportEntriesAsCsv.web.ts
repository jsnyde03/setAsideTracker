import type { Entry } from "./types";
import { entriesToCsv } from "./csvExport";

/**
 * Web CSV export — triggers a normal browser file download via a temporary anchor element.
 * expo-file-system's File/Paths API and expo-sharing's share sheet are both native-only concepts
 * with no real web equivalent, so this path is a from-scratch implementation, not a stub.
 */
export async function exportEntriesAsCsv(entries: Entry[], fileName: string): Promise<void> {
  const csv = entriesToCsv(entries);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
