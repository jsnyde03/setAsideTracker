import type { TaxProfile } from "../src/types";
import { RequireTaxProfile } from "../src/components/RequireTaxProfile";
import { useGoBack } from "../src/hooks/useGoBack";
import { ScreenFrame } from "../src/components/ScreenFrame";
import { YearOverYearScreen } from "../src/screens/YearOverYearScreen";
import { useAppData } from "../src/state/AppDataContext";

export default function YearOverYearRoute() {
  const goBack = useGoBack();
  const { entries, taxProfile } = useAppData();
  return (
    <RequireTaxProfile>
      <ScreenFrame>
      <YearOverYearScreen
        entries={entries}
        taxProfile={taxProfile as TaxProfile}
        onClose={goBack}
      />
      </ScreenFrame>
    </RequireTaxProfile>
  );
}
