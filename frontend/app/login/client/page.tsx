import AuthFormPage from "@/components/pages/auth-form-page";
import { authRoleConfig } from "@/components/pages/auth-router-data";

export default function ClientLoginPage() {
    return <AuthFormPage mode="login" role={authRoleConfig.client} />;
}
