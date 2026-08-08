import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { enterDemoMode, exitDemoMode, isDemoModeActive } from "../storage/repository";
import { useAppData } from "../state/AppDataContext";
import { buildDemoSeed } from "./demoSeed";

/**
 * Entering and leaving demo mode, as something React can render from.
 *
 * `isDemoModeActive()` in `demo/demoMode` is module state — correct for the guards, which are called
 * imperatively, but invisible to React: nothing re-renders when it flips. This provider mirrors it
 * into component state so the UI can mark itself (1.2.1.5) and gate premium previews (1.2.1.6).
 *
 * It sits INSIDE `AppDataProvider` because both transitions must be followed by `reload()` — the
 * provider is holding data read from a store that just got swapped underneath it, and without the
 * re-read the app keeps showing the previous world while writing to the new one.
 */
interface DemoContextValue {
  /** True while a demo session is running. */
  isDemo: boolean;
  /** Seeds a fresh demo persona and switches the app onto it. Throws if the seed or re-read fails. */
  enterDemo: () => Promise<void>;
  /** Ends the demo and returns to real data. Throws if the re-read fails. */
  exitDemo: () => Promise<void>;
}

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const { reload } = useAppData();
  // Seeded from the module flag rather than `false` so the two can't start out disagreeing — this
  // provider remounting would otherwise claim demo is off while the store says otherwise.
  const [isDemo, setIsDemo] = useState(isDemoModeActive());

  const enterDemo = useCallback(async () => {
    await enterDemoMode(buildDemoSeed());
    try {
      await reload();
    } catch (error) {
      // Roll back rather than strand the app in a demo it failed to load: without this the store is
      // swapped, the UI still shows real data, and every write from here lands in the demo store —
      // which looks exactly like the user's edits silently not saving.
      exitDemoMode();
      await reload().catch(() => {});
      throw error;
    }
    setIsDemo(true);
  }, [reload]);

  const exitDemo = useCallback(async () => {
    exitDemoMode();
    // Flipped before the re-read, and deliberately: the demo store is already gone, so any render
    // between here and the reload resolving must not still be claiming demo. There is nothing to
    // roll back to — leaving is always safe.
    setIsDemo(false);
    await reload();
  }, [reload]);

  const value = useMemo<DemoContextValue>(
    () => ({ isDemo, enterDemo, exitDemo }),
    [isDemo, enterDemo, exitDemo]
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

/**
 * Read demo state. Returns a safe default rather than throwing when there's no provider, unlike
 * `useAppData` — demo is an additive overlay, and a screen rendered outside the provider (a test
 * harness, a future route group) should behave as the normal app, not crash.
 */
export function useDemo(): DemoContextValue {
  return (
    useContext(DemoContext) ?? {
      isDemo: false,
      enterDemo: async () => {},
      exitDemo: async () => {},
    }
  );
}
