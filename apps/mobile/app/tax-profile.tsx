import { Alert } from "react-native";
import type { TaxProfile } from "../src/types";
import { RequireTaxProfile } from "../src/components/RequireTaxProfile";
import { useGoBack } from "../src/hooks/useGoBack";
import { ScreenFrame } from "../src/components/ScreenFrame";
import { EditTaxProfileScreen } from "../src/screens/EditTaxProfileScreen";
import { useAppData } from "../src/state/AppDataContext";
import { reportError } from "../src/errorReporting";

export default function TaxProfileRoute() {
  const goBack = useGoBack();
  const { taxProfile, saveTaxProfile } = useAppData();

  async function handleSave(next: TaxProfile) {
    try {
      await saveTaxProfile(next);
      // Returns to Settings, which is where this is always opened from — history knows, so it no
      // longer needs naming explicitly the way `setScreen("settings")` did.
      goBack();
    } catch (error) {
      reportError(error, { where: "handleSaveTaxProfile" });
      Alert.alert(
        "Couldn't save your tax profile",
        error instanceof Error ? error.message : "An unexpected error occurred. Please try again."
      );
    }
  }

  return (
    <RequireTaxProfile>
      <ScreenFrame>
      <EditTaxProfileScreen
        taxProfile={taxProfile as TaxProfile}
        onSave={handleSave}
        onCancel={goBack}
      />
      </ScreenFrame>
    </RequireTaxProfile>
  );
}
