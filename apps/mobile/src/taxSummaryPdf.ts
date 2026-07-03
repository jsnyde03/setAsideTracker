import { File, Paths } from "expo-file-system";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

/**
 * Native (iOS/Android) tax-summary export — renders the HTML to a PDF via expo-print, gives it a
 * friendly file name, then opens the system share sheet (save to Files, email, AirDrop, etc.). See
 * taxSummaryPdf.web.ts for the browser equivalent; Metro resolves the right one per platform. The
 * HTML is produced by the pure buildTaxSummaryHtml so the document content is unit-testable.
 */
export async function exportTaxSummaryPdf(html: string, fileName: string): Promise<void> {
  const { uri } = await Print.printToFileAsync({ html });

  // printToFileAsync writes to a temp file with a generated name; rename it (e.g.
  // "tax-summary-2026.pdf") so the share sheet and any saved copy are clearly labeled — same intent
  // as the named file in exportEntriesAsCsv.
  let shareUri = uri;
  try {
    const dest = new File(Paths.cache, fileName);
    if (dest.exists) dest.delete();
    new File(uri).moveSync(dest);
    shareUri = dest.uri;
  } catch {
    // If the rename fails for any reason, fall back to sharing the original temp file.
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(shareUri, {
      mimeType: "application/pdf",
      dialogTitle: "Tax summary",
      UTI: "com.adobe.pdf",
    });
  } else {
    throw new Error("Sharing isn't available on this device.");
  }
}
