/**
 * Alternate screen buffer utilities for TUI sessions.
 *
 * When running fullscreen TUI applications, we switch to the alternate
 * screen buffer to preserve the terminal's scrollback history.
 * This is similar to how vim, less, and other TUI apps work.
 */

// ANSI escape sequences for alternate screen buffer
const ENTER_ALT_SCREEN = "\x1b[?1049h";
const EXIT_ALT_SCREEN = "\x1b[?1049l";

/**
 * Run a function within an alternate screen buffer session.
 *
 * This preserves the terminal's scrollback history by:
 * 1. Switching to alternate screen buffer before running the function
 * 2. Switching back to the main screen buffer after the function completes
 *
 * Use this to wrap TUI sessions that may take over the full terminal.
 *
 * @param fn - Async function to run in alternate screen
 * @returns The result of the function
 *
 * @example
 * ```typescript
 * const result = await withAlternateScreen(async () => {
 *   const refs = await runReferenceSelect(...);
 *   const style = await runStyleSelect(...);
 *   return { refs, style };
 * });
 * ```
 */
export async function withAlternateScreen<T>(fn: () => Promise<T>): Promise<T> {
  process.stdout.write(ENTER_ALT_SCREEN);
  try {
    return await fn();
  } finally {
    process.stdout.write(EXIT_ALT_SCREEN);
  }
}
