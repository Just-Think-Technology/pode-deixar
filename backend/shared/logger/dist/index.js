"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bootstrapService = exports.createResponseLoggerInterceptor = void 0;
exports.createLogger = createLogger;
const pino_1 = __importDefault(require("pino"));
const pino_pretty_1 = __importDefault(require("pino-pretty"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function ensureDir(dir) {
    try {
        fs_1.default.mkdirSync(dir, { recursive: true });
    }
    catch (e) { }
}
function formatDate(d) {
    return d.toISOString().slice(0, 10);
}
function cleanupOldLogs(dir, retainDays = 14) {
    try {
        const files = fs_1.default.readdirSync(dir);
        const now = Date.now();
        for (const f of files) {
            const full = path_1.default.join(dir, f);
            try {
                const stat = fs_1.default.statSync(full);
                if ((now - stat.mtimeMs) / 86400000 > retainDays)
                    fs_1.default.unlinkSync(full);
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
function createLogger(serviceName, featureName, options = {}) {
    const key = `${serviceName}:${featureName ?? ''}`;
    if (loggerCache.has(key))
        return loggerCache.get(key);
    const level = process.env.LOG_LEVEL || 'info';
    const isProd = process.env.NODE_ENV === 'production';
    const logsParentDir = options.logsParentDir ?? 'logs';
    const currentDir = path_1.default.basename(__dirname) === 'dist' ? path_1.default.resolve(__dirname, '..') : __dirname;
    const logsRoot = path_1.default.resolve(currentDir, '..', '..', logsParentDir, serviceName);
    const isTest = process.env.NODE_ENV === 'test';
    if (!isTest)
        ensureDir(logsRoot);
    const date = formatDate(new Date());
    const filePrefix = featureName ? `${featureName}` : `general`;
    const filePath = path_1.default.join(logsRoot, `${date}-${filePrefix}.log`);
    setImmediate(() => cleanupOldLogs(logsRoot, options.retainDays ?? 14));
    const streams = [];
    if (!isTest) {
        const fileStream = fs_1.default.createWriteStream(filePath, { flags: 'a' });
        const prettyFile = (0, pino_pretty_1.default)({
            colorize: false,
            translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
            ignore: 'pid,hostname',
            destination: fileStream,
            sync: true,
        });
        streams.push({ level: level, stream: prettyFile });
        setImmediate(() => cleanupOldLogs(logsRoot, options.retainDays ?? 14));
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
    const baseLogger = (0, pino_1.default)({
        level,
        base: { service: serviceName },
        timestamp: pino_1.default.stdTimeFunctions.isoTime,
        formatters: {
            level(label) { return { level: label }; },
        },
        // Secrets are redacted before serialization for PCI-DSS compliance; fast-redact (pino v8) rejects partial wildcards such as '*token*' at logger creation, so names are enumerated explicitly with '*.' variants for one nesting level.
        redact: {
            paths: [
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
            ],
            censor: '[REDACTED]',
        },
        serializers: { err: pino_1.default.stdSerializers.err },
    }, pino_1.default.multistream(streams));
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
    const logger = proxyLogger;
    loggerCache.set(key, logger);
    return logger;
}
var response_logger_interceptor_1 = require("./response-logger.interceptor");
Object.defineProperty(exports, "createResponseLoggerInterceptor", { enumerable: true, get: function () { return response_logger_interceptor_1.createResponseLoggerInterceptor; } });
var bootstrap_1 = require("./bootstrap");
Object.defineProperty(exports, "bootstrapService", { enumerable: true, get: function () { return bootstrap_1.bootstrapService; } });
exports.default = createLogger;
