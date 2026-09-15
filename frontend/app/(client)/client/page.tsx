// purpose: Client index route — redirects to home
import { redirect } from "next/navigation";

export default function ClientIndexPage() {
  redirect("/client/home");
}
