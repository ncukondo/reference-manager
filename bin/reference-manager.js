#!/usr/bin/env node

import { main } from "../dist/cli.js";

// Use .then()/.catch() instead of top-level await to avoid
// "unsettled top-level await" warnings when process.exit() is called
main(process.argv).catch((error) => {
  process.stderr.write(`Error: ${error.message}\n`);
  process.exit(1);
});
