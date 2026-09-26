// Notifications bell — dropdown with badge, tabs, and notification list

"use client";

import { useMemo, useState } from "react";
import { BellIcon } from "lucide-react";

import type { NotificationType } from "@/api/notifications";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import NotificationItem from "./notification-item";
import { useNotifications } from "@/lib/notifications/use-notifications";

type BellProps = {
  role?: "CLIENT" | "PROVIDER" | "ADMIN";
};

const CONVERSATION: NotificationType = "CONVERSATION";
const SERVICE: NotificationType = "SERVICE";

// --- Component ---

export default function Bell({ role }: BellProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<NotificationType>(CONVERSATION);
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    refresh,
    markRead,
  } = useNotifications();

  const filteredByTab = useMemo(
    () => notifications.filter((n) => n.type === activeTab),
    [notifications, activeTab],
  );

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      void refresh();
    }
  }

  function renderContent() {
    if (isLoading) {
      return (
        <div className="flex flex-col gap-2 p-2" aria-busy="true">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      );
    }

    if (error) {
      return (
        <Alert variant="destructive" className="mx-2">
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={() => void refresh()}>
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      );
    }

    if (filteredByTab.length === 0) {
      return (
        <Empty className="py-6">
          <EmptyHeader>
            <EmptyTitle>Sem notificações</EmptyTitle>
            <EmptyDescription>Você não possui novas notificações.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      );
    }

    return (
      <div className="flex max-h-80 flex-col gap-1 overflow-y-auto p-1">
        {filteredByTab.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            role={role}
            onRead={(id) => void markRead(id)}
          />
        ))}
      </div>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="Notificações" className="relative" />
        }
      >
        <BellIcon className="size-5" />
        {unreadCount > 0 ? (
          <Badge
            variant="destructive"
            className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full p-0 text-xs"
          >
            {unreadCount}
          </Badge>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-96 p-0" align="end" sideOffset={8}>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as NotificationType)} className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
            <TabsTrigger value={CONVERSATION} className="flex-1 rounded-none border-b-2 border-transparent data-[active]:border-primary">
              Conversas
            </TabsTrigger>
            <TabsTrigger value={SERVICE} className="flex-1 rounded-none border-b-2 border-transparent data-[active]:border-primary">
              Serviços
            </TabsTrigger>
          </TabsList>
          <TabsContent value={CONVERSATION} className="mt-0">
            {renderContent()}
          </TabsContent>
          <TabsContent value={SERVICE} className="mt-0">
            {renderContent()}
          </TabsContent>
        </Tabs>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
