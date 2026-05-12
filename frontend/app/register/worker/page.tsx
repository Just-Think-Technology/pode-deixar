import AuthFormPage from "@/components/pages/auth-form-page";
import { authRoleConfig } from "@/components/pages/auth-router-data";

export default function WorkerRegisterPage() {
    return <AuthFormPage mode="register" role={authRoleConfig.worker} />;
}
