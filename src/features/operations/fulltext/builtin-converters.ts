/**
 * Built-in PDF converter definitions for marker, docling, mineru, pymupdf.
 */

import { CustomPdfConverter } from "./custom-converter.js";
import type { CustomConverterConfig, PdfConverter } from "./pdf-converter.js";

export const BUILTIN_CONVERTER_NAMES = ["marker", "docling", "mineru", "pymupdf"] as const;

export type BuiltinConverterName = (typeof BUILTIN_CONVERTER_NAMES)[number];

export interface ConverterInfo {
  install: string;
  description: string;
}

export const BUILTIN_CONVERTER_INFO: Record<BuiltinConverterName, ConverterInfo> = {
  marker: {
    install: "pip install marker-pdf",
    description: "GPU recommended, best quality",
  },
  docling: {
    install: "pip install docling",
    description: "CPU OK, good tables",
  },
  mineru: {
    install: "pip install mineru[all]",
    description: "GPU recommended, fastest",
  },
  pymupdf: {
    install: "pip install pymupdf4llm",
    description: "CPU only, lightweight",
  },
};

const BUILTIN_CONFIGS: Record<BuiltinConverterName, CustomConverterConfig> = {
  marker: {
    command: "marker_single {input} --output_dir {input_dir}",
    checkCommand: "marker_single --help",
  },
  docling: {
    command: "docling --from pdf --to md --output {input_dir} {input}",
    checkCommand: "docling --help",
  },
  mineru: {
    command: "mineru -p {input} -o {input_dir} -m auto",
    checkCommand: "mineru --help",
  },
  pymupdf: {
    command:
      "python3 -c \"import pymupdf4llm, pathlib; md=pymupdf4llm.to_markdown('{input}'); pathlib.Path('{output}').write_text(md)\"",
    checkCommand: 'python3 -c "import pymupdf4llm"',
  },
};

export function getBuiltinConverter(name: string): PdfConverter | undefined {
  if (!isBuiltinName(name)) return undefined;
  return new CustomPdfConverter(name, BUILTIN_CONFIGS[name]);
}

function isBuiltinName(name: string): name is BuiltinConverterName {
  return (BUILTIN_CONVERTER_NAMES as readonly string[]).includes(name);
}
