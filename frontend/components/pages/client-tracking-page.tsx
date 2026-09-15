// Client tracking page — hiring follow-up for the client profile

import { ContractTrackingView } from "@/components/shared/tracking/contract-tracking-view";
import type { ContractTracking } from "@/lib/tracking/types";

type ClientTrackingPageProps = {
  tracking: ContractTracking;
};

export default function ClientTrackingPage({ tracking }: ClientTrackingPageProps) {
  return (
    <ContractTrackingView
      tracking={tracking}
      backHref="/client/orders"
      backLabel="Voltar às solicitações"
    />
  );
}
