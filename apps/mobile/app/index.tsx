import { Alert } from "react-native";
import { Redirect, useRouter } from "expo-router";
import type { Entry, TaxProfile } from "../src/types";
import { ScreenFrame } from "../src/components/ScreenFrame";
import { DashboardScreen } from "../src/screens/DashboardScreen";
import { useAppData } from "../src/state/AppDataContext";
import { reportError } from "../src/errorReporting";

export default function DashboardRoute() {
  const router = useRouter();
  const { entries, localUserProfile, taxProfile, updateAmountSetAside } = useAppData();

  // Where the app opens is still derived from the data rather than decided by an effect — the same
  // reasoning as 1.2.0.3, now expressed as a redirect. `AppGate` has already waited for the load, so
  // an absent profile here means genuinely absent, not merely not-loaded-yet.
  if (!localUserProfile || !taxProfile) {
    return <Redirect href="/onboarding" />;
  }

  async function handleUpdateAmountSetAside(year: number, amount: number) {
    try {
      await updateAmountSetAside(year, amount);
    } catch (error) {
      reportError(error, { where: "handleUpdateAmountSetAside" });
      Alert.alert(
        "Couldn't save",
        error instanceof Error ? error.message : "An unexpected error occurred. Please try again."
      );
    }
  }

  return (
    <ScreenFrame>
      <DashboardScreen
        entries={entries}
        taxProfile={taxProfile as TaxProfile}
        onAddEntry={() => router.push("/entry")}
        onEditEntry={(entry: Entry) => router.push({ pathname: "/entry", params: { id: entry.id } })}
        onOpenSettings={() => router.push("/settings")}
        onOpenWhatIf={() => router.push("/what-if")}
        onOpenPlatforms={() => router.push("/platform-comparison")}
        onOpenW4Optimizer={() => router.push("/w4-optimizer")}
        onOpenSafeHarbor={() => router.push("/safe-harbor")}
        onOpenYearOverYear={() => router.push("/year-over-year")}
        onOpenExpenseBreakdown={() => router.push("/expense-breakdown")}
        onOpenPaywall={() => router.push("/paywall")}
        onUpdateAmountSetAside={handleUpdateAmountSetAside}
      />
    </ScreenFrame>
  );
}
