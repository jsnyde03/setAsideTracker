import type { Ionicons } from "@expo/vector-icons";
import type { GigPlatform } from "./types";

/** Display names for each gig platform, shared across the dashboard, entry list, and the platform
 * comparison so the labels never drift between screens. */
export const PLATFORM_LABELS: Record<GigPlatform, string> = {
  amazonFlex: "Amazon Flex",
  spark: "Spark",
  doordash: "DoorDash",
  uber: "Uber",
  instacart: "Instacart",
  other: "Other",
};

export const PLATFORM_ICONS: Record<GigPlatform, keyof typeof Ionicons.glyphMap> = {
  amazonFlex: "cube-outline",
  spark: "flash-outline",
  doordash: "fast-food-outline",
  uber: "car-outline",
  instacart: "basket-outline",
  other: "ellipsis-horizontal-circle-outline",
};
