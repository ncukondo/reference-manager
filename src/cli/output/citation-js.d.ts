/**
 * Type definitions for @citation-js/core
 * @citation-js/core does not include TypeScript definitions
 * See: https://github.com/citation-js/citation-js/issues/104
 */

declare module "@citation-js/core" {
  export interface CiteOptions {
    forceType?: string;
  }

  export interface GetOptions {
    format?: "real" | "string";
    type?: "json" | "string";
  }

  export class Cite {
    constructor(data: unknown, options?: CiteOptions);
    static async(data: unknown, options?: CiteOptions): Promise<Cite>;
    format(
      format: "bibliography" | "citation",
      options?: {
        format?: "text" | "html" | "rtf";
        template?: string;
        lang?: string;
      }
    ): string;
    get(options?: GetOptions): unknown[];
  }
}

declare module "@citation-js/plugin-csl" {
  // Plugin is imported for side effects only
}

declare module "@citation-js/plugin-doi" {
  // Plugin is imported for side effects only
}

declare module "@citation-js/plugin-bibtex" {
  // Plugin is imported for side effects only
}

declare module "@citation-js/plugin-ris" {
  // Plugin is imported for side effects only
}
