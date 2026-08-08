import { useRouter } from "expo-router";
import { ScreenFrame } from "../src/components/ScreenFrame";
import { PlatformComparisonScreen } from "../src/screens/PlatformComparisonScreen";
import { useAppData } from "../src/state/AppDataContext";

export default function PlatformComparisonRoute() {
  const router = useRouter();
  const { entries } = useAppData();
  return (
    <ScreenFrame>
      <PlatformComparisonScreen entries={entries} onClose={() => router.back()} />
    </ScreenFrame>
  );
}
