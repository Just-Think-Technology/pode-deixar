import WorkerAgendaPage from "@/components/pages/worker-agenda-page";
import { getAgendaEventsAction } from "@/lib/worker/agenda/actions";
import { getAgendaRangeForMonth } from "@/lib/worker/agenda/labels";

type WorkerAgendaRouteProps = {
  searchParams: Promise<{ dia?: string }>;
};

export default async function WorkerAgendaRoute({
  searchParams,
}: WorkerAgendaRouteProps) {
  const { dia } = await searchParams;
  const events = await getAgendaEventsAction(
    getAgendaRangeForMonth(new Date()),
  );

  return <WorkerAgendaPage events={events} initialDay={dia} />;
}
