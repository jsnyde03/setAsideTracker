import { useRouter } from "expo-router";
import type { TaxProfile } from "../src/types";
import { ScreenFrame } from "../src/components/ScreenFrame";
import { W4OptimizerScreen } from "../src/screens/W4OptimizerScreen";
import { useAppData } from "../src/state/AppDataContext";

export default function W4OptimizerRoute() {
  const router = useRouter();
  const { entries, taxProfile } = useAppData();
  return (
    <ScreenFrame>
      <W4OptimizerScreen
        entries={entries}
        taxProfile={taxProfile as TaxProfile}
        onClose={() => router.back()}
      />
    </ScreenFrame>
  );
}
