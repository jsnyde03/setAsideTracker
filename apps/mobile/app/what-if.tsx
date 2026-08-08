import type { TaxProfile } from "../src/types";
import { RequireTaxProfile } from "../src/components/RequireTaxProfile";
import { useGoBack } from "../src/hooks/useGoBack";
import { ScreenFrame } from "../src/components/ScreenFrame";
import { WhatIfScreen } from "../src/screens/WhatIfScreen";
import { useAppData } from "../src/state/AppDataContext";

export default function WhatIfRoute() {
  const goBack = useGoBack();
  const { entries, taxProfile } = useAppData();
  return (
    <RequireTaxProfile>
      <ScreenFrame>
      <WhatIfScreen
        entries={entries}
        taxProfile={taxProfile as TaxProfile}
        onClose={goBack}
      />
      </ScreenFrame>
    </RequireTaxProfile>
  );
}
