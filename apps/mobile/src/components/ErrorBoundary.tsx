import { Component, type ErrorInfo, type ReactNode } from "react";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "./PrimaryButton";
import { Screen } from "./Screen";
import { reportError } from "../errorReporting";
import { spacing, type, type Colors } from "../theme";
import { ThemeContext } from "../ThemeContext";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches uncaught errors during rendering anywhere in the app and shows a recoverable fallback
 * instead of a blank white screen. This only catches render/lifecycle errors — async failures in
 * event handlers (a failed save, a failed load) are a different category and are already handled
 * separately via try/catch + Alert.alert at each call site in App.tsx, since error boundaries
 * can't catch those at all.
 *
 * A class component (required for React error boundaries) can't call hooks like useTheme(), so
 * this reads the theme via the older `static contextType` API instead — same ThemeContext, just
 * the class-component-compatible way of consuming it.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  static contextType = ThemeContext;

  // A getter rather than a `declare context: ...` field — Metro's Babel config here doesn't
  // support TypeScript's `declare` class-field modifier (tsc accepts it, but the bundler errors).
  private get theme(): React.ContextType<typeof ThemeContext> {
    return this.context as React.ContextType<typeof ThemeContext>;
  }

  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    reportError(error, { componentStack: info.componentStack ?? undefined });
  }

  handleReset = (): void => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      const styles = createStyles(this.theme.colors);
      return (
        <Screen>
          <View style={styles.container}>
            <Ionicons name="alert-circle-outline" size={36} color={this.theme.colors.danger} />
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.message}>
              {this.state.error.message || "An unexpected error occurred."}
            </Text>
            <Text style={styles.hint}>
              Your data is safe — it's stored locally on this device and wasn't affected by this.
              Try again, and if it keeps happening, force-quitting and reopening the app usually
              helps.
            </Text>
            <View style={styles.buttonWrap}>
              <PrimaryButton label="Try Again" onPress={this.handleReset} />
            </View>
          </View>
        </Screen>
      );
    }

    return this.props.children;
  }
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.xl,
    },
    title: { ...type.title, fontSize: 20, color: colors.ink, marginTop: spacing.md, marginBottom: spacing.sm },
    message: { ...type.body, color: colors.inkSubtle, textAlign: "center", marginBottom: spacing.md },
    hint: {
      ...type.micro,
      color: colors.inkFaint,
      textAlign: "center",
      lineHeight: 16,
      marginBottom: spacing.xl,
    },
    buttonWrap: { width: "100%" },
  });
}
