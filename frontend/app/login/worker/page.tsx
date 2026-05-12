import AuthFormPage from "@/components/pages/auth-form-page";
import { authRoleConfig } from "@/components/pages/auth-router-data";

export default function WorkerLoginPage() {
    return <AuthFormPage mode="login" role={authRoleConfig.worker} />;
}
