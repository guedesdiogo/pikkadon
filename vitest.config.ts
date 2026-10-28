import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

const include = ["test/**/*.test.ts"];

export default defineConfig({
  test: {
    // The same tests run on both runtimes the core supports (#1).
    projects: [
      {
        // workerd without nodejs_compat, so the core cannot lean on a Node API.
        plugins: [cloudflareTest({ miniflare: { compatibilityDate: "2026-10-01" } })],
        test: { name: "workerd", include },
      },
      {
        test: { name: "node", include, environment: "node" },
      },
    ],
    // `bun run test` fails under 80% on any of these. Istanbul, because V8 coverage does not reach
    // workerd; the two projects' coverage is merged.
    coverage: {
      provider: "istanbul",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.d.ts"],
      reporter: ["text", "json-summary"],
      thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 },
    },
    // The first test of each workerd file waits for the runtime to start, which takes seconds on a
    // busy machine. These budgets cover that start, not slow tests.
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
