/**
 * Web tax-summary "export" — opens the rendered HTML in a new window and triggers the browser's
 * print dialog (Print → Save as PDF). expo-print's printToFileAsync and expo-sharing's share sheet
 * are native-only, so this is a from-scratch web path, mirroring exportEntriesAsCsv.web.ts. Rarely
 * reached in practice: the export is premium-gated and IAP isn't available on web.
 */
export async function exportTaxSummaryPdf(html: string, _fileName: string): Promise<void> {
  const win = window.open("", "_blank");
  if (!win) {
    throw new Error("Couldn't open the print window — check your browser's popup blocker.");
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}
