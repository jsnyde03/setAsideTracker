/**
 * Web backup file save/load. expo-document-picker and expo-file-system's File/Paths API are both
 * native-only concepts with no real web equivalent, so this path is a from-scratch implementation
 * using a normal browser download (export) and a hidden file input (import).
 */
export async function saveBackupFile(json: string, fileName: string): Promise<void> {
  const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Returns the picked file's text content, or null if the user closed the file dialog without
 * choosing anything. */
export function pickBackupFile(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";

    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      file.text().then(resolve);
    };
    // Modern browsers fire "cancel" when the picker is dismissed without choosing a file; older
    // ones don't, in which case onchange simply never fires and this promise never resolves —
    // acceptable fallback since the caller doesn't show a blocking spinner while awaiting this.
    input.addEventListener("cancel", () => resolve(null));
    input.click();
  });
}
