// 1.2.0.1 — the whole existing app mounted as a single route.
//
// This is deliberately a strangler-fig step, not the finished shape. `App.tsx` still owns the
// `useState<Screen>` machine and every provider; flipping the entry point to expo-router without a
// route to boot into would just break the app, so the app becomes one route and keeps working
// exactly as before. 1.2.0.2 hoists the providers into `_layout.tsx`, 1.2.0.3 lifts app state above
// the router, and 1.2.0.4 extracts the 13 screens into real routes — after which this file's
// re-export disappears.
export { default } from "../App";
