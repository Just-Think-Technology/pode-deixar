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
        return [
            {
                source: "/:path*",
                headers: [
                    {
                        key: "Content-Security-Policy",
                        value: "default-src 'self'; frame-ancestors 'self'; object-src 'none'",
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
