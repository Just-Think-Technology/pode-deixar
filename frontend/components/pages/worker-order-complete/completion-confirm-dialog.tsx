"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type CompletionConfirmDialogProps = {
  open: boolean;
  photoCount: number;
  isProcessing: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function CompletionConfirmDialog({
  open,
  photoCount,
  isProcessing,
  onOpenChange,
  onConfirm,
}: CompletionConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar conclusão?</AlertDialogTitle>
          <AlertDialogDescription>
            Você está informando que o serviço foi realizado e deseja
            encerrá-lo com {photoCount}{" "}
            {photoCount === 1 ? "foto registrada" : "fotos registradas"}.
            <br />
            <br />
            Após a confirmação, o serviço será marcado como concluído e o
            cliente será informado.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isProcessing}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction disabled={isProcessing} onClick={onConfirm}>
            {isProcessing ? "Concluindo..." : "Confirmar conclusão"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
