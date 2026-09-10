import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // Separate distDir for E2E so Docker and Playwright never share the .next lock.
    ...(process.env.NEXT_E2E === "true" ? { distDir: ".next-e2e" } : {}),
    turbopack: {
        root: path.resolve(__dirname),
    },
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "images.unsplash.com",
            },
        ],
    },
    async headers() {
        // Next.js hydration and styles require 'unsafe-inline' without configured
        // nonces; the rest stays strict. Dev allows localhost (MinIO/backend/HMR
        // websocket) — never in prod.
        const dev = process.env.NODE_ENV !== "production";
        const imgSrc = ["'self'", "https:", "data:", "blob:"];
        const connectSrc = ["'self'", "https:"];
        // React dev exige eval() (reconstrução de callstacks no HMR);
        // em produção o React nunca usa eval, então segue estrito.
        const scriptSrc = ["'self'", "'unsafe-inline'"];
        if (dev) {
            imgSrc.push("http://localhost:*", "http://127.0.0.1:*");
            connectSrc.push(
                "http://localhost:*",
                "http://127.0.0.1:*",
                "ws://localhost:*",
                "ws://127.0.0.1:*",
            );
            scriptSrc.push("'unsafe-eval'");
        }
        const csp = [
            "default-src 'self'",
            `script-src ${scriptSrc.join(" ")}`,
            "style-src 'self' 'unsafe-inline'",
            `img-src ${imgSrc.join(" ")}`,
            "font-src 'self' data:",
            `connect-src ${connectSrc.join(" ")}`,
            "frame-ancestors 'self'",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
        ].join("; ");
        return [
            {
                source: "/:path*",
                headers: [
                    {
                        key: "Content-Security-Policy",
                        value: csp,
                    },
                    {
                        key: "Strict-Transport-Security",
                        value: "max-age=31536000; includeSubDomains; preload",
                    },
                    {
                        key: "X-Frame-Options",
                        value: "DENY",
                    },
                    {
                        key: "X-Content-Type-Options",
                        value: "nosniff",
                    },
                    {
                        key: "Referrer-Policy",
                        value: "no-referrer",
                    },
                ],
            },
        ];
    },
};

export default nextConfig;
