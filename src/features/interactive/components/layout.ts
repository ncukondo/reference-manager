/**
 * Layout constants and utility functions for SearchableMultiSelect.
 *
 * These values are shared between the component itself and the callers
 * that need to pre-calculate the visible item count.
 */

/** Lines rendered per choice item (title + subtitle + meta) */
export const ITEM_HEIGHT = 3;

/**
 * Lines reserved for chrome around the item list:
 * header(2) + search box(4) + status(2) + scroll indicators(2) + footer(2) = 12
 */
export const RESERVED_LINES = 12;

/** Gets terminal width, falling back to 80 if not available */
export function getTerminalWidth(): number {
  return process.stdout.columns ?? 80;
}

/** Gets terminal height, falling back to 24 if not available */
export function getTerminalHeight(): number {
  return process.stdout.rows ?? 24;
}

/**
 * Calculates the effective limit for the item list
 * based on terminal height to prevent the input field from being hidden.
 */
export function calculateEffectiveLimit(configLimit: number): number {
  const terminalHeight = getTerminalHeight();
  const availableLines = terminalHeight - RESERVED_LINES;
  const maxVisibleChoices = Math.max(1, Math.floor(availableLines / ITEM_HEIGHT));
  return configLimit > 0 ? Math.min(configLimit, maxVisibleChoices) : maxVisibleChoices;
}
