import { useEffect, useRef } from "react";
import { refreshQuarterlyReminders } from "../notifications/scheduleReminders";
import { useAppData } from "../state/AppDataContext";

/**
 * Rebuilds the scheduled quarterly reminders once per launch, as soon as the stored settings are in.
 *
 * ## Why a hook rather than a side effect in `_layout.tsx`
 *
 * `resumeTripIfRunning` can fire at module scope because it reads its own persisted state. This
 * cannot: the decision depends on `remindersEnabled`, which only exists after `AppDataProvider` has
 * loaded — so it has to run below the providers, after `ready`.
 *
 * ## Why it runs at all
 *
 * The scheduler was only ever called from two user actions, so the reminder queue drained after
 * about a year and a corrected due date could not reach anybody already installed.
 * `refreshQuarterlyReminders` has the detail. It never raises the permission prompt.
 */
export function useReminderRefresh(): void {
  const { ready, loadError, remindersEnabled } = useAppData();
  // Once per launch. `remindersEnabled` changing is the Settings toggle's business — it schedules
  // and cancels directly, and re-running here on that change would double the work at best.
  const done = useRef(false);

  useEffect(() => {
    if (!ready || loadError !== null || done.current) return;
    done.current = true;
    void refreshQuarterlyReminders(remindersEnabled);
  }, [ready, loadError, remindersEnabled]);
}
