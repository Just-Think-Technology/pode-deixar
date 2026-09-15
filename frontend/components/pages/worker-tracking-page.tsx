// Worker tracking page — hiring follow-up for the provider profile

import { ContractTrackingView } from "@/components/shared/tracking/contract-tracking-view";
import type { ContractTracking } from "@/lib/tracking/types";

type WorkerTrackingPageProps = {
  tracking: ContractTracking;
};

export default function WorkerTrackingPage({ tracking }: WorkerTrackingPageProps) {
  return (
    <ContractTrackingView
      tracking={tracking}
      backHref="/worker/requests"
      backLabel="Voltar às solicitações"
    />
  );
}
