"use client";

import Link from "next/link";
import { ArrowLeft, Lock, Mail, Phone } from "lucide-react";

import AuthBackground from "@/components/pages/auth-background";
import AuthLogo from "@/components/pages/auth-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { AuthRoleConfig } from "@/components/pages/auth-router-data";

type AuthFormMode = "login" | "register";

type AuthFormPageProps = {
    mode: AuthFormMode;
    role: AuthRoleConfig;
};

export default function AuthFormPage({ mode, role }: AuthFormPageProps) {
    const isLogin = mode === "login";
    const title = isLogin ? role.loginLabel : role.registerLabel;
    const subtitle = isLogin
        ? "Entre para acompanhar suas solicitações e conversas."
        : "Crie sua conta para iniciar seu fluxo na plataforma.";
    const submitLabel = isLogin ? "Entrar" : "Criar conta";
    const alternateHref = isLogin ? role.registerHref : role.loginHref;
    const alternateText = isLogin ? "Ainda não tem conta?" : "Já tem uma conta?";
    const alternateLabel = isLogin ? role.registerLabel : role.loginLabel;

    return (
        <AuthBackground>
            <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-4 py-12 sm:px-6">
                <AuthLogo className="mx-auto mb-8 inline-flex" />

                <Link
                    href={role.selectionHref}
                    className="mb-4 inline-flex w-fit items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                    <ArrowLeft className="size-4" />
                    Voltar para ações
                </Link>

                <Card className="bg-card/95 shadow-sm">
                    <CardHeader className="items-center px-6 pt-7 text-center sm:px-8">
                        <Badge variant="outline" className="mb-2">
                            {role.label}
                        </Badge>
                        <CardTitle className="text-2xl font-semibold tracking-tight sm:text-3xl">
                            {title}
                        </CardTitle>
                        <CardDescription className="max-w-sm">
                            {subtitle}
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="px-6 pb-6 sm:px-8 sm:pb-8">
                        <form className="space-y-6" onSubmit={(event) => event.preventDefault()}>
                            <FieldGroup>
                                {!isLogin && (
                                    <Field>
                                        <FieldLabel htmlFor="name">Nome completo</FieldLabel>
                                        <Input id="name" name="name" autoComplete="name" placeholder="Seu nome" />
                                    </Field>
                                )}

                                <Field>
                                    <FieldLabel htmlFor="email">E-mail</FieldLabel>
                                    <div className="relative">
                                        <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            id="email"
                                            name="email"
                                            type="email"
                                            autoComplete="email"
                                            placeholder="seu@email.com"
                                            className="h-11 pl-9"
                                        />
                                    </div>
                                </Field>

                                {!isLogin && (
                                    <Field>
                                        <FieldLabel htmlFor="phone">Telefone</FieldLabel>
                                        <div className="relative">
                                            <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                            <Input
                                                id="phone"
                                                name="phone"
                                                type="tel"
                                                autoComplete="tel"
                                                placeholder="(11) 99999-9999"
                                                className="h-11 pl-9"
                                            />
                                        </div>
                                    </Field>
                                )}

                                {!isLogin && role.role === "worker" && (
                                    <Field>
                                        <FieldLabel htmlFor="service">Serviço principal</FieldLabel>
                                        <Input id="service" name="service" placeholder="Ex.: Eletricista, diarista, pintor" className="h-11" />
                                    </Field>
                                )}

                                <Field>
                                    <FieldLabel htmlFor="password">Senha</FieldLabel>
                                    <div className="relative">
                                        <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            id="password"
                                            name="password"
                                            type="password"
                                            autoComplete={isLogin ? "current-password" : "new-password"}
                                            placeholder="Digite sua senha"
                                            className="h-11 pl-9"
                                        />
                                    </div>
                                </Field>

                                {!isLogin && (
                                    <Field>
                                        <FieldLabel htmlFor="confirm-password">Confirmar senha</FieldLabel>
                                        <Input
                                            id="confirm-password"
                                            name="confirm-password"
                                            type="password"
                                            autoComplete="new-password"
                                            placeholder="Confirme sua senha"
                                            className="h-11"
                                        />
                                    </Field>
                                )}
                            </FieldGroup>

                            <div className="space-y-4">
                                <Button type="submit" size="lg" className="h-11 w-full text-base font-semibold">
                                    {submitLabel}
                                </Button>
                                <FieldDescription className="text-center">
                                    Formulário visual preparado para integração com autenticação.
                                </FieldDescription>
                            </div>
                        </form>

                        <div className="mt-8 border-t pt-6 text-center text-sm text-muted-foreground">
                            {alternateText}{" "}
                            <Link href={alternateHref} className="font-semibold text-primary hover:underline">
                                {alternateLabel}
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </main>
        </AuthBackground>
    );
}
