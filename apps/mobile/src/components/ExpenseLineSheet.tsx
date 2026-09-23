import { Ionicons } from "@expo/vector-icons";
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { LineContribution, ScheduleCLine } from "../scheduleC";
import { radius, shadow, spacing, type, type Colors } from "../theme";
import { useTheme } from "../ThemeContext";
import { resolveSheetAnimation } from "../motion";
import { useReduceMotion } from "../useReduceMotion";
import { useSheetWidthStyle } from "../useSizeClass";

interface ExpenseLineSheetProps {
  /** The line being drilled into; when null the sheet is hidden. */
  line: ScheduleCLine | null;
  /** The entries making it up, largest first. */
  contributions: LineContribution[];
  onClose: () => void;
}

// ⚠️ Same reason as `BreakdownDetailSheet` and `Screen`: react-native-web's rAF-driven animations
// can stall on a headless or backgrounded tab, which hangs the e2e suite rather than failing it.
// Native keeps the slide.
// web stays "none" (react-native-web's Animated can stall); Reduce Motion turns the slide
// into a cross-fade rather than removing the transition. Rule + reasoning in ../motion.
const IS_WEB = Platform.OS === "web";

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function formatDate(iso: string): string {
  // Split rather than `new Date(iso)` — the latter parses YYYY-MM-DD as UTC midnight, which is the
  // previous day in every US timezone, so every row would be dated a day early.
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Which entries make up one Schedule C line (Premium). Purely presentational — the attribution is
 * `contributionsForLine`'s, and the rows sum to the line by construction, asserted by its tests.
 *
 * This is substantiation rather than explanation, which is why it is a separate sheet from
 * `BreakdownDetailSheet`: that one answers "how was this calculated" with glossary terms, and this
 * one answers "which of my shifts is this made of" for someone matching a figure against records.
 */
export function ExpenseLineSheet({ line, contributions, onClose }: ExpenseLineSheetProps) {
  const { colors } = useTheme();
  const sheetAnimation = resolveSheetAnimation(useReduceMotion(), IS_WEB);
  const styles = createStyles(colors);
  const sheetWidth = useSheetWidthStyle();

  return (
    <Modal
      visible={line !== null}
      transparent
      animationType={sheetAnimation}
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropFill} onPress={onClose} accessibilityLabel="Dismiss details" />
        <View style={[styles.sheet, sheetWidth]} accessibilityViewIsModal>
          <View style={styles.handle} />
          {line && (
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} bounces={false}>
              <View style={styles.titleRow}>
                <Text style={styles.title}>
                  Line {line.line} · {line.label}
                </Text>
                {/* ⚠️ "Close details", not "Close". The screen underneath keeps its own "Close"
                    in the tree while this sheet is up, so two controls with the same name are
                    reachable at once — ambiguous to a screen reader, and it made an e2e click the
                    wrong one and time out against a button the modal was covering. */}
                <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close details">
                  <Ionicons name="close" size={22} color={colors.inkSubtle} />
                </Pressable>
              </View>

              <Text style={styles.intro}>
                The {contributions.length} {contributions.length === 1 ? "entry" : "entries"} that make
                up {formatCurrency(line.amount)}, largest first.
              </Text>

              <View style={styles.rows}>
                {contributions.map((row) => (
                  // Labelled as one group. Left as three separate Texts a screen reader announces
                  // the date, the detail and the amount as unrelated fragments, and the amount —
                  // the point of the row — arrives with nothing attached to it.
                  <View
                    key={row.entryId}
                    style={styles.row}
                    accessible
                    accessibilityLabel={`Entry ${formatDate(row.date)}, ${row.platformLabel}: ${formatCurrency(row.amount)}${row.detail !== undefined ? `, ${row.detail}` : ""}`}
                  >
                    <View style={styles.rowInfo}>
                      <Text style={styles.rowLabel}>
                        {formatDate(row.date)} · {row.platformLabel}
                      </Text>
                      {row.detail !== undefined && <Text style={styles.rowDetail}>{row.detail}</Text>}
                    </View>
                    <Text style={styles.rowValue}>{formatCurrency(row.amount)}</Text>
                  </View>
                ))}
                <View style={[styles.row, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Line {line.line} total</Text>
                  <Text style={styles.totalValue}>{formatCurrency(line.amount)}</Text>
                </View>
              </View>

              <Text style={styles.footnote}>
                Matches the figure on the previous screen — these rows add up to it. Keep your own
                receipts and mileage log; this is what you logged, not a substitute for records.
              </Text>
            </ScrollView>
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
      paddingBottom: spacing.xxl,
      maxHeight: "85%",
      ...shadow,
    },
    handle: {
      alignSelf: "center",
      width: 40,
      height: 4,
      borderRadius: radius.pill,
      backgroundColor: colors.border,
      marginBottom: spacing.sm,
    },
    content: { paddingHorizontal: spacing.xl },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: spacing.sm,
      gap: spacing.sm,
    },
    title: { ...type.title, fontSize: 19, color: colors.ink, flex: 1 },
    intro: { ...type.caption, color: colors.inkSubtle, lineHeight: 18, marginBottom: spacing.lg },
    rows: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.xs,
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: spacing.sm,
      gap: spacing.md,
    },
    rowInfo: { flex: 1 },
    rowLabel: { ...type.caption, color: colors.ink },
    rowDetail: { ...type.micro, color: colors.inkFaint, marginTop: 1 },
    rowValue: { ...type.caption, color: colors.ink, fontWeight: "700" },
    totalRow: { borderTopWidth: 1.5, borderTopColor: colors.border, marginTop: spacing.xs },
    totalLabel: { ...type.caption, color: colors.ink, fontWeight: "700" },
    totalValue: { ...type.caption, color: colors.ink, fontWeight: "800" },
    footnote: { ...type.micro, color: colors.inkFaint, marginTop: spacing.lg, lineHeight: 15 },
  });
}
