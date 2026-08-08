import { RequireTaxProfile } from "../src/components/RequireTaxProfile";
import { useGoBack } from "../src/hooks/useGoBack";
import { ScreenFrame } from "../src/components/ScreenFrame";
import { PlatformComparisonScreen } from "../src/screens/PlatformComparisonScreen";
import { useAppData } from "../src/state/AppDataContext";

export default function PlatformComparisonRoute() {
  const goBack = useGoBack();
  const { entries } = useAppData();
  return (
    <RequireTaxProfile>
      <ScreenFrame>
      <PlatformComparisonScreen entries={entries} onClose={goBack} />
      </ScreenFrame>
    </RequireTaxProfile>
  );
}
