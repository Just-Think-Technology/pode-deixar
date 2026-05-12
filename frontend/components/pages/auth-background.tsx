import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AuthBackgroundProps = {
    children: ReactNode;
    className?: string;
};

export default function AuthBackground({ children, className }: AuthBackgroundProps) {
    return (
        <div className={cn("relative min-h-screen overflow-hidden bg-background font-poppins", className)}>
            <div className="pointer-events-none absolute -left-28 -top-28 size-[34rem] rounded-full bg-primary/18 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-32 -right-24 size-[30rem] rounded-full bg-secondary/16 blur-3xl" />
            <div className="pointer-events-none absolute left-1/2 top-1/3 size-[24rem] -translate-x-1/2 rounded-full bg-accent/14 blur-3xl" />
            <div className="pointer-events-none absolute inset-0 opacity-[0.38] [background-image:linear-gradient(to_right,color-mix(in_srgb,var(--foreground)_12%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_srgb,var(--foreground)_12%,transparent)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_76%)]" />
            <div className="pointer-events-none absolute inset-0 opacity-[0.36] [background-image:radial-gradient(circle_at_1px_1px,color-mix(in_srgb,var(--primary)_42%,transparent)_1px,transparent_0)] [background-size:24px_24px] [mask-image:linear-gradient(to_bottom,transparent,black_12%,black_82%,transparent)]" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-white/35 to-transparent" />
            <div className="relative z-10">{children}</div>
        </div>
    );
}
