"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
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
    ensureDir(logsRoot);
    const date = formatDate(new Date());
    const filePrefix = featureName ? `${featureName}` : `general_${serviceName}`;
    const filePath = path_1.default.join(logsRoot, `${date}-${filePrefix}.log`);
    setImmediate(() => cleanupOldLogs(logsRoot, options.retainDays ?? 14));
    const streams = [];
    const fileStream = fs_1.default.createWriteStream(filePath, { flags: 'a' });
    const prettyFile = (0, pino_pretty_1.default)({
        colorize: false,
        translateTime: 'yyyy-mm-dd HH:MM:ss.l',
        ignore: 'pid,hostname',
        destination: fileStream,
        sync: true,
    });
    streams.push({ level: level, stream: prettyFile });
    if (!isProd) {
        const prettyStdout = (0, pino_pretty_1.default)({
            colorize: true,
            translateTime: 'yyyy-mm-dd HH:MM:ss.l',
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
    }, pino_1.default.multistream(streams));
    const proxyLogger = Object.create(baseLogger);
    const levelNames = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'];
    for (const lvl of levelNames) {
        proxyLogger[lvl] = function (event, msg, ...args) {
            if (typeof event === 'string' && typeof msg === 'string') {
                return baseLogger[lvl]({ event }, msg, ...args);
            }
            return baseLogger[lvl](event, msg, ...args);
        };
    }
    const logger = proxyLogger;
    loggerCache.set(key, logger);
    return logger;
}
exports.default = createLogger;
