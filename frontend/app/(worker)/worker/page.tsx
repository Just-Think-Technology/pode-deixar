// purpose: Worker index route — redirects to dashboard
import { redirect } from "next/navigation";

export default function WorkerIndexPage() {
  redirect("/worker/dashboard");
}
