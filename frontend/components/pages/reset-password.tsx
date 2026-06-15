"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/auth/errors";
import { ROLE_HOME_HREF } from "@/lib/auth/require-role";
import AuthBackground from "./auth-background";
import { AuthFormActions, PasswordField } from "./auth-form-page";
import { resetPasswordAction } from "@/lib/auth/actions";

export function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token") ?? "";
    const [loading, setLoading] = useState(false);

    async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!token) {
            toast.error("Link inválido ou expirado");
            return;
        }

        const form = event.currentTarget;
        const formData = new FormData(form);
        const password = String(formData.get("password") ?? "").trim();
        const confirmPassword = String(formData.get("confirm-password") ?? "").trim();

        if (password !== confirmPassword) {
            toast.error("As senhas não coincidem");
            return;
        }

        setLoading(true);
        try {
            const { role } = await resetPasswordAction({ token, newPassword: password });
            toast.success("Senha resetada com sucesso");
            router.push(ROLE_HOME_HREF[role]);
        } catch (err) {
            toast.error(getApiErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }

    return (
        <AuthBackground>
            <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-4 py-12 sm:px-6">
                <form className="space-y-6 bg-card/95 shadow-sm p-6 rounded-lg" onSubmit={handleResetPassword}>
                    <PasswordField name="password" autoComplete="new-password" />
                    <PasswordField
                        name="confirm-password"
                        label="Confirmar senha"
                        placeholder="Confirme sua senha"
                        autoComplete="new-password"
                    />
                    <AuthFormActions
                        submitLabel="Resetar senha"
                        loading={loading}
                    />
                </form>
            </main>
        </AuthBackground>
    );
}