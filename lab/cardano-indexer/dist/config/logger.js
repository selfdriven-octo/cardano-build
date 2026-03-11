const LEVEL_ORDER = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
};
const COLORS = {
    debug: '\x1b[36m',
    info: '\x1b[32m',
    warn: '\x1b[33m',
    error: '\x1b[31m'
};
const RESET = '\x1b[0m';
class Logger {
    level = 'info';
    setLevel(level) {
        if (level in LEVEL_ORDER) this.level = level;
    }
    log(level, message, meta) {
        if (LEVEL_ORDER[level] < LEVEL_ORDER[this.level]) return;
        const ts = new Date().toISOString().replace('T', ' ').substring(0, 19);
        const metaStr = meta && Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
        console.log(`${ts} ${COLORS[level]}[${level.toUpperCase()}]${RESET} ${message}${metaStr}`);
    }
    debug(msg, meta) {
        this.log('debug', msg, meta);
    }
    info(msg, meta) {
        this.log('info', msg, meta);
    }
    warn(msg, meta) {
        this.log('warn', msg, meta);
    }
    error(msg, meta) {
        this.log('error', msg, meta);
    }
}
const logger = new Logger();


//# sourceURL=/sessions/trusting-peaceful-mccarthy/mnt/outputs/cardano-indexer/src/config/logger.ts

exports.logger = logger;
