import { Alert } from "react-native";
import { useRouter } from "expo-router";
import type { FiledYearTax, TaxProfile } from "../src/types";
import { ScreenFrame } from "../src/components/ScreenFrame";
import { SafeHarborScreen } from "../src/screens/SafeHarborScreen";
import { useAppData } from "../src/state/AppDataContext";
import { reportError } from "../src/errorReporting";

export default function SafeHarborRoute() {
  const router = useRouter();
  const { entries, taxProfile, updateFiledTax } = useAppData();

  async function handleUpdateFiledTax(year: number, filed: FiledYearTax) {
    try {
      await updateFiledTax(year, filed);
    } catch (error) {
      reportError(error, { where: "handleUpdateFiledTax" });
      Alert.alert(
        "Couldn't save",
        error instanceof Error ? error.message : "An unexpected error occurred. Please try again."
      );
    }
  }

  return (
    <ScreenFrame>
      <SafeHarborScreen
        entries={entries}
        taxProfile={taxProfile as TaxProfile}
        onClose={() => router.back()}
        onUpdateFiledTax={handleUpdateFiledTax}
      />
    </ScreenFrame>
  );
}
