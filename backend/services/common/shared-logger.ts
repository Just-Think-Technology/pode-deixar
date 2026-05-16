import * as fs from 'fs';
import * as path from 'path';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

function getLogsRoot() {
  return path.resolve(process.cwd(), '../../logs');
}

function ensureServiceDir(service: string) {
  const dir = path.join(getLogsRoot(), service);
  try { fs.mkdirSync(dir, { recursive: true }); } catch (e) {}
  return dir;
}

function formatLine(level: string, context: string, message: string) {
  const ts = new Date().toISOString().replace('T', ' ').split('.')[0];
  return `${ts} | ${level.padEnd(5)} | ${context} | ${message}`;
}

export function getLogger(service: string) {
  const dir = ensureServiceDir(service);

  const useRotate = (process.env.LOG_ROTATE || 'false').toLowerCase() === 'true';

  if (useRotate) {
    const logsRoot = getLogsRoot();
    const transportAuth = new DailyRotateFile({
      filename: path.join(logsRoot, service, '%DATE%-auth.log'),
      datePattern: process.env.LOG_DATE_PATTERN || 'YYYY-MM-DD',
      maxSize: process.env.LOG_MAX_SIZE || '20m',
      maxFiles: process.env.LOG_MAX_FILES || '14d',
      zippedArchive: false,
    });

    const transportToken = new DailyRotateFile({
      filename: path.join(logsRoot, service, '%DATE%-token.log'),
      datePattern: process.env.LOG_DATE_PATTERN || 'YYYY-MM-DD',
      maxSize: process.env.LOG_MAX_SIZE || '20m',
      maxFiles: process.env.LOG_MAX_FILES || '14d',
      zippedArchive: false,
    });

    const logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.printf(({ message, level }) => message),
      transports: [transportAuth, transportToken, new winston.transports.Console()],
    });

    return {
      info: (context: string, message: string) => logger.info(formatLine('INFO', context, message)),
      warn: (context: string, message: string) => logger.warn(formatLine('WARN', context, message)),
      error: (context: string, message: string) => {
        logger.error(formatLine('ERROR', context, message));
        try { fs.appendFileSync(path.join(getLogsRoot(), 'error.log'), formatLine('ERROR', service, `${context} | ${message}`) + '\n'); } catch (e) {}
      },
      token: {
        info: (context: string, message: string) => logger.info(formatLine('INFO', context, message)),
        error: (context: string, message: string) => logger.error(formatLine('ERROR', context, message)),
      },
    };
  }

  function write(file: string, level: string, context: string, message: string) {
    const line = formatLine(level, context, message);
    try {
      fs.appendFileSync(path.join(dir, file), line + '\n', { encoding: 'utf8' });
    } catch (e) {
      console.error('Logger write failed', e.message);
    }
  }

  return {
    info: (context: string, message: string) => write('auth.log', 'INFO', context, message),
    warn: (context: string, message: string) => write('auth.log', 'WARN', context, message),
    error: (context: string, message: string) => {
      write('auth.log', 'ERROR', context, message);
      try { fs.appendFileSync(path.join(getLogsRoot(), 'error.log'), formatLine('ERROR', service, `${context} | ${message}`) + '\n'); } catch (e) {}
    },
    token: {
      info: (context: string, message: string) => write('token.log', 'INFO', context, message),
      error: (context: string, message: string) => write('token.log', 'ERROR', context, message),
    }
  };
}

export default getLogger;
