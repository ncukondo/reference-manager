/**
 * TTY detection for TUI mode
 */

/**
 * Error thrown when TTY is required but not available
 */
export class TTYError extends Error {
  readonly exitCode = 1;

  constructor(message: string) {
    super(message);
    this.name = "TTYError";
  }
}

/**
 * Check if the current environment is a TTY
 *
 * Throws TTYError if stdin or stdout is not a TTY,
 * which means TUI mode cannot be used.
 *
 * @throws {TTYError} If not running in a TTY
 */
export function checkTTY(): void {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new TTYError("TUI mode requires a TTY");
  }
}
