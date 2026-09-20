// purpose: Email verification route — renders the verification page
"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
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

function VerificationStatus({
  status,
  message,
}: {
  status: VerifyStatus;
  message: string | null;
}) {
  if (status === "loading") {
    return (
      <p className="text-center text-sm text-muted-foreground">Verificando...</p>
    );
  }
  if (status === "success" && message) {
    return <p className="text-center text-sm text-primary">{message}</p>;
  }
  if (status === "error" && message) {
    return (
      <p className="text-center text-sm text-destructive" role="alert">
        {message}
      </p>
    );
  }
  return null;
}

function ResendVerificationForm({
  loading,
  onResend,
}: {
  loading: boolean;
  onResend: (email: string) => void;
}) {
  return (
    <div className="border-t pt-6">
      <p className="mb-4 text-center text-sm text-muted-foreground">
        Não recebeu o e-mail? Reenvie o link:
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const email = String(
            new FormData(event.currentTarget).get("email") ?? "",
          ).trim();
          if (!email) {
            toast.error("Informe seu e-mail");
            return;
          }
          onResend(email);
        }}
      >
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
            disabled={loading}
          >
            {loading ? "Enviando..." : "Reenviar verificação"}
          </Button>
        </FieldGroup>
      </form>
    </div>
  );
}

function resolveLoginHref(role?: string | null): string {
    if (role === "PROVIDER" || role === "worker") return "/login/worker";
    return "/login/client";
}

function VerifyEmailContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const roleParam = searchParams.get("role");

    const [status, setStatus] = useState<VerifyStatus>(token ? "loading" : "idle");
    const [message, setMessage] = useState<string | null>(null);
    const [resendLoading, setResendLoading] = useState(false);
    const [verifiedRole, setVerifiedRole] = useState<string | null>(roleParam);

    const runVerify = useCallback(async (verifyToken: string) => {
        setStatus("loading");
        setMessage(null);
        try {
            const data = await verifyEmail({ token: verifyToken });
            setStatus("success");
            setMessage(data.message);
            toast.success(data.message);
            const loginRole = (data as { role?: string }).role ?? roleParam;
            if (loginRole) setVerifiedRole(loginRole);
            setTimeout(() => router.push(resolveLoginHref(loginRole)), 2000);
        } catch (err) {
            setStatus("error");
            const msg = getApiErrorMessage(err);
            setMessage(msg);
            toast.error(msg);
        }
    }, [router, roleParam]);

    useEffect(() => {
        if (token) {
            runVerify(token);
        }
    }, [token, runVerify]);

    async function handleResendEmail(email: string) {
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
                        <VerificationStatus status={status} message={message} />

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

                        <ResendVerificationForm
                            loading={resendLoading}
                            onResend={handleResendEmail}
                        />

                        <p className="text-center text-sm text-muted-foreground">
                            <Link href={resolveLoginHref(verifiedRole)} className="font-semibold text-primary hover:underline">
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
