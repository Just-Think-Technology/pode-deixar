import WorkerAgendaPage from "@/components/pages/worker-agenda-page";
import { getAgendaEventsAction } from "@/lib/worker/agenda/actions";
import {
  getAgendaEventsErrorMessage,
  getAgendaRangeForMonth,
} from "@/lib/worker/agenda/labels";

type WorkerAgendaRouteProps = {
  searchParams: Promise<{ dia?: string }>;
};

export default async function WorkerAgendaRoute({
  searchParams,
}: WorkerAgendaRouteProps) {
  const { dia } = await searchParams;
  let events: Awaited<ReturnType<typeof getAgendaEventsAction>> = [];
  let initialLoadError: string | undefined;

  try {
    events = await getAgendaEventsAction(getAgendaRangeForMonth(new Date()));
  } catch (err) {
    initialLoadError = getAgendaEventsErrorMessage(err);
  }

  return (
    <WorkerAgendaPage
      events={events}
      initialDay={dia}
      initialLoadError={initialLoadError}
    />
  );
}
