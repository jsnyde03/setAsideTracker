import { useRouter } from "expo-router";
import type { TaxProfile } from "../src/types";
import { ScreenFrame } from "../src/components/ScreenFrame";
import { WhatIfScreen } from "../src/screens/WhatIfScreen";
import { useAppData } from "../src/state/AppDataContext";

export default function WhatIfRoute() {
  const router = useRouter();
  const { entries, taxProfile } = useAppData();
  return (
    <ScreenFrame>
      <WhatIfScreen
        entries={entries}
        taxProfile={taxProfile as TaxProfile}
        onClose={() => router.back()}
      />
    </ScreenFrame>
  );
}
