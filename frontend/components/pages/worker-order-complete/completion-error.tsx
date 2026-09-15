"use client";

import { CircleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type CompletionErrorProps = {
  message: string;
  isRetrying: boolean;
  onRetry: () => void;
};

export function CompletionError({
  message,
  isRetrying,
  onRetry,
}: CompletionErrorProps) {
  return (
    <Card role="alert">
      <CardHeader className="items-center text-center">
        <CircleAlert className="size-12 text-destructive" aria-hidden="true" />
        <CardTitle>Não foi possível concluir o serviço</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        <Button type="button" onClick={onRetry} disabled={isRetrying}>
          {isRetrying ? "Tentando novamente..." : "Tentar novamente"}
        </Button>
      </CardContent>
    </Card>
  );
}
