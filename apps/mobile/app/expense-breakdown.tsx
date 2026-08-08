import type { TaxProfile } from "../src/types";
import { RequireTaxProfile } from "../src/components/RequireTaxProfile";
import { useGoBack } from "../src/hooks/useGoBack";
import { ScreenFrame } from "../src/components/ScreenFrame";
import { ExpenseBreakdownScreen } from "../src/screens/ExpenseBreakdownScreen";
import { useAppData } from "../src/state/AppDataContext";

export default function ExpenseBreakdownRoute() {
  const goBack = useGoBack();
  const { entries, taxProfile } = useAppData();
  return (
    <RequireTaxProfile>
      <ScreenFrame>
      <ExpenseBreakdownScreen
        entries={entries}
        taxProfile={taxProfile as TaxProfile}
        onClose={goBack}
      />
      </ScreenFrame>
    </RequireTaxProfile>
  );
}
