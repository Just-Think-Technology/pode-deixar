import { redirect } from "next/navigation";

import WorkerProfilePage from "@/components/pages/worker-profile-page";
import { getWorkerProfileAction } from "@/lib/auth/actions";
import type { UserProfile } from "@/lib/auth/types";
import { WORKER_PROFILE_UI_DEFAULTS } from "@/mock/worker/profile";

export default async function WorkerProfileRoute() {
  let user: UserProfile;
  try {
    const result = await getWorkerProfileAction();
    user = result.user;
  } catch {
    redirect("/login/worker");
  }

  return (
    <WorkerProfilePage
      initialProfile={user}
      uiDefaults={WORKER_PROFILE_UI_DEFAULTS}
    />
  );
}
