"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { clearAuthSessionAction } from "@/lib/auth/actions";
import { workerNavItems } from "@/lib/navigation";
import type { AuthUser } from "@/lib/auth/types";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type WorkerSidebarProps = {
  user: AuthUser;
};

export default function WorkerSidebar({ user }: WorkerSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const initials = user.complete_name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function handleLogout() {
    await clearAuthSessionAction();
    router.push("/select-user");
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-border/80">
      <SidebarHeader className="border-b border-border/80 p-4">
        <Link href="/worker/dashboard" className="flex items-center gap-2">
          <Image
            src="/logotipo-pode-deixar-sem-fundo.webp"
            alt="Pode-Deixar"
            width={120}
            height={32}
            className="h-8 w-auto object-contain"
          />
        </Link>
        <Badge variant="outline" className="mt-2 w-fit border-secondary/40 text-secondary">
          Área do Profissional
        </Badge>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {workerNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  {item.enabled ? (
                    <SidebarMenuButton
                      isActive={pathname === item.href}
                      render={<Link href={item.href} />}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  ) : (
                    <SidebarMenuButton disabled tooltip={item.badge}>
                      <item.icon />
                      <span>{item.title}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="ml-auto text-[10px]">
                          {item.badge}
                        </Badge>
                      )}
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/80 p-4">
        <div className="flex items-center gap-3">
          <Avatar className="size-9">
            <AvatarFallback className="bg-secondary/10 text-secondary">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-medium">{user.complete_name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground group-data-[collapsible=icon]:hidden"
            aria-label="Sair"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
