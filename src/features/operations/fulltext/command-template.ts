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

/** Shell-quote a value by wrapping in single quotes and escaping embedded single quotes. */
function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

export function expandTemplate(template: string, vars: TemplateVars): string {
  // Shell-quote all substituted values to prevent command injection via file paths.
  // Replace composite placeholders ({input_dir}, {input_name}, {output_name}) before
  // {input}/{output} so that "{input}" doesn't partially match "{input_dir}" or "{input_name}".
  return template
    .replaceAll("{input_dir}", shellQuote(dirname(vars.input)))
    .replaceAll("{input_name}", shellQuote(basename(vars.input)))
    .replaceAll("{output_name}", shellQuote(basename(vars.output)))
    .replaceAll("{input}", shellQuote(vars.input))
    .replaceAll("{output}", shellQuote(vars.output));
}
