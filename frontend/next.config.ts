import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // Evita conflito de lock do `.next` quando Docker e Playwright rodam juntos.
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
        // CSP compatível com Next.js: hidratação e estilos exigem
        // 'unsafe-inline' sem nonces configurados (ver docs do Next sobre
        // content-security-policy); o restante segue estrito. Em dev há
        // exceções p/ localhost (MinIO/backend/websocket do HMR) — nunca em prod.
        const dev = process.env.NODE_ENV !== "production";
        const imgSrc = ["'self'", "https:", "data:", "blob:"];
        const connectSrc = ["'self'", "https:"];
        if (dev) {
            imgSrc.push("http://localhost:*", "http://127.0.0.1:*");
            connectSrc.push(
                "http://localhost:*",
                "http://127.0.0.1:*",
                "ws://localhost:*",
                "ws://127.0.0.1:*",
            );
        }
        const csp = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline'",
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
