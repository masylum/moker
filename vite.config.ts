import { cloudflare } from "@cloudflare/vite-plugin"
import solid from "vite-plugin-solid"
import { defineConfig } from "vite"

export default defineConfig({
  cacheDir: "node_modules/.vite/moker-app",
  plugins: [solid(), cloudflare()],
  build: { target: "es2022" },
})
