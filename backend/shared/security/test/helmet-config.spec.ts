// Helmet config tests — header policy output

import { getHelmetConfig } from '../helmet-config';

function runMiddleware(middleware: any) {
  const headers: Record<string, string> = {};
  const req: any = { secure: false };
  const res: any = {
    setHeader: jest.fn((name: string, value: string) => {
      headers[name.toLowerCase()] = value;
    }),
    getHeader: (name: string) => headers[name.toLowerCase()],
    removeHeader: jest.fn((name: string) => {
      delete headers[name.toLowerCase()];
    }),
  };
  const next = jest.fn();
  middleware(req, res, next);
  return { headers, next };
}

// --- Tests ---

describe('getHelmetConfig (shared)', () => {
  const previousAllowedOrigins = process.env.ALLOWED_ORIGINS;

  afterEach(() => {
    if (previousAllowedOrigins === undefined) {
      delete process.env.ALLOWED_ORIGINS;
    } else {
      process.env.ALLOWED_ORIGINS = previousAllowedOrigins;
    }
  });

  it('should apply CSP with default-src self and frame-ancestors none', () => {
    const { headers, next } = runMiddleware(getHelmetConfig());

    expect(next).toHaveBeenCalled();
    const csp = headers['content-security-policy'] ?? '';
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
  });

  it('should apply 1-year HSTS with includeSubDomains and preload', () => {
    const { headers } = runMiddleware(getHelmetConfig());

    const hsts = headers['strict-transport-security'] ?? '';
    expect(hsts).toContain('max-age=31536000');
    expect(hsts).toContain('includeSubDomains');
    expect(hsts).toContain('preload');
  });

  it('should deny framing via X-Frame-Options', () => {
    const { headers } = runMiddleware(getHelmetConfig());

    expect(headers['x-frame-options']).toBe('DENY');
  });

  it('should reflect ALLOWED_ORIGINS in connect-src', () => {
    process.env.ALLOWED_ORIGINS = 'https://app.example.com';

    const { headers } = runMiddleware(getHelmetConfig());

    expect(headers['content-security-policy'] ?? '').toContain(
      'https://app.example.com',
    );
  });

  it('should not force upgrade-insecure-requests outside production', () => {
    const { headers } = runMiddleware(getHelmetConfig());

    expect(headers['content-security-policy'] ?? '').not.toContain(
      'upgrade-insecure-requests',
    );
  });
});
