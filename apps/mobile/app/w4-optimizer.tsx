import type { TaxProfile } from "../src/types";
import { RequireTaxProfile } from "../src/components/RequireTaxProfile";
import { useGoBack } from "../src/hooks/useGoBack";
import { ScreenFrame } from "../src/components/ScreenFrame";
import { W4OptimizerScreen } from "../src/screens/W4OptimizerScreen";
import { useAppData } from "../src/state/AppDataContext";

export default function W4OptimizerRoute() {
  const goBack = useGoBack();
  const { entries, taxProfile } = useAppData();
  return (
    <RequireTaxProfile>
      <ScreenFrame>
      <W4OptimizerScreen
        entries={entries}
        taxProfile={taxProfile as TaxProfile}
        onClose={goBack}
      />
      </ScreenFrame>
    </RequireTaxProfile>
  );
}
