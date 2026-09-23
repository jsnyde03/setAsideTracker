import { useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import * as Sharing from "expo-sharing";
import { captureRef } from "react-native-view-shot";
import { ShareCard, type ShareCardData } from "./ShareCard";
import { reportError } from "../errorReporting";
import { radius, shadow, spacing, type, type Colors } from "../theme";
import { useTheme } from "../ThemeContext";
import { resolveSheetAnimation } from "../motion";
import { useReduceMotion } from "../useReduceMotion";
import { useSheetWidthStyle } from "../useSizeClass";

interface ShareEarningsModalProps {
  visible: boolean;
  onClose: () => void;
  data: ShareCardData;
}

// Match the rest of the app: skip slide animation on web, where rAF-driven animations can stall.
// web stays "none" (react-native-web's Animated can stall); Reduce Motion turns the slide
// into a cross-fade rather than removing the transition. Rule + reasoning in ../motion.
const IS_WEB = Platform.OS === "web";

/**
 * Bottom sheet that previews the shareable earnings card and exports it as an image via the native
 * share sheet. The capture (react-native-view-shot) and share (expo-sharing) are native-only — on
 * web the preview still renders, but the share button is disabled with a note, since neither API
 * works in a browser. Verified for real on a device/TestFlight, not here.
 */
export function ShareEarningsModal({ visible, onClose, data }: ShareEarningsModalProps) {
  const { colors } = useTheme();
  const sheetAnimation = resolveSheetAnimation(useReduceMotion(), IS_WEB);
  const styles = createStyles(colors);
  const sheetWidth = useSheetWidthStyle();
  const cardRef = useRef<View>(null);
  const [busy, setBusy] = useState(false);
  const canShare = Platform.OS !== "web";

  async function handleShare() {
    if (!canShare || busy) return;
    setBusy(true);
    try {
      const uri = await captureRef(cardRef, { format: "png", quality: 1 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      }
    } catch (error) {
      reportError(error, { where: "ShareEarningsModal.handleShare" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType={sheetAnimation} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropFill} onPress={onClose} accessibilityLabel="Dismiss share" />
        <View style={[styles.sheet, sheetWidth]}>
          <View style={styles.handle} />
          <View style={styles.titleRow}>
            <Text style={styles.title}>Share your earnings</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close" size={22} color={colors.inkSubtle} />
            </Pressable>
          </View>

          <View style={styles.cardWrap}>
            <ShareCard ref={cardRef} {...data} />
          </View>

          <Pressable
            onPress={handleShare}
            disabled={!canShare || busy}
            style={({ pressed }) => [styles.shareButton, (!canShare || busy) && styles.shareButtonDisabled, pressed && styles.shareButtonPressed]}
            accessibilityRole="button"
            accessibilityLabel="Share earnings image"
          >
            <Ionicons name="share-outline" size={18} color="#fff" />
            <Text style={styles.shareButtonText}>{busy ? "Preparing…" : "Share image"}</Text>
          </Pressable>
          {!canShare && (
            <Text style={styles.webNote}>Sharing works on the iOS app — preview only here.</Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: colors.overlay },
    backdropFill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingTop: spacing.sm,
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.xxl,
      ...shadow,
    },
    handle: {
      alignSelf: "center",
      width: 40,
      height: 4,
      borderRadius: radius.pill,
      backgroundColor: colors.border,
      marginBottom: spacing.md,
    },
    titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.lg },
    title: { ...type.title, fontSize: 20, color: colors.ink },
    cardWrap: { marginBottom: spacing.lg },
    shareButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      // White label — primaryButton, not primary. See theme.ts.
      backgroundColor: colors.primaryButton,
      borderRadius: radius.md,
      paddingVertical: 14,
    },
    shareButtonDisabled: { opacity: 0.5 },
    shareButtonPressed: { opacity: 0.85 },
    shareButtonText: { ...type.subtitle, color: "#fff" },
    webNote: { ...type.micro, color: colors.inkFaint, textAlign: "center", marginTop: spacing.sm },
  });
}
