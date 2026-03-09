/**
 * Determine the correct command and arguments for spawning a CLI child process.
 * Handles both runtime mode (node/bun running a script) and compiled binary mode.
 *
 * @param cliArgs - CLI arguments to pass (e.g., ["server", "start", "--library", path])
 * @returns Object with `command` (executable path) and `args` (arguments array)
 */
export function getCliSpawnArgs(cliArgs: string[]): { command: string; args: string[] } {
  const scriptPath = process.argv[1];

  // In bun-compiled binaries, process.argv[1] === process.execPath
  // because there is no separate script file — the binary IS the CLI.
  // In runtime mode (node/bun), process.argv[1] is the script path,
  // which differs from process.execPath (the runtime binary).
  const isCompiledBinary = scriptPath !== undefined && scriptPath === process.execPath;

  if (isCompiledBinary) {
    return { command: process.execPath, args: cliArgs };
  }

  // Runtime mode: invoke the runtime with the script path
  const script = scriptPath || process.execPath;
  return { command: process.execPath, args: [script, ...cliArgs] };
}
