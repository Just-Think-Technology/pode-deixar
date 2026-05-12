import Link from "next/link";
import { ArrowLeft, ArrowRight, Briefcase, CheckCircle2, User } from "lucide-react";

import AuthBackground from "@/components/pages/auth-background";
import AuthLogo from "@/components/pages/auth-logo";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { authRoles, type AuthRole } from "@/components/pages/auth-router-data";

const roleIcons: Record<AuthRole, typeof User> = {
    client: User,
    worker: Briefcase,
};

export default function SelectUserPage() {
    return (
        <AuthBackground>
            <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
                <div className="mx-auto mb-10 flex max-w-2xl flex-col items-center text-center">
                    <AuthLogo className="mb-6 inline-flex" />
                    <Link
                        href="/"
                        className="mb-4 inline-flex w-fit items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <ArrowLeft className="size-4" />
                        Voltar
                    </Link>
                    <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                        Como você deseja usar a plataforma?
                    </h1>
                    <p className="mt-3 text-sm text-muted-foreground sm:text-base">
                        Escolha o perfil que melhor representa você.
                    </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    {authRoles.map((role) => {
                        const Icon = roleIcons[role.role];

                        return (
                            <Link
                                key={role.role}
                                href={role.selectionHref}
                                aria-label={`Selecionar perfil ${role.label}`}
                                className="group rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                            >
                                <Card
                                    className={cn(
                                        "h-full border-transparent bg-card/95 py-0 shadow-none transition-colors group-hover:bg-muted/30 group-hover:ring-foreground/20",
                                        role.hoverClassName
                                    )}
                                >
                                    <CardContent className="flex h-full flex-col gap-5 p-5 sm:p-6">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                                <span
                                                    className={cn(
                                                        "flex size-10 items-center justify-center rounded-xl border bg-background",
                                                        role.accentBgClassName,
                                                        role.accentClassName
                                                    )}
                                                >
                                                    <Icon className="size-5" />
                                                </span>
                                                <div>
                                                    <p className="text-xs font-medium text-muted-foreground">
                                                        {role.label}
                                                    </p>
                                                    <h2 className="mt-1 text-base font-semibold text-foreground sm:text-lg">
                                                        {role.headline}
                                                    </h2>
                                                </div>
                                            </div>
                                            <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                                        </div>

                                        <p className="text-sm leading-6 text-muted-foreground">
                                            {role.description}
                                        </p>

                                        <ul className="mt-auto space-y-2.5">
                                            {role.bullets.map((bullet) => (
                                                <li key={bullet} className="flex items-center gap-2 text-sm text-foreground/80">
                                                    <CheckCircle2 className={cn("size-3.5 shrink-0", role.accentClassName)} />
                                                    {bullet}
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                </Card>
                            </Link>
                        );
                    })}
                </div>
            </main>
        </AuthBackground>
    );
}
