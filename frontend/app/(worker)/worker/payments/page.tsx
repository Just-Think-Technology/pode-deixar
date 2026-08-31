import { redirect } from "next/navigation";

/** Rota antiga de Recebimentos — redireciona para Financeiro. */
export default function WorkerPaymentsRedirect() {
  redirect("/worker/finance");
}
