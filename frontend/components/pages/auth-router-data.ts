export type AuthRole = "client" | "worker";

export type AuthRoleConfig = {
    role: AuthRole;
    label: string;
    headline: string;
    description: string;
    bullets: string[];
    selectionHref: string;
    loginHref: string;
    registerHref: string;
    loginLabel: string;
    registerLabel: string;
    accentClassName: string;
    accentBgClassName: string;
    hoverClassName: string;
};

export const authRoleConfig: Record<AuthRole, AuthRoleConfig> = {
    client: {
        role: "client",
        label: "Cliente",
        headline: "Quero contratar serviços",
        description: "Encontre profissionais confiáveis para resolver o que você precisa.",
        bullets: ["Encontrar profissionais", "Solicitar serviços", "Acompanhar atendimentos"],
        selectionHref: "/select-user/client",
        loginHref: "/login/client",
        registerHref: "/register/client",
        loginLabel: "Entrar como cliente",
        registerLabel: "Criar conta de cliente",
        accentClassName: "text-primary",
        accentBgClassName: "bg-primary/10",
        hoverClassName: "hover:border-primary/40 hover:bg-primary/5",
    },
    worker: {
        role: "worker",
        label: "Profissional",
        headline: "Quero oferecer serviços",
        description: "Receba oportunidades e gerencie seus atendimentos em um só lugar.",
        bullets: ["Receber clientes", "Gerenciar serviços", "Atender solicitações"],
        selectionHref: "/select-user/worker",
        loginHref: "/login/worker",
        registerHref: "/register/worker",
        loginLabel: "Entrar como profissional",
        registerLabel: "Criar conta de profissional",
        accentClassName: "text-secondary",
        accentBgClassName: "bg-secondary/10",
        hoverClassName: "hover:border-secondary/40 hover:bg-secondary/5",
    },
};

export const authRoles = [authRoleConfig.client, authRoleConfig.worker];

export function isAuthRole(role: string): role is AuthRole {
    return role === "client" || role === "worker";
}
