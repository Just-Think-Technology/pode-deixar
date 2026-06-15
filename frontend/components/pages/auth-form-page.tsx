"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock, Mail, MapPin, Phone } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";

import { login } from "@/api/login";
import { register } from "@/api/register";

import {
    assertLoginRole,
    authRoleConfig,
    expectedRoleForAuthRoute,
    type AuthRole,
    type AuthRoleConfig,
} from "@/components/pages/auth-router-data";
import AuthBackground from "@/components/pages/auth-background";
import AuthLogo from "@/components/pages/auth-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    getApiErrorMessage,
    isEmailNotVerifiedError,
    mapApiErrorToFieldErrors,
} from "@/lib/auth/errors";
import { parseLoginForm, parseRegisterForm } from "@/lib/auth/map-form";
import { saveAuthSessionAction } from "@/lib/auth/actions";
import type { PublicRole } from "@/lib/auth/types";
import { validateLogin, validateRegister } from "@/lib/auth/validation";

function FieldError({ message }: { message?: string }) {
    if (!message) return null;
    return <p className="text-sm text-destructive">{message}</p>;
}

type AuthFormShellProps = {
    role: AuthRoleConfig;
    title: string;
    subtitle: string;
    alternateHref: string;
    alternateText: string;
    alternateLabel: string;
    children: ReactNode;
};

function AuthFormShell({
    role,
    title,
    subtitle,
    alternateHref,
    alternateText,
    alternateLabel,
    children,
}: AuthFormShellProps) {
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
                        {children}

                        <div className="mt-8 border-t pt-6 text-center text-sm text-muted-foreground">
                            {alternateText}{" "}
                            <Link
                                href={alternateHref}
                                className="font-semibold text-primary hover:underline"
                            >
                                {alternateLabel}
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </main>
        </AuthBackground>
    );
}

function EmailField({ error }: { error?: string }) {
    return (
        <Field>
            <FieldLabel htmlFor="email">E-mail</FieldLabel>
            <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="seu@email.com"
                    className="h-11 pl-9"
                    aria-invalid={!!error}
                />
            </div>
            <FieldError message={error} />
        </Field>
    );
}

function PasswordField({
    autoComplete,
    error,
}: {
    autoComplete: "current-password" | "new-password";
    error?: string;
}) {
    return (
        <Field>
            <FieldLabel htmlFor="password">Senha</FieldLabel>
            <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    autoComplete={autoComplete}
                    placeholder="Digite sua senha"
                    className="h-11 pl-9"
                    aria-invalid={!!error}
                />
            </div>
            <FieldError message={error} />
        </Field>
    );
}

function PostalCodeField({ error }: { error?: string }) {
    return (
        <Field>
            <FieldLabel htmlFor="postal_code">CEP</FieldLabel>
            <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    id="postal_code"
                    name="postal_code"
                    required
                    autoComplete="postal-code"
                    placeholder="12345-678"
                    className="h-11 pl-9"
                    aria-invalid={!!error}
                />
            </div>
            <FieldError message={error} />
        </Field>
    );
}

function RememberMeField() {
    return (
        <div className="flex items-center gap-2">
            <input
                type="checkbox"
                id="rememberMe"
                name="rememberMe"
                value="true"
                className="size-4 rounded border border-input accent-primary"
            />
            <Label
                htmlFor="rememberMe"
                className="cursor-pointer text-sm font-normal"
            >
                Manter conectado
            </Label>
        </div>
    );
}

type AuthFormActionsProps = {
    submitLabel: string;
    loading: boolean;
    error: string | null;
};

function AuthFormActions({
    submitLabel,
    loading,
    error,
}: AuthFormActionsProps) {
    return (
        <div className="space-y-4">
            {error && (
                <p
                    className="text-center text-sm text-destructive"
                    role="alert"
                >
                    {error}
                    {error.toLowerCase().includes("verif") && (
                        <>
                            {" "}
                            <Link
                                href="/verify-email"
                                className="font-semibold underline"
                            >
                                Verificar e-mail
                            </Link>
                        </>
                    )}
                </p>
            )}
            <Button
                type="submit"
                size="lg"
                className="h-11 w-full text-base font-semibold"
                disabled={loading}
            >
                {loading ? "Aguarde..." : submitLabel}
            </Button>
        </div>
    );
}

function useAuthFormSubmit() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const wrapSubmit =
        (handler: (form: HTMLFormElement) => Promise<void>) =>
        async (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            setError(null);
            setFieldErrors({});
            setLoading(true);
            try {
                await handler(event.currentTarget);
            } catch (err) {
                const message = getApiErrorMessage(err);
                const mapped = mapApiErrorToFieldErrors(err);

                if (mapped) {
                    setFieldErrors(mapped);
                } else {
                    setError(message);
                }

                if (isEmailNotVerifiedError(err)) {
                    toast.error("Verifique seu e-mail antes de entrar.", {
                        description:
                            "Acesse o link enviado ou a página de verificação.",
                    });
                } else {
                    toast.error(message);
                }
            } finally {
                setLoading(false);
            }
        };

    return {
        loading,
        error,
        fieldErrors,
        wrapSubmit,
        setFieldErrors,
        setError,
    };
}

