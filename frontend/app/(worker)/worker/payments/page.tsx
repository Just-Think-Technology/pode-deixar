// purpose: Legacy worker receipts route — redirects to finance
import { redirect } from "next/navigation";

export default function WorkerPaymentsRedirect() {
  redirect("/worker/finance");
}
