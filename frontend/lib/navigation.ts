import type { LucideIcon } from "lucide-react";
import {
  Home,
  Search,
  ClipboardList,
  FileText,
  MessageSquare,
  User,
  LayoutDashboard,
  Briefcase,
  Inbox,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  enabled: boolean;
  badge?: string;
};

export const clientNavItems: NavItem[] = [
  { title: "Início", href: "/client/home", icon: Home, enabled: true },
  { title: "Buscar", href: "/client/search", icon: Search, enabled: true },
  { title: "Solicitações", href: "/client/orders", icon: ClipboardList, enabled: false, badge: "Em breve" },
  { title: "Orçamentos", href: "/client/quotes", icon: FileText, enabled: false, badge: "Em breve" },
  { title: "Mensagens", href: "/client/chat", icon: MessageSquare, enabled: false, badge: "Em breve" },
  { title: "Perfil", href: "/client/profile", icon: User, enabled: false, badge: "Em breve" },
];

export const workerNavItems: NavItem[] = [
  { title: "Dashboard", href: "/worker/dashboard", icon: LayoutDashboard, enabled: true },
  { title: "Serviços", href: "/worker/services", icon: Briefcase, enabled: true },
  { title: "Solicitações", href: "/worker/requests", icon: Inbox, enabled: false, badge: "Em breve" },
  { title: "Chat", href: "/worker/chat", icon: MessageSquare, enabled: false, badge: "Em breve" },
  { title: "Perfil", href: "/worker/profile", icon: User, enabled: true },
];
