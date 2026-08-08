import { ScreenFrame } from "../src/components/ScreenFrame";
import { useGoBack } from "../src/hooks/useGoBack";
import { PaywallScreen } from "../src/screens/PaywallScreen";

/**
 * `router.back()` is the whole of what `paywallOrigin` used to do. The paywall is reachable from the
 * dashboard, Settings and the entry form, and `App.tsx` tracked which one in state so it could return
 * there. Real history knows already — so 1.2.0.6 ("delete paywallOrigin") is satisfied here rather
 * than as its own step; there is nothing left of it to delete separately.
 */
export default function PaywallRoute() {
  const goBack = useGoBack();
  return (
    <ScreenFrame>
      <PaywallScreen onClose={goBack} />
    </ScreenFrame>
  );
}
