import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        cli: resolve(__dirname, "src/cli/index.ts"),
        server: resolve(__dirname, "src/server/index.ts"),
      },
      formats: ["es"],
    },
    rollupOptions: {
      external: [
        "node:fs",
        "node:fs/promises",
        "node:path",
        "node:crypto",
        "node:process",
        "node:url",
        "node:http",
        "commander",
        "hono",
      ],
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "chunks/[name]-[hash].js",
      },
    },
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    minify: false,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
});
