import { Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { Entry } from "../src/types";
import { ScreenFrame } from "../src/components/ScreenFrame";
import { AddEntryScreen } from "../src/screens/AddEntryScreen";
import { useAppData } from "../src/state/AppDataContext";
import { maybeRequestReview } from "../src/appReview";
import { ANALYTICS_EVENTS, trackEvent } from "../src/analytics";
import { reportError } from "../src/errorReporting";

/**
 * Add and edit are one route. Which one it is comes from the `id` param rather than from an
 * `editingEntry` held in app state — the entry being edited is a property of where you are, so it
 * belongs in the URL. That also makes an edit screen survive a reload, which the old state never did.
 */
export default function EntryRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { entries, saveEntry, removeEntry } = useAppData();

  const editingEntry = id ? entries.find((entry) => entry.id === id) : undefined;
  const isEditing = editingEntry !== undefined;

  async function handleSave(entry: Entry) {
    try {
      const updated = await saveEntry(entry, isEditing);
      router.back();
      trackEvent(isEditing ? ANALYTICS_EVENTS.entryUpdated : ANALYTICS_EVENTS.entryLogged, {
        platform: entry.platform,
      });
      // After logging (not editing) a new entry, see if the user has hit the rating-prompt milestone.
      // Fire-and-forget: a failed or declined prompt must never block returning to the dashboard.
      // catchUpMet is left to the dashboard's own trigger — this is the 5th-entry path.
      if (!isEditing) {
        maybeRequestReview({ entryCount: updated.length, catchUpMet: false }).catch((error) =>
          reportError(error, { where: "maybeRequestReview" })
        );
      }
    } catch (error) {
      reportError(error, { where: "handleSaveEntry" });
      Alert.alert(
        "Couldn't save this entry",
        error instanceof Error ? error.message : "An unexpected error occurred. Please try again."
      );
    }
  }

  async function handleDelete(entryId: string) {
    try {
      await removeEntry(entryId);
      router.back();
    } catch (error) {
      reportError(error, { where: "handleDeleteEntry" });
      Alert.alert(
        "Couldn't delete this entry",
        error instanceof Error ? error.message : "An unexpected error occurred. Please try again."
      );
    }
  }

  return (
    <ScreenFrame>
      <AddEntryScreen
        entry={editingEntry}
        onSave={handleSave}
        onCancel={() => router.back()}
        onDelete={handleDelete}
        onOpenPaywall={() => router.push("/paywall")}
      />
    </ScreenFrame>
  );
}
