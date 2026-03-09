/**
 * Simple logger — zero external dependencies.
 */
declare class Logger {
    private level;
    setLevel(level: string): void;
    private log;
    debug(msg: string, meta?: Record<string, any>): void;
    info(msg: string, meta?: Record<string, any>): void;
    warn(msg: string, meta?: Record<string, any>): void;
    error(msg: string, meta?: Record<string, any>): void;
}
export declare const logger: Logger;
export {};