function useLoginHandler(authRole: AuthRole) {
    const router = useRouter();
    const role = authRoleConfig[authRole];
    const expectedRole = expectedRoleForAuthRoute(authRole);

    return async (form: HTMLFormElement) => {
        const payload = parseLoginForm(form);
        const validation = validateLogin(payload);

        if (!validation.ok) {
            throw Object.assign(new Error("validation"), {
                fieldErrors: validation.errors,
            });
        }

        const data = await login(payload);
        assertLoginRole(data.user.role, expectedRole, role.label);
        await saveAuthSessionAction(data);
        toast.success(data.message);
        router.push(role.postLoginHref);
    };
}

function useRegisterHandler(authRole: AuthRole, publicRole: PublicRole) {
    const router = useRouter();
    const role = authRoleConfig[authRole];

    return async (form: HTMLFormElement) => {
        const payload = parseRegisterForm(form, publicRole);
        const validation = validateRegister(payload);

        if (!validation.ok) {
            throw Object.assign(new Error("validation"), {
                fieldErrors: validation.errors,
            });
        }

        const data = await register(payload);
        toast.success(data.message);
        router.push(role.postRegisterLoginHref);
    };
}

function handleValidationError(
    err: unknown,
    setFieldErrors: (e: Record<string, string>) => void,
    setError: (e: string | null) => void,
): boolean {
    if (
        err instanceof Error &&
        err.message === "validation" &&
        "fieldErrors" in err &&
        typeof (err as Error & { fieldErrors: Record<string, string> })
            .fieldErrors === "object"
    ) {
        const { fieldErrors } = err as Error & {
            fieldErrors: Record<string, string>;
        };
        setFieldErrors(fieldErrors);
        const first = Object.values(fieldErrors)[0];
        if (first) toast.error(first);
        return true;
    }
    return false;
}

export function ClientLoginForm() {
    const role = authRoleConfig.client;
    const {
        loading,
        error,
        fieldErrors,
        wrapSubmit,
        setFieldErrors,
        setError,
    } = useAuthFormSubmit();
    const loginHandler = useLoginHandler("client");

    const onSubmit = wrapSubmit(async (form) => {
        try {
            await loginHandler(form);
        } catch (err) {
            if (!handleValidationError(err, setFieldErrors, setError))
                throw err;
        }
    });

    return (
        <AuthFormShell
            role={role}
            title={role.loginLabel}
            subtitle="Entre para acompanhar suas solicitações e conversas."
            alternateHref={role.registerHref}
            alternateText="Ainda não tem conta?"
            alternateLabel={role.registerLabel}
        >
            <form className="space-y-6" onSubmit={onSubmit}>
                <FieldGroup>
                    <EmailField error={fieldErrors.email} />
                    <PasswordField
                        autoComplete="current-password"
                        error={fieldErrors.password}
                    />
                    <RememberMeField />
                </FieldGroup>
                <AuthFormActions
                    submitLabel="Entrar"
                    loading={loading}
                    error={error}
                />
            </form>
            <div className=" pt-6 text-center text-sm text-muted-foreground">
                <Link
                    href="/forgot-password"
                    className="font-semibold text-primary hover:underline"
                >
                    Esqueceu sua senha?
                </Link>
            </div>
        </AuthFormShell>
    );
}

export function WorkerLoginForm() {
    const role = authRoleConfig.worker;
    const {
        loading,
        error,
        fieldErrors,
        wrapSubmit,
        setFieldErrors,
        setError,
    } = useAuthFormSubmit();
    const loginHandler = useLoginHandler("worker");

    const onSubmit = wrapSubmit(async (form) => {
        try {
            await loginHandler(form);
        } catch (err) {
            if (!handleValidationError(err, setFieldErrors, setError))
                throw err;
        }
    });

    return (
        <AuthFormShell
            role={role}
            title={role.loginLabel}
            subtitle="Entre para acompanhar suas solicitações e conversas."
            alternateHref={role.registerHref}
            alternateText="Ainda não tem conta?"
            alternateLabel={role.registerLabel}
        >
            <form className="space-y-6" onSubmit={onSubmit}>
                <FieldGroup>
                    <EmailField error={fieldErrors.email} />
                    <PasswordField
                        autoComplete="current-password"
                        error={fieldErrors.password}
                    />
                    <RememberMeField />
                </FieldGroup>
                <AuthFormActions
                    submitLabel="Entrar"
                    loading={loading}
                    error={error}
                />
            </form>
            <div className=" pt-6 text-center text-sm text-muted-foreground">
                <Link
                    href="/forgot-password"
                    className="font-semibold text-primary hover:underline"
                >
                    Esqueceu sua senha?
                </Link>
            </div>
        </AuthFormShell>
    );
}

