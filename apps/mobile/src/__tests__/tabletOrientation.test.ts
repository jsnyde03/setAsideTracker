import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * iPad support is a **split** configuration, and the split is the whole point ([D24]).
 *
 * Expo's `orientation` key is **global**. `@expo/config-plugins`' `setOrientation` writes exactly
 * one Info.plist key — `UISupportedInterfaceOrientations` — and never the `~ipad` variant. So the
 * obvious way to give an iPad landscape ("unlock orientation", as 1.2.7 was originally written)
 * also unlocks rotation on **iPhone**, which is portrait-only, has no landscape design, and has no
 * test coverage at phone width at all. An iPad feature would have regressed the shipping device.
 *
 * What we do instead: leave `orientation: "portrait"` to write the base key for iPhone, and set
 * `UISupportedInterfaceOrientations~ipad` directly in `ios.infoPlist`. iOS prefers the `~ipad`
 * variant on iPad and the base key everywhere else.
 *
 * ⚠️ This relies on a real behaviour of the plugin, verified in its source rather than assumed:
 * `createInfoPlistPluginWithPropertyGuard` skips only when `ios.infoPlist` sets the **exact**
 * property it owns. `UISupportedInterfaceOrientations~ipad` is a different key, so the guard does
 * not fire and the iPhone value is still written from `orientation`.
 *
 * ⛔ **If you are here because you want the iPad to rotate and it doesn't: do not change
 * `orientation`.** That field is the iPhone's. Change the `~ipad` array below.
 */
describe("iPad support without unlocking iPhone rotation ([D24])", () => {
  const APP_JSON = join(__dirname, "..", "..", "app.json");
  const config = JSON.parse(readFileSync(APP_JSON, "utf8"));

  const IPAD_ORIENTATIONS = "UISupportedInterfaceOrientations~ipad";

  it("ships to iPad", () => {
    expect(config.expo.ios.supportsTablet).toBe(true);
  });

  it("keeps the iPhone portrait-only", () => {
    // The global key. Anything other than "portrait" lets a phone rotate into a layout that has
    // never been designed or tested — which is the regression this whole split exists to prevent.
    expect(config.expo.orientation).toBe("portrait");
  });

  it("gives the iPad all four orientations, via the ~ipad variant only", () => {
    const ipad = config.expo.ios.infoPlist?.[IPAD_ORIENTATIONS];
    expect(ipad).toEqual([
      "UIInterfaceOrientationPortrait",
      "UIInterfaceOrientationPortraitUpsideDown",
      "UIInterfaceOrientationLandscapeLeft",
      "UIInterfaceOrientationLandscapeRight",
    ]);
  });

  it("does not set the BASE orientation key in infoPlist — the control", () => {
    // Setting the base key here would silence Expo's orientation plugin via its property guard,
    // and the iPhone's portrait lock would then be coming from a line nobody reads as an iPhone
    // setting. It would also make the assertion above pass while the phone rotates.
    expect(config.expo.ios.infoPlist?.UISupportedInterfaceOrientations).toBeUndefined();
  });
});
