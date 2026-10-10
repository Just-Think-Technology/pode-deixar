"use strict";
// Logger — pino factory with file output and retention
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bootstrapService = exports.BaseDomainLogger = exports.createResponseLoggerInterceptor = void 0;
exports.createLogger = createLogger;
const pino_1 = __importDefault(require("pino"));
const pino_pretty_1 = __importDefault(require("pino-pretty"));
const fs = require("fs");
const path = require("path");
const DEFAULT_RETAIN_DAYS = 14;
const MS_PER_DAY = 86400000;
function ensureDir(dir) {
    try {
        fs.mkdirSync(dir, { recursive: true });
    }
    catch (e) { }
}
function formatDate(d) {
    return d.toISOString().slice(0, 10);
}
function cleanupOldLogs(dir, retainDays = DEFAULT_RETAIN_DAYS) {
    try {
        const files = fs.readdirSync(dir);
        const now = Date.now();
        for (const f of files) {
            const full = path.join(dir, f);
            try {
                const stat = fs.statSync(full);
                if ((now - stat.mtimeMs) / MS_PER_DAY > retainDays)
                    fs.unlinkSync(full);
            }
            catch (e) { }
        }
    }
    catch (e) { }
}
function stripLineBreaks(value) {
    if (typeof value === 'string') {
        return value.replace(/[\r\n]+/g, ' ');
    }
    if (Array.isArray(value)) {
        return value.map((item) => stripLineBreaks(item));
    }
    if (value &&
        typeof value === 'object' &&
        !(value instanceof Error) &&
        !(value instanceof Date)) {
        const proto = Object.getPrototypeOf(value);
        if (proto !== Object.prototype && proto !== null)
            return value;
        const source = value;
        const result = {};
        for (const [key, item] of Object.entries(source)) {
            // Safe: the key comes from the source object's own entries.
            // eslint-disable-next-line security/detect-object-injection
            result[key] = stripLineBreaks(item);
        }
        return result;
    }
    return value;
}
const loggerCache = new Map();
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
function resolveLogPaths(serviceName, featureName, logsParentDir) {
    const currentDir = path.basename(__dirname) === 'dist'
        ? path.resolve(__dirname, '..')
        : __dirname;
    const logsRoot = path.resolve(currentDir, '..', '..', logsParentDir, serviceName);
    const filePrefix = featureName ? `${featureName}` : `general`;
    const filePath = path.join(logsRoot, `${formatDate(new Date())}-${filePrefix}.log`);
    return { logsRoot, filePath };
}
function buildStreams(level, isProd, isTest, logsRoot, filePath) {
    const streams = [];
    if (!isTest) {
        ensureDir(logsRoot);
        const fileStream = fs.createWriteStream(filePath, { flags: 'a' });
        const prettyFile = (0, pino_pretty_1.default)({
            colorize: false,
            translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
            ignore: 'pid,hostname',
            destination: fileStream,
            sync: true,
        });
        streams.push({ level: level, stream: prettyFile });
    }
    if (!isProd || isTest) {
        const prettyStdout = (0, pino_pretty_1.default)({
            colorize: true,
            translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
            ignore: 'pid,hostname',
            messageFormat: '[{service}] {event} - {msg}',
            destination: process.stdout,
            sync: true,
        });
        streams.push({ level: level, stream: prettyStdout });
    }
    if (isProd && !isTest) {
        // Machine-readable stdout for log aggregation (Loki via Promtail):
        // raw pino JSON lines with service/level/event, one object per line.
        // Human-readable pretty output stays in the local log files only.
        streams.push({ level: level, stream: process.stdout });
    }
    return streams;
}
function wrapWithEventSanitization(baseLogger) {
    const proxyLogger = Object.create(baseLogger);
    const levelNames = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'];
    for (const lvl of levelNames) {
        proxyLogger[lvl] = function (event, msg, ...args) {
            const sanitizedArgs = args.map((arg) => stripLineBreaks(arg));
            if (typeof event === 'string' && typeof msg === 'string') {
                return baseLogger[lvl]({ event: stripLineBreaks(event) }, stripLineBreaks(msg), ...sanitizedArgs);
            }
            return baseLogger[lvl](stripLineBreaks(event), (typeof msg === 'string' ? stripLineBreaks(msg) : msg), ...sanitizedArgs);
        };
    }
    return proxyLogger;
}
function createLogger(serviceName, featureName, options = {}) {
    const key = `${serviceName}:${featureName ?? ''}`;
    if (loggerCache.has(key))
        return loggerCache.get(key);
    const level = process.env.LOG_LEVEL || 'info';
    const isProd = process.env.NODE_ENV === 'production';
    const isTest = process.env.NODE_ENV === 'test';
    const retainDays = options.retainDays ?? DEFAULT_RETAIN_DAYS;
    const { logsRoot, filePath } = resolveLogPaths(serviceName, featureName, options.logsParentDir ?? 'logs');
    setImmediate(() => cleanupOldLogs(logsRoot, retainDays));
    const streams = buildStreams(level, isProd, isTest, logsRoot, filePath);
    const baseLogger = (0, pino_1.default)({
        level,
        base: { service: serviceName },
        timestamp: pino_1.default.stdTimeFunctions.isoTime,
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
        serializers: { err: pino_1.default.stdSerializers.err },
    }, pino_1.default.multistream(streams));
    const logger = wrapWithEventSanitization(baseLogger);
    loggerCache.set(key, logger);
    return logger;
}
var response_logger_interceptor_1 = require("./response-logger.interceptor");
Object.defineProperty(exports, "createResponseLoggerInterceptor", { enumerable: true, get: function () { return response_logger_interceptor_1.createResponseLoggerInterceptor; } });
var domain_logger_1 = require("./domain-logger");
Object.defineProperty(exports, "BaseDomainLogger", { enumerable: true, get: function () { return domain_logger_1.BaseDomainLogger; } });
var bootstrap_1 = require("./bootstrap");
Object.defineProperty(exports, "bootstrapService", { enumerable: true, get: function () { return bootstrap_1.bootstrapService; } });
exports.default = createLogger;
