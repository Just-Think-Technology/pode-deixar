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
function limparQuebraLinha(valor) {
    if (typeof valor === 'string') {
        // Neutraliza injeção de log (CRLF) achatando quebras de linha.
        return valor.replace(/[\r\n]+/g, ' ');
    }
    if (Array.isArray(valor)) {
        return valor.map((item) => limparQuebraLinha(item));
    }
    if (valor &&
        typeof valor === 'object' &&
        !(valor instanceof Error) &&
        !(valor instanceof Date)) {
        const proto = Object.getPrototypeOf(valor);
        if (proto !== Object.prototype && proto !== null)
            return valor;
        const objeto = valor;
        const resultado = {};
        for (const [chave, item] of Object.entries(objeto)) {
            // eslint-disable-next-line security/detect-object-injection
            resultado[chave] = limparQuebraLinha(item);
        }
        return resultado;
    }
    return valor;
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
        // Redação automática de segredos antes da serialização (PCI-DSS).
        // Nota: fast-redact (pino v8) não aceita curinga parcial ('*token*'
        // lança na criação do logger); por isso os nomes são enumerados de
        // forma explícita, com variantes '*.' para um nível de aninhamento.
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
            // Neutraliza CRLF em evento/mensagem e em valores de objetos logados.
            const argsLimpos = args.map((arg) => limparQuebraLinha(arg));
            if (typeof event === 'string' && typeof msg === 'string') {
                return baseLogger[lvl]({ event: limparQuebraLinha(event) }, limparQuebraLinha(msg), ...argsLimpos);
            }
            return baseLogger[lvl](limparQuebraLinha(event), (typeof msg === 'string' ? limparQuebraLinha(msg) : msg), ...argsLimpos);
        };
    }
    const logger = proxyLogger;
    loggerCache.set(key, logger);
    return logger;
}
exports.default = createLogger;
