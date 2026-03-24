type LogLevel = "debug" | "info" | "warn" | "error";

let globalVerbose = false;

export function setVerbose(v: boolean): void {
  globalVerbose = v;
}

export function createLogger(module: string) {
  const prefix = `[flowup:${module}]`;

  return {
    debug(...args: unknown[]) {
      if (globalVerbose) console.log(prefix, ...args);
    },
    info(...args: unknown[]) {
      console.log(prefix, ...args);
    },
    warn(...args: unknown[]) {
      console.warn(prefix, ...args);
    },
    error(...args: unknown[]) {
      console.error(prefix, ...args);
    },
    success(...args: unknown[]) {
      console.log(prefix, ...args);
    },
  };
}
