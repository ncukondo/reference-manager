import { resolve } from "node:path";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";

/** Import .md files as raw text strings (replaces ?raw suffix for bun compatibility) */
function rawMdPlugin(): Plugin {
  return {
    name: "raw-md",
    transform(_code, id) {
      if (id.endsWith(".md") && !id.includes("node_modules")) {
        return { code: `export default ${JSON.stringify(_code)};`, map: null };
      }
    },
  };
}

export default defineConfig({
  plugins: [rawMdPlugin()],
  test: {
    globals: true,
    watch: false,
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/**/types.ts", "src/**/index.ts"],
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
});
