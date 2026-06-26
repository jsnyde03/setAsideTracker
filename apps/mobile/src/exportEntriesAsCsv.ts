import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import type { Entry } from "./types";
import { entriesToCsv } from "./csvExport";

/**
 * Native (iOS/Android) CSV export — writes to a temp file in the cache directory, then opens the
 * system share sheet so the user can save it to Files, email it, AirDrop it, etc. See
 * exportEntriesAsCsv.web.ts for the browser-download equivalent; Metro resolves the right one per
 * platform automatically.
 */
export async function exportEntriesAsCsv(entries: Entry[], fileName: string): Promise<void> {
  const csv = entriesToCsv(entries);
  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  file.write(csv);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { dialogTitle: "Export entries as CSV" });
  } else {
    throw new Error("Sharing isn't available on this device.");
  }
}
