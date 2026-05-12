import Link from "next/link";
import { ArrowLeft, ArrowRight, LogIn, UserPlus } from "lucide-react";

import AuthBackground from "@/components/pages/auth-background";
import AuthLogo from "@/components/pages/auth-logo";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Item,
    ItemContent,
    ItemDescription,
    ItemGroup,
    ItemMedia,
    ItemTitle,
} from "@/components/ui/item";
import { cn } from "@/lib/utils";
import type { AuthRoleConfig } from "@/components/pages/auth-router-data";

type AuthActionPageProps = {
    role: AuthRoleConfig;
};

export default function AuthActionPage({ role }: AuthActionPageProps) {
    const actions = [
        {
            href: role.loginHref,
            label: role.loginLabel,
            description: "Acesse sua conta existente e continue de onde parou.",
            icon: LogIn,
        },
        {
            href: role.registerHref,
            label: role.registerLabel,
            description: "Crie seu acesso para começar a usar a plataforma.",
            icon: UserPlus,
        },
    ];

    return (
        <AuthBackground>
            <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-4 py-12 sm:px-6">
                <AuthLogo className="mx-auto mb-8 inline-flex" />

                <Link
                    href="/select-user"
                    className="mb-4 inline-flex w-fit items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                    <ArrowLeft className="size-4" />
                    Trocar perfil
                </Link>

                <Card className="bg-card/95 shadow-sm">
                    <CardHeader className="items-center px-6 pt-7 text-center sm:px-8">
                        <Badge variant="outline" className="mb-2">
                            {role.label}
                        </Badge>
                        <CardTitle className="text-2xl font-semibold tracking-tight sm:text-3xl">
                            O que você deseja fazer?
                        </CardTitle>
                        <CardDescription>
                            Continue como {role.label.toLowerCase()} escolhendo uma das opções abaixo.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="px-6 pb-6 sm:px-8 sm:pb-8">
                        <ItemGroup className="gap-3">
                            {actions.map((action) => {
                                const Icon = action.icon;

                                return (
                                    <Link key={action.href} href={action.href} className="group rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                                        <Item
                                            variant="outline"
                                            className={cn(
                                                "cursor-pointer gap-4 rounded-xl bg-background p-4 transition-colors group-hover:border-foreground/20 group-hover:bg-muted/40 sm:p-5"
                                            )}
                                        >
                                            <ItemMedia
                                                variant="icon"
                                                className={cn(
                                                    "size-10 rounded-lg border bg-card text-muted-foreground",
                                                    role.accentClassName
                                                )}
                                            >
                                                <Icon className="size-4" />
                                            </ItemMedia>
                                            <ItemContent>
                                                <ItemTitle className="text-base font-semibold">
                                                    {action.label}
                                                </ItemTitle>
                                                <ItemDescription>
                                                    {action.description}
                                                </ItemDescription>
                                            </ItemContent>
                                            <ArrowRight className="ml-auto size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                                        </Item>
                                    </Link>
                                );
                            })}
                        </ItemGroup>
                    </CardContent>
                </Card>
            </main>
        </AuthBackground>
    );
}
