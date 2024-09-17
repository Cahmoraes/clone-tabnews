import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    hookTimeout: 60000,
    globals: true,
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    setupFiles: ["./tests/setup/config-environment.js"],
  },
});
