import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

/**
 * Native (iOS/Android) backup file save/load — same File/Paths + share-sheet pattern as the CSV
 * export. See backupFile.web.ts for the browser equivalent; Metro resolves the right one per
 * platform automatically.
 */
export async function saveBackupFile(json: string, fileName: string): Promise<void> {
  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  file.write(json);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { dialogTitle: "Save backup" });
  } else {
    throw new Error("Sharing isn't available on this device.");
  }
}

/** Returns the picked file's text content, or null if the user canceled the picker. */
export async function pickBackupFile(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/json", "text/plain"],
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;

  const file = new File(result.assets[0].uri);
  return file.text();
}
