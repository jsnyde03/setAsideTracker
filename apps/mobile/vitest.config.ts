import { defineConfig } from "vitest/config";

/**
 * Unit tests live under src/. The Playwright e2e specs are *.spec.ts under e2e/ and must NOT be
 * picked up by Vitest's default glob — they use Playwright's own runner, not Vitest.
 */
export default defineConfig({
  test: {
    include: ["src/**/*.{test,spec}.ts"],
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
  },
});
