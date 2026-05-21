"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { clientNavItems } from "@/lib/navigation";
import { clearAuthSession } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const PLACEHOLDER_ROUTES = ["/client/search", "/client/orders", "/client/quotes", "/client/chat", "/client/profile"];

export default function ClientSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    clearAuthSession();
    router.push("/select-user");
  }

  function handleNavClick(href: string, e: React.MouseEvent) {
    if (PLACEHOLDER_ROUTES.includes(href)) {
      e.preventDefault();
    }
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-border/80 bg-card">
      <SidebarHeader className="border-b border-border/80 px-4 py-5">
        <Link href="/client/home" className="block">
          <span className="text-xl font-bold text-primary">Pode-Deixar</span>
          <span className="mt-0.5 block text-sm text-muted-foreground">Cliente</span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {clientNavItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      render={<Link href={item.href} onClick={(e) => handleNavClick(item.href, e)} />}
                      className={cn(
                        isActive &&
                          "!bg-primary !text-primary-foreground hover:!bg-primary hover:!text-primary-foreground data-active:!bg-primary data-active:!text-primary-foreground",
                      )}
                    >
                      <item.icon className={cn(isActive && "text-primary-foreground")} />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/80 p-4">
        <div className="mb-3 flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
          <Avatar className="size-9 shrink-0">
            <AvatarFallback className="bg-muted text-sm font-medium text-muted-foreground">
              C
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium text-foreground group-data-[collapsible=icon]:hidden">
            Cliente
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full group-data-[collapsible=icon]:px-2"
          onClick={handleLogout}
        >
          Sair
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
