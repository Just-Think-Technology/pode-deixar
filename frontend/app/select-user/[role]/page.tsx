import { notFound } from "next/navigation";

import AuthActionPage from "@/components/pages/auth-action-page";
import { authRoleConfig, isAuthRole } from "@/components/pages/auth-router-data";

type SelectUserRolePageProps = {
    params: Promise<{
        role: string;
    }>;
};

export function generateStaticParams() {
    return [{ role: "client" }, { role: "worker" }];
}

export default async function SelectUserRolePage({ params }: SelectUserRolePageProps) {
    const { role } = await params;

    if (!isAuthRole(role)) {
        notFound();
    }

    return <AuthActionPage role={authRoleConfig[role]} />;
}
