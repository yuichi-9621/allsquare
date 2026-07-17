import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    // Vitest's jsdom default origin is http://localhost:3000; pin it to
    // http://localhost so relative fetch() calls resolve to the same origin
    // MSW handlers use (see src/lib/api.test.ts, src/test/server.ts).
    environmentOptions: { jsdom: { url: "http://localhost" } },
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
})
