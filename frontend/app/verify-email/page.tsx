"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { resendVerification } from "@/api/register/resend-verification";
import { verifyEmail } from "@/api/register/verify-email";
import AuthBackground from "@/components/pages/auth-background";
import AuthLogo from "@/components/pages/auth-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getApiErrorMessage } from "@/lib/auth/errors";

type VerifyStatus = "idle" | "loading" | "success" | "error";

function VerifyEmailContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const [status, setStatus] = useState<VerifyStatus>(token ? "loading" : "idle");
    const [message, setMessage] = useState<string | null>(null);
    const [resendLoading, setResendLoading] = useState(false);

    const runVerify = useCallback(async (verifyToken: string) => {
        setStatus("loading");
        setMessage(null);
        try {
            const data = await verifyEmail({ token: verifyToken });
            setStatus("success");
            setMessage(data.message);
            toast.success(data.message);
            setTimeout(() => router.push("/login/client"), 2000);
        } catch (err) {
            setStatus("error");
            const msg = getApiErrorMessage(err);
            setMessage(msg);
            toast.error(msg);
        }
    }, [router]);

    useEffect(() => {
        if (token) {
            runVerify(token);
        }
    }, [token, runVerify]);

    async function handleResend(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const fd = new FormData(event.currentTarget);
        const email = String(fd.get("email") ?? "").trim();

        if (!email) {
            toast.error("Informe seu e-mail");
            return;
        }

        setResendLoading(true);
        try {
            const data = await resendVerification({ email });
            toast.success(data.message);
            setMessage(data.message);
        } catch (err) {
            toast.error(getApiErrorMessage(err));
        } finally {
            setResendLoading(false);
        }
    }

    return (
        <AuthBackground>
            <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-4 py-12 sm:px-6">
                <AuthLogo className="mx-auto mb-8 inline-flex" />

                <Card className="bg-card/95 shadow-sm">
                    <CardHeader className="items-center px-6 pt-7 text-center sm:px-8">
                        <CardTitle className="text-2xl font-semibold tracking-tight">
                            Verificação de e-mail
                        </CardTitle>
                        <CardDescription className="max-w-sm">
                            {token
                                ? "Estamos confirmando seu endereço de e-mail."
                                : "Cole o token do link recebido ou solicite um novo e-mail."}
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6 px-6 pb-6 sm:px-8 sm:pb-8">
                        {status === "loading" && (
                            <p className="text-center text-sm text-muted-foreground">
                                Verificando...
                            </p>
                        )}

                        {status === "success" && message && (
                            <p className="text-center text-sm text-primary">{message}</p>
                        )}

                        {status === "error" && message && (
                            <p className="text-center text-sm text-destructive" role="alert">
                                {message}
                            </p>
                        )}

                        {!token && (
                            <form
                                className="space-y-4"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    const fd = new FormData(e.currentTarget);
                                    const t = String(fd.get("token") ?? "").trim();
                                    if (t) runVerify(t);
                                    else toast.error("Informe o token de verificação");
                                }}
                            >
                                <Field>
                                    <FieldLabel htmlFor="token">Token</FieldLabel>
                                    <Input
                                        id="token"
                                        name="token"
                                        placeholder="Token do e-mail"
                                        required
                                    />
                                </Field>
                                <Button type="submit" className="w-full">
                                    Verificar
                                </Button>
                            </form>
                        )}

                        {token && status === "error" && (
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                onClick={() => runVerify(token)}
                            >
                                Tentar novamente
                            </Button>
                        )}

                        <div className="border-t pt-6">
                            <p className="mb-4 text-center text-sm text-muted-foreground">
                                Não recebeu o e-mail? Reenvie o link:
                            </p>
                            <form onSubmit={handleResend}>
                                <FieldGroup>
                                    <Field>
                                        <FieldLabel htmlFor="email">E-mail</FieldLabel>
                                        <Input
                                            id="email"
                                            name="email"
                                            type="email"
                                            required
                                            placeholder="seu@email.com"
                                        />
                                    </Field>
                                    <Button
                                        type="submit"
                                        variant="secondary"
                                        className="w-full"
                                        disabled={resendLoading}
                                    >
                                        {resendLoading ? "Enviando..." : "Reenviar verificação"}
                                    </Button>
                                </FieldGroup>
                            </form>
                        </div>

                        <p className="text-center text-sm text-muted-foreground">
                            <Link href="/login/client" className="font-semibold text-primary hover:underline">
                                Ir para login
                            </Link>
                        </p>
                    </CardContent>
                </Card>
            </main>
        </AuthBackground>
    );
}

export default function VerifyEmailPage() {
    return (
        <Suspense
            fallback={
                <AuthBackground>
                    <main className="mx-auto flex min-h-screen max-w-xl items-center justify-center px-4">
                        <p className="text-muted-foreground">Carregando...</p>
                    </main>
                </AuthBackground>
            }
        >
            <VerifyEmailContent />
        </Suspense>
    );
}
