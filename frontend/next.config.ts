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
};

export default nextConfig;
