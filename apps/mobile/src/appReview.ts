import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as StoreReview from "expo-store-review";
import { shouldRequestReview, type ReviewTriggerState } from "./appReviewPolicy";

/**
 * Native/IO wrapper around the pure rating-prompt policy in appReviewPolicy.ts. Surfaces the OS
 * rating dialog at most once, when the milestone conditions are first met and the OS supports it —
 * no-op on web. See appReviewPolicy for the "when to ask" rules.
 */

export { REVIEW_ENTRY_THRESHOLD, shouldRequestReview, type ReviewTriggerState } from "./appReviewPolicy";

const REVIEW_REQUESTED_KEY = "gigTaxTracker:reviewRequested";

export async function hasRequestedReview(): Promise<boolean> {
  return (await AsyncStorage.getItem(REVIEW_REQUESTED_KEY)) === "true";
}

async function markReviewRequested(): Promise<void> {
  await AsyncStorage.setItem(REVIEW_REQUESTED_KEY, "true");
}

/**
 * Surfaces the native in-app rating prompt at most once. Returns true only if the prompt was
 * actually requested. Marks the flag whenever the conditions are met and the OS is asked, so we
 * don't re-prompt even if the system chooses not to show the dialog this time.
 */
export async function maybeRequestReview(
  trigger: Omit<ReviewTriggerState, "alreadyRequested">
): Promise<boolean> {
  // The OS rating prompt is native-only; react-native-web has no equivalent.
  if (Platform.OS === "web") return false;

  const alreadyRequested = await hasRequestedReview();
  if (!shouldRequestReview({ ...trigger, alreadyRequested })) return false;

  // isAvailableAsync covers simulators / regions where the prompt can't be shown.
  if (!(await StoreReview.isAvailableAsync())) return false;

  await StoreReview.requestReview();
  await markReviewRequested();
  return true;
}
