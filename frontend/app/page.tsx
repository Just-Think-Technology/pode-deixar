import { redirect } from "next/navigation";

import LandingPage from "@/components/pages/landing-page";
import { ROLE_HOME_HREF } from "@/lib/auth/require-role";
import { getAuthSession } from "@/lib/auth/session.server";

export default async function Home() {
  const session = await getAuthSession();
  if (session?.user.role) {
    redirect(ROLE_HOME_HREF[session.user.role]);
  }

  return <LandingPage />;
}
