/**
 * Converter resolution: finds the best available PDF converter.
 */

import {
  BUILTIN_CONVERTER_INFO,
  BUILTIN_CONVERTER_NAMES,
  type BuiltinConverterName,
  getBuiltinConverter,
} from "./builtin-converters.js";
import { CustomPdfConverter } from "./custom-converter.js";
import type { CustomConverterConfig, PdfConvertError, PdfConverter } from "./pdf-converter.js";

export type ResolveResult =
  | { success: true; converter: PdfConverter }
  | { success: false; code: PdfConvertError; error: string; hints?: string };

export interface ResolveOptions {
  priority: string[];
  customConverters: Record<string, CustomConverterConfig>;
}

export async function resolveConverter(
  name: string,
  options: ResolveOptions
): Promise<ResolveResult> {
  if (name === "auto") {
    return resolveAuto(options);
  }
  return resolveExplicit(name, options);
}

async function resolveAuto(options: ResolveOptions): Promise<ResolveResult> {
  const { priority, customConverters } = options;

  for (const converterName of priority) {
    const converter = getConverterByName(converterName, customConverters);
    if (!converter) continue;

    if (await converter.isAvailable()) {
      return { success: true, converter };
    }
  }

  return {
    success: false,
    code: "no-converter",
    error: "No PDF converter found",
    hints: buildNoConverterHints(priority),
  };
}

async function resolveExplicit(name: string, options: ResolveOptions): Promise<ResolveResult> {
  const converter = getConverterByName(name, options.customConverters);
  if (!converter) {
    return {
      success: false,
      code: "not-installed",
      error: `PDF converter '${name}' not found`,
    };
  }

  if (!(await converter.isAvailable())) {
    const isBuiltin = (BUILTIN_CONVERTER_NAMES as readonly string[]).includes(name);
    const installHint = isBuiltin
      ? BUILTIN_CONVERTER_INFO[name as BuiltinConverterName].install
      : undefined;

    const result: ResolveResult = {
      success: false,
      code: "not-installed",
      error: `PDF converter '${name}' is not installed`,
    };
    if (installHint) {
      result.hints = `Install with: ${installHint}`;
    }
    return result;
  }

  return { success: true, converter };
}

function getConverterByName(
  name: string,
  customConverters: Record<string, CustomConverterConfig>
): PdfConverter | undefined {
  // Custom converters take precedence
  const customConfig = customConverters[name];
  if (customConfig) {
    return new CustomPdfConverter(name, customConfig);
  }

  return getBuiltinConverter(name);
}

export function buildNoConverterHints(checked: string[]): string {
  const lines: string[] = [
    `Checked: ${checked.join(", ")} (none available)`,
    "",
    "Install one of the following:",
    "",
  ];

  for (const name of BUILTIN_CONVERTER_NAMES) {
    const info = BUILTIN_CONVERTER_INFO[name];
    lines.push(`  ${name.padEnd(9)} ${info.install.padEnd(28)} (${info.description})`);
  }

  lines.push("", "Or configure a custom converter in your config file.");

  return lines.join("\n");
}
