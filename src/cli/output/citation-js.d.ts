/**
 * Type definitions for @citation-js/core
 * @citation-js/core does not include TypeScript definitions
 * See: https://github.com/citation-js/citation-js/issues/104
 */

declare module "@citation-js/core" {
  export class Cite {
    constructor(data: unknown);
    format(
      format: "bibliography" | "citation",
      options?: {
        format?: "text" | "html" | "rtf";
        template?: string;
        lang?: string;
      }
    ): string;
  }
}

declare module "@citation-js/plugin-csl" {
  // Plugin is imported for side effects only
}
