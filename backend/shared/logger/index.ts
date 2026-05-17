import pino from 'pino';
import pinoPretty from 'pino-pretty';
import fs from 'fs';
import path from 'path';

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

function ensureDir(dir: string) {
  try { fs.mkdirSync(dir, { recursive: true }); } catch (e) {}
}

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function cleanupOldLogs(dir: string, retainDays = 14) {
  try {
    const files = fs.readdirSync(dir);
    const now = Date.now();
    for (const f of files) {
      const full = path.join(dir, f);
      try {
        const stat = fs.statSync(full);
        if ((now - stat.mtimeMs) / 86400000 > retainDays) fs.unlinkSync(full);
      } catch (e) {}
    }
  } catch (e) {}
}

const loggerCache = new Map<string, LoggerWithEvent>();

export function createLogger(serviceName: string, featureName?: string, options: LoggerOptions = {}): LoggerWithEvent {
  const key = `${serviceName}:${featureName ?? ''}`;
  if (loggerCache.has(key)) return loggerCache.get(key)!;

  const level = process.env.LOG_LEVEL || 'info';
  const isProd = process.env.NODE_ENV === 'production';

  const logsParentDir = options.logsParentDir ?? 'logs';
  const currentDir = path.basename(__dirname) === 'dist' ? path.resolve(__dirname, '..') : __dirname;
  const logsRoot = path.resolve(currentDir, '..', '..', logsParentDir, serviceName);
  const isTest = process.env.NODE_ENV === 'test';
  if (!isTest) ensureDir(logsRoot);

  const date = formatDate(new Date());
  const filePrefix = featureName ? `${featureName}` : `general`;
  const filePath = path.join(logsRoot, `${date}-${filePrefix}.log`);

  setImmediate(() => cleanupOldLogs(logsRoot, options.retainDays ?? 14));

  const streams: pino.StreamEntry[] = [];

  if (!isTest) {
    const fileStream = fs.createWriteStream(filePath, { flags: 'a' });
    const prettyFile = pinoPretty({
      colorize: false,
      translateTime: 'yyyy-mm-dd HH:MM:ss.l',
      ignore: 'pid,hostname',
      destination: fileStream,
      sync: true,
    });
    streams.push({ level: level as pino.Level, stream: prettyFile });
    setImmediate(() => cleanupOldLogs(logsRoot, options.retainDays ?? 14));
  }

  if (!isProd || isTest) {
    const prettyStdout = pinoPretty({
      colorize: true,
      translateTime: 'yyyy-mm-dd HH:MM:ss.l',
      ignore: 'pid,hostname',
      messageFormat: '[{service}] {event} - {msg}',
      destination: process.stdout,
      sync: true,
    });
    streams.push({ level: level as pino.Level, stream: prettyStdout });
  }

  const baseLogger = pino(
    {
      level,
      base: { service: serviceName },
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: {
        level(label) { return { level: label } as any; },
      },
    },
    pino.multistream(streams),
  );

  const proxyLogger = Object.create(baseLogger);
  const levelNames = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'] as const;
  for (const lvl of levelNames) {
    proxyLogger[lvl] = function (event: string | object, msg?: string, ...args: any[]) {
      if (typeof event === 'string' && typeof msg === 'string') {
        return baseLogger[lvl]({ event }, msg, ...args);
      }
      return baseLogger[lvl](event as any, msg as any, ...args);
    };
  }

  const logger = proxyLogger as unknown as LoggerWithEvent;
  loggerCache.set(key, logger);
  return logger;
}

export default createLogger;