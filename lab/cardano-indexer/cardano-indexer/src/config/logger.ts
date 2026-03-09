/**
 * Simple logger — zero external dependencies.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const COLORS: Record<LogLevel, string> = {
  debug: '\x1b[36m', info: '\x1b[32m', warn: '\x1b[33m', error: '\x1b[31m',
};
const RESET = '\x1b[0m';

class Logger {
  private level: LogLevel = 'info';

  setLevel(level: string) {
    if (level in LEVEL_ORDER) this.level = level as LogLevel;
  }

  private log(level: LogLevel, message: string, meta?: Record<string, any>) {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[this.level]) return;
    const ts = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const metaStr = meta && Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    console.log(`${ts} ${COLORS[level]}[${level.toUpperCase()}]${RESET} ${message}${metaStr}`);
  }

  debug(msg: string, meta?: Record<string, any>) { this.log('debug', msg, meta); }
  info(msg: string, meta?: Record<string, any>) { this.log('info', msg, meta); }
  warn(msg: string, meta?: Record<string, any>) { this.log('warn', msg, meta); }
  error(msg: string, meta?: Record<string, any>) { this.log('error', msg, meta); }
}

export const logger = new Logger();
