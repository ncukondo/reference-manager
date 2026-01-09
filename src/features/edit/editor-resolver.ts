/**
 * Resolves the editor to use for editing references.
 * Resolution order (same as Git):
 * 1. $VISUAL environment variable
 * 2. $EDITOR environment variable
 * 3. Platform-specific fallback (vi/notepad)
 */
export function resolveEditor(platform?: NodeJS.Platform): string {
  const visual = process.env.VISUAL;
  if (visual && visual.trim() !== "") {
    return visual;
  }

  const editor = process.env.EDITOR;
  if (editor && editor.trim() !== "") {
    return editor;
  }

  // Platform-specific fallback
  const currentPlatform = platform ?? process.platform;
  return currentPlatform === "win32" ? "notepad" : "vi";
}
