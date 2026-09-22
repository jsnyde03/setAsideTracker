import { RequireTaxProfile } from "../src/components/RequireTaxProfile";
import { useGoBack } from "../src/hooks/useGoBack";
import { ScreenFrame } from "../src/components/ScreenFrame";
import { BestDaysScreen } from "../src/screens/BestDaysScreen";
import { useAppData } from "../src/state/AppDataContext";

export default function BestDaysRoute() {
  const goBack = useGoBack();
  const { entries } = useAppData();
  return (
    <RequireTaxProfile>
      <ScreenFrame>
        <BestDaysScreen entries={entries} onClose={goBack} />
      </ScreenFrame>
    </RequireTaxProfile>
  );
}
