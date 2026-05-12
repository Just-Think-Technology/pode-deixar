import AuthFormPage from "@/components/pages/auth-form-page";
import { authRoleConfig } from "@/components/pages/auth-router-data";

export default function ClientRegisterPage() {
    return <AuthFormPage mode="register" role={authRoleConfig.client} />;
}
