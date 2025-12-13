export type LogLevel = "silent" | "info" | "debug";

export interface Logger {
  info(...args: unknown[]): void;
  debug(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

export function createLogger(level: LogLevel = "info"): Logger {
  const shouldLogInfo = level === "info" || level === "debug";
  const shouldLogDebug = level === "debug";

  function formatMessage(...args: unknown[]): string {
    return args.map((arg) => String(arg)).join(" ") + "\n";
  }

  return {
    info(...args: unknown[]): void {
      if (shouldLogInfo) {
        process.stderr.write(formatMessage(...args));
      }
    },

    debug(...args: unknown[]): void {
      if (shouldLogDebug) {
        process.stderr.write(formatMessage(...args));
      }
    },

    error(...args: unknown[]): void {
      process.stderr.write(formatMessage(...args));
    },
  };
}
