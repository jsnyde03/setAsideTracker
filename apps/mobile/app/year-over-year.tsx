import { useRouter } from "expo-router";
import type { TaxProfile } from "../src/types";
import { ScreenFrame } from "../src/components/ScreenFrame";
import { YearOverYearScreen } from "../src/screens/YearOverYearScreen";
import { useAppData } from "../src/state/AppDataContext";

export default function YearOverYearRoute() {
  const router = useRouter();
  const { entries, taxProfile } = useAppData();
  return (
    <ScreenFrame>
      <YearOverYearScreen
        entries={entries}
        taxProfile={taxProfile as TaxProfile}
        onClose={() => router.back()}
      />
    </ScreenFrame>
  );
}
