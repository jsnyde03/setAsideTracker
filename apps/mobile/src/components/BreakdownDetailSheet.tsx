import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { BreakdownDetail } from "../breakdownDetails";
import { glossaryEntry, type GlossaryTermKey } from "../glossary";
import { radius, shadow, spacing, type, type Colors } from "../theme";
import { useTheme } from "../ThemeContext";

interface BreakdownDetailSheetProps {
  /** The detail to show; when null the sheet is hidden. */
  detail: BreakdownDetail | null;
  onClose: () => void;
}

// react-native-web's rAF-driven animations can stall on headless/backgrounded tabs (see Screen.tsx
// and the dashboard summary card) — skip the slide animation on web, keep it on native.
const SHEET_ANIMATION = Platform.OS === "web" ? "none" : "slide";

/**
 * Bottom-sheet modal that explains how one dashboard tax figure was calculated — the UI side of the
 * "show your math" audit trail. Purely presentational: it renders a BreakdownDetail built by
 * breakdownDetails.ts and owns no tax logic.
 */
export function BreakdownDetailSheet({ detail, onClose }: BreakdownDetailSheetProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  // Which glossary term's plain-language definition is expanded inline (null = none). Reset whenever
  // a different breakdown is opened so a term left open on one sheet doesn't bleed into the next.
  const [openTerm, setOpenTerm] = useState<GlossaryTermKey | null>(null);
  useEffect(() => {
    setOpenTerm(null);
  }, [detail?.title]);

  return (
    <Modal
      visible={detail !== null}
      transparent
      animationType={SHEET_ANIMATION}
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <View style={styles.backdrop}>
        {/* Tapping the dimmed area outside the card dismisses the sheet. */}
        <Pressable style={styles.backdropFill} onPress={onClose} accessibilityLabel="Dismiss details" />
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.handle} />
          {detail && (
            <ScrollView
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <View style={styles.titleRow}>
                <Text style={styles.title}>{detail.title}</Text>
                <Pressable
                  onPress={onClose}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                >
                  <Ionicons name="close" size={22} color={colors.inkSubtle} />
                </Pressable>
              </View>

              <Text style={styles.intro}>{detail.intro}</Text>

              {detail.lines.length > 0 && (
                <View style={styles.lines}>
                  {detail.lines.map((line, index) => {
                    const isTotal = line.kind === "total";
                    return (
                      <View
                        key={`${line.label}-${index}`}
                        style={[styles.line, isTotal && styles.totalLine]}
                      >
                        <Text
                          style={[
                            styles.lineLabel,
                            line.kind === "subtle" && styles.subtleText,
                            isTotal && styles.totalText,
                          ]}
                        >
                          {line.label}
                        </Text>
                        <Text
                          style={[
                            styles.lineValue,
                            line.kind === "subtle" && styles.subtleText,
                            line.kind === "credit" && styles.creditText,
                            isTotal && styles.totalText,
                          ]}
                        >
                          {line.value}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}

              {detail.footnote && <Text style={styles.footnote}>{detail.footnote}</Text>}

              {detail.terms.length > 0 && (
                <View style={styles.termsSection}>
                  <Text style={styles.termsHeader}>What these mean</Text>
                  <View style={styles.termPills}>
                    {detail.terms.map((key) => {
                      const entry = glossaryEntry(key);
                      const active = openTerm === key;
                      return (
                        <Pressable
                          key={key}
                          onPress={() => setOpenTerm(active ? null : key)}
                          style={[styles.termPill, active && styles.termPillActive]}
                          accessibilityRole="button"
                          accessibilityState={{ expanded: active }}
                          accessibilityLabel={`Define ${entry.term}`}
                        >
                          <Text style={[styles.termPillText, active && styles.termPillTextActive]}>
                            {entry.term}
                          </Text>
                          <Ionicons
                            name={active ? "chevron-up" : "help-circle-outline"}
                            size={13}
                            color={active ? colors.primaryDark : colors.inkSubtle}
                          />
                        </Pressable>
                      );
                    })}
                  </View>
                  {openTerm && (
                    <View style={styles.definitionCard}>
                      <Text style={styles.definitionTerm}>{glossaryEntry(openTerm).term}</Text>
                      <Text style={styles.definitionText}>{glossaryEntry(openTerm).definition}</Text>
                    </View>
                  )}
                </View>
              )}

              <Text style={styles.disclaimer}>Estimates for planning only — not tax advice.</Text>
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
    },
    title: { ...type.title, fontSize: 20, color: colors.ink, flex: 1 },
    intro: { ...type.caption, color: colors.inkSubtle, lineHeight: 18, marginBottom: spacing.lg },
    lines: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.xs,
    },
    line: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: spacing.sm,
      gap: spacing.md,
    },
    totalLine: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginTop: spacing.xs,
    },
    lineLabel: { ...type.caption, color: colors.ink, flex: 1 },
    lineValue: { ...type.caption, color: colors.ink, fontWeight: "600" },
    subtleText: { color: colors.inkFaint, fontWeight: "400" },
    creditText: { color: colors.accent, fontWeight: "600" },
    totalText: { ...type.subtitle, color: colors.ink },
    footnote: {
      ...type.micro,
      color: colors.inkSubtle,
      lineHeight: 15,
      marginTop: spacing.lg,
    },
    termsSection: { marginTop: spacing.lg },
    termsHeader: { ...type.label, color: colors.inkSubtle, marginBottom: spacing.sm },
    termPills: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
    termPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.pill,
      paddingVertical: 6,
      paddingHorizontal: 12,
      backgroundColor: colors.surfaceAlt,
    },
    termPillActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
    termPillText: { ...type.caption, color: colors.inkSubtle, fontWeight: "600" },
    termPillTextActive: { color: colors.primaryDark },
    definitionCard: {
      marginTop: spacing.md,
      backgroundColor: colors.primarySoft,
      borderRadius: radius.md,
      padding: spacing.md,
    },
    definitionTerm: { ...type.label, color: colors.primaryDark, marginBottom: 2 },
    definitionText: { ...type.caption, color: colors.ink, lineHeight: 18 },
    disclaimer: { ...type.micro, color: colors.inkFaint, marginTop: spacing.lg },
  });
}
