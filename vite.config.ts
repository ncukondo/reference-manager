import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    target: "node22",
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
        "node:child_process",
        "node:os",
        "node:events",
        "node:stream",
        "node:buffer",
        "node:readline",
        "@citation-js/core",
        "@citation-js/plugin-bibtex",
        "@citation-js/plugin-csl",
        "@citation-js/plugin-doi",
        "@citation-js/plugin-isbn",
        "@citation-js/plugin-ris",
        "@hono/node-server",
        "@iarna/toml",
        "@modelcontextprotocol/sdk",
        "chokidar",
        "commander",
        "hono",
        "ink",
        "react",
        "tabtab",
        "write-file-atomic",
        "zod",
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
