import { defineConfig } from "vitest/config"

export default defineConfig({
  cacheDir: "node_modules/.vite/moker-unit-tests",
  test: {
    // Simulation tests spawn their own workers; bound file concurrency to avoid CPU contention.
    maxWorkers: 2,
    include: ["tests/**/*.test.ts"],
    coverage: { reporter: ["text", "json", "html"] },
  },
})
