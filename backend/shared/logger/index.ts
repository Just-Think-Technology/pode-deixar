// Logger — pino factory with file output and retention

import pino from 'pino';
import pinoPretty from 'pino-pretty';
import fs = require('fs');
import path = require('path');

type PinoLogger = pino.Logger;
export type LoggerWithEvent = PinoLogger & {
  fatal(event: string, msg: string, ...args: unknown[]): void;
  error(event: string, msg: string, ...args: unknown[]): void;
  warn(event: string, msg: string, ...args: unknown[]): void;
  info(event: string, msg: string, ...args: unknown[]): void;
  debug(event: string, msg: string, ...args: unknown[]): void;
  trace(event: string, msg: string, ...args: unknown[]): void;
};

const DEFAULT_RETAIN_DAYS = 14;
const MS_PER_DAY = 86400000;

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

function cleanupOldLogs(dir: string, retainDays = DEFAULT_RETAIN_DAYS) {
  try {
    const files = fs.readdirSync(dir);
    const now = Date.now();
    for (const f of files) {
      const full = path.join(dir, f);
      try {
        const stat = fs.statSync(full);
        if ((now - stat.mtimeMs) / MS_PER_DAY > retainDays)
          fs.unlinkSync(full);
      } catch (e) {}
    }
  } catch (e) {}
}

function stripLineBreaks(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.replace(/[\r\n]+/g, ' ');
  }
  if (Array.isArray(value)) {
    return value.map((item) => stripLineBreaks(item));
  }
  if (
    value &&
    typeof value === 'object' &&
    !(value instanceof Error) &&
    !(value instanceof Date)
  ) {
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) return value;
    const source = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(source)) {
      // Safe: the key comes from the source object's own entries.
      // eslint-disable-next-line security/detect-object-injection
      result[key] = stripLineBreaks(item);
    }
    return result;
  }
  return value;
}

const loggerCache = new Map<string, LoggerWithEvent>();

const REDACTED_PATHS = [
  'password',
  'senha',
  'token',
  'access_token',
  'refresh_token',
  'accessToken',
  'refreshToken',
  'secret',
  'client_secret',
  'authorization',
  'headers.authorization',
  'pan',
  'card_number',
  'cvv',
  'cvc',
  'cpf',
  'pix',
  '*.password',
  '*.token',
  '*.access_token',
  '*.refresh_token',
  '*.secret',
  '*.card_number',
  '*.cvv',
  '*.cpf',
];

function resolveLogPaths(
  serviceName: string,
  featureName: string | undefined,
  logsParentDir: string,
) {
  const currentDir =
    path.basename(__dirname) === 'dist'
      ? path.resolve(__dirname, '..')
      : __dirname;
  const logsRoot = path.resolve(
    currentDir,
    '..',
    '..',
    logsParentDir,
    serviceName,
  );
  const filePrefix = featureName ? `${featureName}` : `general`;
  const filePath = path.join(
    logsRoot,
    `${formatDate(new Date())}-${filePrefix}.log`,
  );
  return { logsRoot, filePath };
}

function buildStreams(
  level: string,
  isProd: boolean,
  isTest: boolean,
  logsRoot: string,
  filePath: string,
): pino.StreamEntry[] {
  const streams: pino.StreamEntry[] = [];

  if (!isTest) {
    ensureDir(logsRoot);
    const fileStream = fs.createWriteStream(filePath, { flags: 'a' });
    const prettyFile = pinoPretty({
      colorize: false,
      translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
      ignore: 'pid,hostname',
      destination: fileStream,
      sync: true,
    });
    streams.push({ level: level as pino.Level, stream: prettyFile });
  }

  if (!isProd || isTest) {
    const prettyStdout = pinoPretty({
      colorize: true,
      translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
      ignore: 'pid,hostname',
      messageFormat: '[{service}] {event} - {msg}',
      destination: process.stdout,
      sync: true,
    });
    streams.push({ level: level as pino.Level, stream: prettyStdout });
  }

  return streams;
}

function wrapWithEventSanitization(baseLogger: PinoLogger) {
  const proxyLogger = Object.create(baseLogger);
  const levelNames = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'] as const;
  for (const lvl of levelNames) {
    proxyLogger[lvl] = function (
      event: string | object,
      msg?: string,
      ...args: unknown[]
    ) {
      const sanitizedArgs = args.map((arg) => stripLineBreaks(arg));
      if (typeof event === 'string' && typeof msg === 'string') {
        return baseLogger[lvl](
          { event: stripLineBreaks(event) },
          stripLineBreaks(msg) as string,
          ...sanitizedArgs,
        );
      }
      return baseLogger[lvl](
        stripLineBreaks(event) as Record<string, unknown>,
        (typeof msg === 'string' ? stripLineBreaks(msg) : msg) as
          | string
          | undefined,
        ...sanitizedArgs,
      );
    };
  }
  return proxyLogger as unknown as LoggerWithEvent;
}

export function createLogger(serviceName: string, featureName?: string, options: LoggerOptions = {}): LoggerWithEvent {
  const key = `${serviceName}:${featureName ?? ''}`;
  if (loggerCache.has(key)) return loggerCache.get(key)!;

  const level = process.env.LOG_LEVEL || 'info';
  const isProd = process.env.NODE_ENV === 'production';
  const isTest = process.env.NODE_ENV === 'test';
  const retainDays = options.retainDays ?? DEFAULT_RETAIN_DAYS;
  const { logsRoot, filePath } = resolveLogPaths(
    serviceName,
    featureName,
    options.logsParentDir ?? 'logs',
  );
  setImmediate(() => cleanupOldLogs(logsRoot, retainDays));
  const streams = buildStreams(level, isProd, isTest, logsRoot, filePath);

  const baseLogger = pino(
    {
      level,
      base: { service: serviceName },
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: {
        level(label) {
          return { level: label };
        },
      },
      // Secrets are redacted before serialization for PCI-DSS compliance; fast-redact (pino v8) rejects partial wildcards such as '*token*' at logger creation, so names are enumerated explicitly with '*.' variants for one nesting level.
      redact: {
        paths: REDACTED_PATHS,
        censor: '[REDACTED]',
      },
      serializers: { err: pino.stdSerializers.err },
    },
    pino.multistream(streams),
  );

  const logger = wrapWithEventSanitization(baseLogger);
  loggerCache.set(key, logger);
  return logger;
}

export { createResponseLoggerInterceptor } from './response-logger.interceptor';
export { BaseDomainLogger } from './domain-logger';
export { bootstrapService } from './bootstrap';
export type { BootstrapServiceOptions } from './bootstrap';

export default createLogger;