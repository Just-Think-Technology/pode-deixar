// Helmet config — CSP and header policy builder

import helmet from 'helmet';

export function getHelmetConfig() {
  const isProd = process.env.NODE_ENV === 'production';
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',')
    .map((o) => o.trim())
    .filter(Boolean) ?? [];
  const connectSrc = ["'self'", ...(allowedOrigins.length ? allowedOrigins : ['http://localhost:3000'])];

  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        fontSrc: ["'self'", 'data:'],
        connectSrc,
        frameSrc: ["'none'"],
        workerSrc: ["'self'", 'blob:'],
        manifestSrc: ["'self'"],
        upgradeInsecureRequests: isProd ? [] : null,
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xPoweredBy: false,
    xFrameOptions: { action: 'deny' },
    xContentTypeOptions: true,
    xDownloadOptions: true,
    xPermittedCrossDomainPolicies: { permittedPolicies: 'none' },
  });
}