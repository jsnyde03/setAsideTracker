import { Alert } from "react-native";
import type { FiledYearTax, TaxProfile } from "../src/types";
import { RequireTaxProfile } from "../src/components/RequireTaxProfile";
import { useGoBack } from "../src/hooks/useGoBack";
import { ScreenFrame } from "../src/components/ScreenFrame";
import { SafeHarborScreen } from "../src/screens/SafeHarborScreen";
import { useAppData } from "../src/state/AppDataContext";
import type { QuarterKey } from "../src/quarterlyPayments";
import { reportError } from "../src/errorReporting";

export default function SafeHarborRoute() {
  const goBack = useGoBack();
  const { entries, taxProfile, updateFiledTax, updateQuarterlyPayment } = useAppData();

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

  async function handleUpdateQuarterlyPayment(year: number, quarter: QuarterKey, amount: number | undefined) {
    try {
      await updateQuarterlyPayment(year, quarter, amount);
    } catch (error) {
      reportError(error, { where: "handleUpdateQuarterlyPayment" });
      Alert.alert(
        "Couldn't save",
        error instanceof Error ? error.message : "An unexpected error occurred. Please try again."
      );
    }
  }

  return (
    <RequireTaxProfile>
      <ScreenFrame>
      <SafeHarborScreen
        entries={entries}
        taxProfile={taxProfile as TaxProfile}
        onClose={goBack}
        onUpdateFiledTax={handleUpdateFiledTax}
        onUpdateQuarterlyPayment={handleUpdateQuarterlyPayment}
      />
      </ScreenFrame>
    </RequireTaxProfile>
  );
}
