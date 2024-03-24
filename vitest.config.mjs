import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    setupFiles: ["./tests/setup/config-environment.ts"],
  },
});
