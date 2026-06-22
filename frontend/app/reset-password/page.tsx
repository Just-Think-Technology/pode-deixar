import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/pages/reset-password";

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div>Carregando...</div>}>
            <ResetPasswordForm />
        </Suspense>
    );
}
