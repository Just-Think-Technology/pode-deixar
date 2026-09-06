import fs from 'fs';
import os from 'os';
import path from 'path';
import createLoggerDefault, { createLogger } from '../index';

// ─── Tests ──────────────────────────────────────────────────────────────────
// Regressão: trava o contrato do logger compartilhado sem tocar no FS real
// (NODE_ENV=test desativa o stream de arquivo) e sem depender de outros pacotes.

process.env.LOG_LEVEL = 'fatal';

const flushImmediate = () =>
  new Promise<void>((resolve) => {
    setImmediate(() => setImmediate(() => resolve()));
  });

describe('createLogger (shared)', () => {
  it('deve expor o default export como createLogger', () => {
    expect(createLoggerDefault).toBe(createLogger);
  });

  it('deve retornar a mesma instância para a mesma chave (cache)', () => {
    const a = createLogger('regression-cache-svc');
    const b = createLogger('regression-cache-svc');

    expect(a).toBe(b);
  });

  it('deve retornar instâncias distintas para features distintas', () => {
    const a = createLogger('regression-feat-svc', 'feature-a');
    const b = createLogger('regression-feat-svc', 'feature-b');

    expect(a).not.toBe(b);
  });

  it('deve aceitar (event, msg) em todos os níveis sem lançar', () => {
    const logger = createLogger('regression-levels-svc');

    expect(() =>
      (['fatal', 'error', 'warn', 'info', 'debug', 'trace'] as const).forEach(
        (level) => logger[level]('regression.event', 'mensagem de teste'),
      ),
    ).not.toThrow();
  });

  it('deve remover logs antigos e preservar recentes (cleanupOldLogs)', async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'logger-regression-'));
    const serviceName = `regression-cleanup-${Date.now()}`;
    const serviceDir = path.join(tmpRoot, serviceName);
    fs.mkdirSync(serviceDir, { recursive: true });

    const oldFile = path.join(serviceDir, 'old.log');
    const freshFile = path.join(serviceDir, 'fresh.log');
    fs.writeFileSync(oldFile, 'old');
    fs.writeFileSync(freshFile, 'fresh');
    const twentyDaysAgo = new Date(Date.now() - 20 * 86400000);
    fs.utimesSync(oldFile, twentyDaysAgo, twentyDaysAgo);

    createLogger(serviceName, undefined, {
      logsParentDir: tmpRoot,
      retainDays: 14,
    });
    await flushImmediate();

    expect(fs.existsSync(oldFile)).toBe(false);
    expect(fs.existsSync(freshFile)).toBe(true);

    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });
});
