// purpose: Registration route — redirects to role selection
import { redirect } from "next/navigation";

export default function RegisterPage() {
    redirect("/select-user");
}
