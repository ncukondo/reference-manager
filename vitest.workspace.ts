import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  {
    extends: "./vitest.config.ts",
    test: {
      name: "unit",
      include: ["src/**/*.test.ts"],
      exclude: ["src/**/*.remote.test.ts", "src/**/*.e2e.test.ts"],
    },
  },
  {
    extends: "./vitest.config.ts",
    test: {
      name: "remote",
      include: ["src/**/*.remote.test.ts"],
      testTimeout: 30000,
    },
  },
  {
    extends: "./vitest.config.ts",
    test: {
      name: "e2e",
      include: ["src/**/*.e2e.test.ts"],
      testTimeout: 60000,
    },
  },
]);
