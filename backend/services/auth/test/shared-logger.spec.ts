import * as fs from 'fs';
import * as path from 'path';

describe('shared-logger', () => {
  const logsRoot = path.resolve(process.cwd(), '../../logs');
  const service = 'test-auth';
  const serviceDir = path.join(logsRoot, service);
  const authLog = path.join(serviceDir, 'auth.log');

  beforeAll(() => {
    process.env.LOG_ROTATE = 'false';
    try { fs.rmSync(serviceDir, { recursive: true, force: true }); } catch (e) {}
  });

  it('writes a line to auth.log', () => {
    const getLogger = require('../src/common/shared-logger').getLogger;
    const logger = getLogger(service);
    logger.info('test.context', 'hello from test');

    expect(fs.existsSync(authLog)).toBe(true);
    const content = fs.readFileSync(authLog, 'utf8');
    expect(content).toMatch(/hello from test/);
  });

  afterAll(() => {
    try { fs.rmSync(serviceDir, { recursive: true, force: true }); } catch (e) {}
  });
});
