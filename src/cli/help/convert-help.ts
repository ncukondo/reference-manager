import {
  BUILTIN_CONVERTER_INFO,
  BUILTIN_CONVERTER_NAMES,
} from "../../features/operations/fulltext/builtin-converters.js";

/**
 * Builds the additional help text for the fulltext convert command.
 * Includes built-in converters, custom converter config, and examples.
 */
export function buildConvertHelpText(): string {
  const rows = BUILTIN_CONVERTER_NAMES.map((name) => {
    const info = BUILTIN_CONVERTER_INFO[name];
    return `  ${name.padEnd(10)}${info.install.padEnd(28)}${info.description}`;
  });

  const priority = BUILTIN_CONVERTER_NAMES.join(" > ");

  return `
BUILT-IN CONVERTERS
  Name      Install                     Notes
${rows.join("\n")}

  In auto mode (default), the first available converter is used.
  Priority: ${priority}

CUSTOM CONVERTERS
  Add via config set:
    ref config set fulltext.converters.my-tool.command "my-tool {input} -o {output}"
    ref config set fulltext.converters.my-tool.check_command "my-tool --version"

  Or edit config.toml directly (ref config edit):
    [fulltext.converters.my-tool]
    command = "my-tool convert {input} -o {output}"
    check_command = "my-tool --version"

  Template placeholders:
    {input}        Input PDF path
    {output}       Output Markdown path
    {input_dir}    Directory of input file
    {input_name}   Basename of input file
    {output_name}  Basename of output file

  Additional options:
    output_mode    "file" (default) or "stdout"
    timeout        Seconds (default: 300)
    progress       "inherit" (default) or "quiet"

  Use with:  ref fulltext convert <ref> --converter my-tool

CONFIGURATION
  ref config set fulltext.pdf_converter marker
  ref config set fulltext.pdf_converter_timeout 600
  ref config edit                  # Edit config.toml directly

EXAMPLES
  $ ref fulltext convert smith2023
  $ ref fulltext convert smith2023 --converter marker
  $ ref fulltext convert smith2023 --from pdf --force`;
}
