import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Chip } from "./Chip";
import { TextField } from "./TextField";
import { searchStates, stateName, US_STATES } from "../states";
import { spacing, type, type Colors } from "../theme";
import { useTheme } from "../ThemeContext";

interface StatePickerProps {
  /** Currently selected two-letter code, or "" when nothing is chosen yet. */
  value: string;
  onChange: (code: string) => void;
  label?: string;
}

/** How many matches to show at once. The full list is 51; a wall of chips buries the field below
 *  it, and anyone scanning rather than searching still gets a visible sample to start from. */
const MAX_VISIBLE = 8;

/**
 * Pick a state by name or code.
 *
 * ⚠️ **Replaces a free-text field, and the free text was a real defect.** Typing "California"
 * produced the key `CALIFORNIA`, which matches nothing, so the app computed **$0 state tax** and
 * told the user *"CALIFORNIA isn't supported yet"* — over a config that has always held all 50
 * states plus DC. It sat on the first screen anyone sees, so the cost was an abandoned onboarding
 * and a wrong number for anyone who pushed past it.
 *
 * Deliberately a search-and-chips field rather than a modal: it matches the county selector
 * directly above it, adds no new navigation, and keeps working under react-native-web, where a
 * native picker renders as nothing and the e2e suite would go blind.
 */
export function StatePicker({ value, onChange, label = "State you primarily work in" }: StatePickerProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [query, setQuery] = useState("");

  const matches = useMemo(() => searchStates(query), [query]);

  /**
   * Typing an exact two-letter code selects it outright, with no tap needed.
   *
   * ⭐ That keeps every existing test flow working — they type "TX" and move on — while the chip
   * list below fixes the case that was broken, someone typing "California". The query is
   * deliberately NOT cleared on auto-select: clearing it would eat the rest of the word, so
   * "California" would auto-select CA at the second letter and then type "lifornia" into an empty
   * field.
   */
  function handleQueryChange(next: string) {
    setQuery(next);
    const code = next.trim().toUpperCase();
    if (US_STATES.some((s) => s.code === code)) {
      onChange(code);
    }
  }
  const visible = matches.slice(0, MAX_VISIBLE);
  const selected = US_STATES.find((s) => s.code === value);

  return (
    <View>
      <TextField
        label={label}
        hint={
          selected
            ? `Selected: ${selected.name}. Type again to change it.`
            : "All 50 states and DC are supported. Type a name or a two-letter code."
        }
        // ⚠️ Placeholder and accessible name are deliberately UNCHANGED from the free-text field
        // this replaces. The Maestro flows select this input by "State you primarily work in" and
        // tap it by "e.g. CA", and Maestro is out of build minutes until ~November — a renamed
        // selector could not be re-validated for weeks. Fixing a defect must not blind the suite
        // that would catch the next one.
        placeholder="e.g. CA"
        value={query}
        onChangeText={handleQueryChange}
        autoCapitalize="words"
      />

      {selected && query.trim().length === 0 ? (
        <View style={styles.optionGrid}>
          <Chip label={selected.name} selected onPress={() => undefined} />
        </View>
      ) : null}

      {visible.length > 0 ? (
        <View style={styles.optionGrid}>
          {visible.map((s) => (
            <Chip
              key={s.code}
              label={s.name}
              selected={s.code === value}
              onPress={() => {
                onChange(s.code);
                // Collapse back to the selection rather than leaving a filtered list open — the
                // chosen state stays visible above, and the next field is reachable without
                // scrolling past 8 rows of chips.
                setQuery("");
              }}
            />
          ))}
        </View>
      ) : (
        <Text style={styles.empty}>
          No match. U.S. territories aren't supported yet — everything else is.
        </Text>
      )}

      {matches.length > MAX_VISIBLE ? (
        <Text style={styles.more}>
          {matches.length - MAX_VISIBLE} more — keep typing to narrow it down.
        </Text>
      ) : null}
    </View>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    optionGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md },
    empty: { ...type.micro, color: colors.inkSubtle, marginBottom: spacing.md },
    more: { ...type.micro, color: colors.inkFaint, marginBottom: spacing.md },
  });
