import { Observable, of, throwError } from 'rxjs';
import { createResponseLoggerInterceptor } from '../response-logger.interceptor';

process.env.LOG_LEVEL = 'info';

const written: string[] = [];
let writeSpy: jest.SpyInstance;

beforeEach(() => {
  written.length = 0;
  writeSpy = jest
    .spyOn(process.stdout, 'write')
    .mockImplementation(((chunk: unknown) => {
      written.push(String(chunk));
      return true;
    }) as typeof process.stdout.write);
});

afterEach(() => {
  writeSpy.mockRestore();
});

function mockContext() {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ method: 'GET', url: '/items' }),
      getResponse: () => ({ statusCode: 200 }),
    }),
  } as never;
}

describe('createResponseLoggerInterceptor', () => {
  it('should return a distinct interceptor class per service', () => {
    const A = createResponseLoggerInterceptor('regression-svc-a');
    const B = createResponseLoggerInterceptor('regression-svc-b');

    expect(A).not.toBe(B);
    expect(new A()).toBeInstanceOf(A);
  });

  it('should pass the response through untouched', async () => {
    const Interceptor = createResponseLoggerInterceptor('regression-passthrough');
    const body = { id: 'item-1' };
    const result = await new Promise<unknown>((resolve) => {
      (
        new Interceptor().intercept(
          mockContext(),
          { handle: () => of(body) } as never,
        ) as unknown as Observable<unknown>
      ).subscribe((value) => resolve(value));
    });

    expect(result).toBe(body);
  });

  it('should sanitize sensitive fields before logging', async () => {
    const Interceptor = createResponseLoggerInterceptor('regression-sanitize');
    await new Promise<unknown>((resolve) => {
      (
        new Interceptor().intercept(mockContext(), {
          handle: () => of({ token: 'super-secret-value' }),
        } as never) as unknown as Observable<unknown>
      ).subscribe((value) => resolve(value));
    });

    const output = written.join('');
    expect(output).toContain('[REDACTED]');
    expect(output).not.toContain('super-secret-value');
  });

  it('should rethrow downstream errors', async () => {
    const Interceptor = createResponseLoggerInterceptor('regression-error');
    const failure = new Error('downstream boom');
    await expect(
      new Promise<unknown>((_resolve, reject) => {
        (
          new Interceptor().intercept(mockContext(), {
            handle: () => throwError(() => failure),
          } as never) as unknown as Observable<unknown>
        ).subscribe({ error: (err) => reject(err) });
      }),
    ).rejects.toBe(failure);
  });
});