export function ClientRegisterForm() {
    const role = authRoleConfig.client;
    const {
        loading,
        error,
        fieldErrors,
        wrapSubmit,
        setFieldErrors,
        setError,
    } = useAuthFormSubmit();
    const registerHandler = useRegisterHandler("client", "CLIENT");

    const onSubmit = wrapSubmit(async (form) => {
        try {
            await registerHandler(form);
        } catch (err) {
            if (!handleValidationError(err, setFieldErrors, setError))
                throw err;
        }
    });

    return (
        <AuthFormShell
            role={role}
            title={role.registerLabel}
            subtitle="Crie sua conta para iniciar seu fluxo na plataforma."
            alternateHref={role.loginHref}
            alternateText="Já tem uma conta?"
            alternateLabel={role.loginLabel}
        >
            <form className="space-y-6" onSubmit={onSubmit}>
                <FieldGroup>
                    <Field>
                        <FieldLabel htmlFor="complete_name">
                            Nome completo
                        </FieldLabel>
                        <Input
                            id="complete_name"
                            name="complete_name"
                            required
                            autoComplete="name"
                            placeholder="Seu nome"
                            aria-invalid={!!fieldErrors.complete_name}
                        />
                        <FieldError message={fieldErrors.complete_name} />
                    </Field>
                    <EmailField error={fieldErrors.email} />
                    <Field>
                        <FieldLabel htmlFor="phone">Telefone</FieldLabel>
                        <div className="relative">
                            <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                id="phone"
                                name="phone"
                                type="tel"
                                required
                                autoComplete="tel"
                                placeholder="(11) 99999-9999"
                                className="h-11 pl-9"
                                aria-invalid={!!fieldErrors.phone}
                            />
                        </div>
                        <FieldError message={fieldErrors.phone} />
                    </Field>
                    <PostalCodeField error={fieldErrors.postal_code} />
                    <PasswordField
                        autoComplete="new-password"
                        error={fieldErrors.password}
                    />
                    <Field>
                        <FieldLabel htmlFor="confirm-password">
                            Confirmar senha
                        </FieldLabel>
                        <Input
                            id="confirm-password"
                            name="confirm-password"
                            type="password"
                            required
                            autoComplete="new-password"
                            placeholder="Confirme sua senha"
                            className="h-11"
                            aria-invalid={!!fieldErrors["confirm-password"]}
                        />
                        <FieldError message={fieldErrors["confirm-password"]} />
                    </Field>
                </FieldGroup>
                <AuthFormActions
                    submitLabel="Criar conta"
                    loading={loading}
                    error={error}
                />
            </form>
        </AuthFormShell>
    );
}

export function WorkerRegisterForm() {
    const role = authRoleConfig.worker;
    const {
        loading,
        error,
        fieldErrors,
        wrapSubmit,
        setFieldErrors,
        setError,
    } = useAuthFormSubmit();
    const registerHandler = useRegisterHandler("worker", "PROVIDER");

    const onSubmit = wrapSubmit(async (form) => {
        try {
            await registerHandler(form);
        } catch (err) {
            if (!handleValidationError(err, setFieldErrors, setError))
                throw err;
        }
    });

    return (
        <AuthFormShell
            role={role}
            title={role.registerLabel}
            subtitle="Crie sua conta para iniciar seu fluxo na plataforma."
            alternateHref={role.loginHref}
            alternateText="Já tem uma conta?"
            alternateLabel={role.loginLabel}
        >
            <form className="space-y-6" onSubmit={onSubmit}>
                <FieldGroup>
                    <Field>
                        <FieldLabel htmlFor="complete_name">
                            Nome completo
                        </FieldLabel>
                        <Input
                            id="complete_name"
                            name="complete_name"
                            required
                            autoComplete="name"
                            placeholder="Seu nome"
                            aria-invalid={!!fieldErrors.complete_name}
                        />
                        <FieldError message={fieldErrors.complete_name} />
                    </Field>
                    <EmailField error={fieldErrors.email} />
                    <Field>
                        <FieldLabel htmlFor="phone">Telefone</FieldLabel>
                        <div className="relative">
                            <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                id="phone"
                                name="phone"
                                type="tel"
                                required
                                autoComplete="tel"
                                placeholder="(11) 99999-9999"
                                className="h-11 pl-9"
                                aria-invalid={!!fieldErrors.phone}
                            />
                        </div>
                        <FieldError message={fieldErrors.phone} />
                    </Field>
                    <PostalCodeField error={fieldErrors.postal_code} />
                    <PasswordField
                        autoComplete="new-password"
                        error={fieldErrors.password}
                    />
                    <Field>
                        <FieldLabel htmlFor="confirm-password">
                            Confirmar senha
                        </FieldLabel>
                        <Input
                            id="confirm-password"
                            name="confirm-password"
                            type="password"
                            required
                            autoComplete="new-password"
                            placeholder="Confirme sua senha"
                            className="h-11"
                            aria-invalid={!!fieldErrors["confirm-password"]}
                        />
                        <FieldError message={fieldErrors["confirm-password"]} />
                    </Field>
                </FieldGroup>
                <AuthFormActions
                    submitLabel="Criar conta"
                    loading={loading}
                    error={error}
                />
            </form>
        </AuthFormShell>
    );
}
