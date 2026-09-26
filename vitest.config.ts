import { defineConfig } from "vitest/config"

export default defineConfig({
  cacheDir: "node_modules/.vite/moker-unit-tests",
  test: {
    include: ["tests/**/*.test.ts"],
    coverage: { reporter: ["text", "json", "html"] },
  },
})
