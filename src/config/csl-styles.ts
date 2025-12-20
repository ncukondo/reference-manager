/**
 * CSL Style Management
 *
 * Handles resolution and loading of CSL (Citation Style Language) style files.
 *
 * Style Resolution Order:
 * 1. --csl-file <path> (exact file path)
 * 2. Built-in style matching --style <name>
 * 3. Search in csl_directory paths (in array order)
 * 4. Default style from config (default_style)
 * 5. "apa" (hardcoded default)
 */

import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Built-in styles available in @citation-js/plugin-csl
 * These can be used directly without loading external files
 */
export const BUILTIN_STYLES = ["apa", "vancouver", "harvard"] as const;

export type BuiltinStyleName = (typeof BUILTIN_STYLES)[number];

/**
 * Check if a style name is a built-in style
 */
export function isBuiltinStyle(styleName: string): styleName is BuiltinStyleName {
  return BUILTIN_STYLES.includes(styleName as BuiltinStyleName);
}

export interface StyleResolutionOptions {
  /**
   * Exact path to CSL file (from --csl-file option)
   * Takes highest priority
   */
  cslFile?: string;

  /**
   * Style name to resolve (from --style option)
   */
  style?: string;

  /**
   * Directory or directories to search for custom CSL files
   * (from csl_directory config)
   * Can be a single string or array of strings
   */
  cslDirectory?: string | string[];

  /**
   * Default style to use if specified style not found
   * (from default_style config)
   */
  defaultStyle?: string;
}

export interface StyleResolution {
  /**
   * Type of resolution: "builtin" for citation-js built-in styles,
   * "custom" for external CSL files
   */
  type: "builtin" | "custom";

  /**
   * The resolved style name (for built-in) or identifier (for custom)
   */
  styleName: string;

  /**
   * CSL XML content (only for custom styles)
   */
  styleXml?: string;
}

/**
 * Expand tilde (~) in path to home directory
 */
function expandTilde(filePath: string): string {
  if (filePath.startsWith("~/")) {
    const home = process.env.HOME || process.env.USERPROFILE || "";
    return path.join(home, filePath.slice(2));
  }
  return filePath;
}

/**
 * Load CSL style file content from the given path
 *
 * @param stylePath - Path to the CSL style file
 * @returns Content of the CSL style file (XML string)
 * @throws Error if file cannot be read
 */
export function loadCSLStyleFile(stylePath: string): string {
  return fs.readFileSync(stylePath, "utf-8");
}

/**
 * Resolve the style based on resolution options
 *
 * Resolution order:
 * 1. cslFile (exact path) - throws if doesn't exist
 * 2. Built-in style matching style name
 * 3. Search in csl_directory paths (in order)
 * 4. Default style (defaultStyle) - if built-in
 * 5. "apa" (hardcoded fallback)
 *
 * @param options - Style resolution options
 * @returns StyleResolution with type, styleName, and optional styleXml
 * @throws Error if cslFile is specified but doesn't exist
 */
export function resolveStyle(options: StyleResolutionOptions): StyleResolution {
  const { cslFile, style, cslDirectory, defaultStyle } = options;

  // 1. If cslFile is specified, use it (highest priority)
  if (cslFile) {
    if (!fs.existsSync(cslFile)) {
      throw new Error(`CSL file '${cslFile}' not found`);
    }
    const styleXml = loadCSLStyleFile(cslFile);
    const styleName = path.basename(cslFile, ".csl");
    return {
      type: "custom",
      styleName,
      styleXml,
    };
  }

  // Determine which style name to try
  const styleToResolve = style || defaultStyle || "apa";

  // 2. Check if it's a built-in style
  if (isBuiltinStyle(styleToResolve)) {
    return {
      type: "builtin",
      styleName: styleToResolve,
    };
  }

  // 3. Search in csl_directory paths
  if (cslDirectory) {
    const directories = Array.isArray(cslDirectory) ? cslDirectory : [cslDirectory];

    for (const dir of directories) {
      const expandedDir = expandTilde(dir);
      const stylePath = path.join(expandedDir, `${styleToResolve}.csl`);

      if (fs.existsSync(stylePath)) {
        const styleXml = loadCSLStyleFile(stylePath);
        return {
          type: "custom",
          styleName: styleToResolve,
          styleXml,
        };
      }
    }
  }

  // 4. Fall back to default style if it's built-in
  if (defaultStyle && isBuiltinStyle(defaultStyle)) {
    return {
      type: "builtin",
      styleName: defaultStyle,
    };
  }

  // 5. Fall back to apa (hardcoded default)
  return {
    type: "builtin",
    styleName: "apa",
  };
}
