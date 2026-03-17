/**
 * Command template expansion for custom PDF converters.
 *
 * Placeholders:
 * - {input}       — absolute path to input PDF
 * - {output}      — absolute path to desired output Markdown
 * - {input_dir}   — directory of input file
 * - {input_name}  — filename of input file
 * - {output_name} — filename of output file
 */

import { basename, dirname } from "node:path";

export interface TemplateVars {
  input: string;
  output: string;
}

export function expandTemplate(template: string, vars: TemplateVars): string {
  return template
    .replaceAll("{input_dir}", dirname(vars.input))
    .replaceAll("{input_name}", basename(vars.input))
    .replaceAll("{output_name}", basename(vars.output))
    .replaceAll("{input}", vars.input)
    .replaceAll("{output}", vars.output);
}
