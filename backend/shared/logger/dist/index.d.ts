import pino from 'pino';
type PinoLogger = pino.Logger;
export type LoggerWithEvent = PinoLogger & {
    fatal(event: string, msg: string, ...args: any[]): void;
    error(event: string, msg: string, ...args: any[]): void;
    warn(event: string, msg: string, ...args: any[]): void;
    info(event: string, msg: string, ...args: any[]): void;
    debug(event: string, msg: string, ...args: any[]): void;
    trace(event: string, msg: string, ...args: any[]): void;
};
export interface LoggerOptions {
    retainDays?: number;
    logsParentDir?: string;
}
export declare function createLogger(serviceName: string, featureName?: string, options?: LoggerOptions): LoggerWithEvent;
export default createLogger;
//# sourceMappingURL=index.d.ts.map