import { useRouter } from "expo-router";
import type { TaxProfile } from "../src/types";
import { ScreenFrame } from "../src/components/ScreenFrame";
import { ExpenseBreakdownScreen } from "../src/screens/ExpenseBreakdownScreen";
import { useAppData } from "../src/state/AppDataContext";

export default function ExpenseBreakdownRoute() {
  const router = useRouter();
  const { entries, taxProfile } = useAppData();
  return (
    <ScreenFrame>
      <ExpenseBreakdownScreen
        entries={entries}
        taxProfile={taxProfile as TaxProfile}
        onClose={() => router.back()}
      />
    </ScreenFrame>
  );
}
