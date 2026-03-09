/**
 * Determine the correct command and arguments for spawning a CLI child process.
 * Handles both runtime mode (node/bun running a script) and compiled binary mode.
 *
 * @param cliArgs - CLI arguments to pass (e.g., ["server", "start", "--library", path])
 * @returns Object with `command` (executable path) and `args` (arguments array)
 */
export function getCliSpawnArgs(cliArgs: string[]): { command: string; args: string[] } {
  const scriptPath = process.argv[1];

  // Detect compiled binary mode:
  // 1. In some bun versions, process.argv[1] === process.execPath
  // 2. In other bun versions, process.argv[1] is a virtual FS path like "/$bunfs/root/..."
  // In runtime mode (node/bun), process.argv[1] is a real script path on disk.
  const isCompiledBinary =
    scriptPath !== undefined &&
    (scriptPath === process.execPath || scriptPath.startsWith("/$bunfs/"));

  if (isCompiledBinary) {
    return { command: process.execPath, args: cliArgs };
  }

  // Runtime mode: invoke the runtime with the script path
  const script = scriptPath || process.execPath;
  return { command: process.execPath, args: [script, ...cliArgs] };
}
