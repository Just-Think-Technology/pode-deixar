// purpose: Login route — redirects to role selection
import { redirect } from "next/navigation";

export default function LoginPage() {
    redirect("/select-user");
}
