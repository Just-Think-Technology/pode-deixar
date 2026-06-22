import { redirect } from "next/navigation";

import WorkerProfilePage from "@/components/pages/worker-profile-page";
import { getWorkerProfileAction } from "@/lib/auth/actions";
import { WORKER_PROFILE_UI_DEFAULTS } from "@/mock/worker/profile";

export default async function WorkerProfileRoute() {
  try {
    const { user } = await getWorkerProfileAction();
    return (
      <WorkerProfilePage
        initialProfile={user}
        uiDefaults={WORKER_PROFILE_UI_DEFAULTS}
      />
    );
  } catch {
    redirect("/login/worker");
  }
}
