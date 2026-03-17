/**
 * PDF converter interface and types for the pluggable converter system.
 */

/** Error codes for PDF conversion failures */
export type PdfConvertError =
  | "no-converter"
  | "not-installed"
  | "conversion-failed"
  | "timeout"
  | "no-pdf"
  | "output-not-created";

/** Result of a PDF-to-Markdown conversion */
export type PdfConvertResult =
  | { success: true; outputPath: string }
  | { success: false; error: string; code: PdfConvertError; stderr?: string };

/** Interface that all PDF converters must implement */
export interface PdfConverter {
  readonly name: string;
  isAvailable(): Promise<boolean>;
  convert(pdfPath: string, outputPath: string): Promise<PdfConvertResult>;
}

/** Configuration for a user-defined custom converter */
export interface CustomConverterConfig {
  /** Shell command template with placeholders: {input}, {output}, {input_dir}, {input_name}, {output_name} */
  command: string;
  /** Output mode: "file" (tool writes to {output}) or "stdout" (stdout captured as markdown) */
  outputMode?: "file" | "stdout";
  /** Command to check if the converter is available (exit 0 = available) */
  checkCommand?: string;
  /** Conversion timeout in seconds (overrides global) */
  timeout?: number;
  /** Progress display: "inherit" (stderr to terminal) or "quiet" (capture stderr) */
  progress?: "inherit" | "quiet";
  /** Windows-specific command override */
  commandWindows?: string;
  /** Windows-specific check command override */
  checkCommandWindows?: string;
}
