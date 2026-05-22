"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { forgotPassword } from "@/api/forgot-password";
import { getApiErrorMessage } from "@/lib/auth/errors";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import AuthBackground from "./auth-background";
import AuthLogo from "./auth-logo";

export function ForgotPasswordForm() {
    const [loading, setLoading] = useState(false);

    async function handleForgotPassword(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form);
        const email = String(formData.get("email") ?? "").trim();

        if (!email) {
            toast.error("Informe seu e-mail");
            return;
        }

        setLoading(true);
        try {
            const data = await forgotPassword({ email });
            toast.success(data.message);
            form.reset();
        } catch (err) {
            toast.error(getApiErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }

    return <div>
        <AuthBackground>
            <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-4 py-12 sm:px-6">
                <AuthLogo className="mx-auto mb-8 inline-flex" />
                <Link
                    href="/select-user"
                    className="mb-4 inline-flex w-fit items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                    <ArrowLeft className="size-4" />
                    Voltar
                </Link>
                <form className="space-y-6 bg-card/95 shadow-sm p-6 rounded-lg" onSubmit={handleForgotPassword}>
                    <div className="flex flex-col gap-2">
                        <Label className="text-sm font-medium text-foreground" htmlFor="email">E-mail</Label>
                        <Input className="h-11 pl-9" id="email" name="email" type="email" required autoComplete="email" placeholder="digite seu e-mail" disabled={loading} />
                    </div>
                    <Button type="submit" className="w-full h-11" disabled={loading}>
                        {loading ? "Aguarde..." : "Enviar"}
                    </Button>
                </form>
            </main>
        </AuthBackground>
    </div>;
}