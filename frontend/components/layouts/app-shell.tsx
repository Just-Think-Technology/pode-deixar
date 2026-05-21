"use client";

import type { ReactNode } from "react";

import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

type AppShellProps = {
  sidebar: ReactNode;
  children: ReactNode;
  hideInsetHeader?: boolean;
};

export default function AppShell({ sidebar, children, hideInsetHeader = false }: AppShellProps) {
  return (
    <SidebarProvider>
      {sidebar}
      <SidebarInset className="bg-background">
        {!hideInsetHeader && (
          <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border/80 bg-card px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
          </header>
        )}
        <div className="flex-1 p-4 md:p-6 lg:p-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
