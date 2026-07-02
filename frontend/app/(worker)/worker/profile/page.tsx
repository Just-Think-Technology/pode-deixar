import { redirect } from "next/navigation";

import WorkerProfilePage from "@/components/pages/worker-profile-page";
import { getWorkerProfileAction } from "@/lib/auth/actions";
import type { UserProfile } from "@/lib/auth/types";

export default async function WorkerProfileRoute() {
  let user: UserProfile | null = null;
  try {
    const result = await getWorkerProfileAction();
    user = result.user;
  } catch {
    redirect("/login/worker");
  }

  return <WorkerProfilePage initialProfile={user} />;
}
