"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type CompletionSuccessProps = {
  onViewService: () => void;
};

export function CompletionSuccess({ onViewService }: CompletionSuccessProps) {
  return (
    <Card>
      <CardHeader className="items-center text-center">
        <CheckCircle2
          className="size-12 text-[#27AE60]"
          aria-hidden="true"
        />
        <CardTitle>Serviço concluído!</CardTitle>
        <CardDescription>
          O serviço foi registrado como concluído com sucesso. O cliente foi
          informado sobre a conclusão.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button type="button" variant="default" onClick={onViewService}>
          Ver serviço
        </Button>
        <Link
          href="/worker/agenda"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Voltar para meus serviços
        </Link>
      </CardContent>
    </Card>
  );
}
