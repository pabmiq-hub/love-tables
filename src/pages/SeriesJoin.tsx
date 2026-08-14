import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, CalendarX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import ParticipantJoin from "./ParticipantJoin";
import { resolveSeriesCurrentEvent } from "@/lib/eventSeries";

/**
 * Shared/recurring link for a series of events.
 * Always resolves to the next event of the series that is still open:
 * the following one only becomes reachable once the current one is closed.
 */
const SeriesJoin = () => {
  const { seriesSlug } = useParams<{ seriesSlug: string }>();
  const [eventId, setEventId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!seriesSlug) return;
      setLoading(true);
      try {
        const resolved = await resolveSeriesCurrentEvent(seriesSlug);
        if (active) setEventId(resolved?.eventId ?? null);
      } catch {
        if (active) setEventId(null);
      } finally {
        if (active) setLoading(false);
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [seriesSlug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!eventId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="py-10 space-y-3">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto">
              <CalendarX className="w-7 h-7 text-muted-foreground" />
            </div>
            <h1 className="font-display text-xl font-semibold">No hay fechas disponibles</h1>
            <p className="text-sm text-muted-foreground">
              Ahora mismo no hay ninguna fecha abierta para este evento. Vuelve pronto: publicaremos aquí la
              próxima convocatoria.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <ParticipantJoin eventIdOverride={eventId} />;
};

export default SeriesJoin;
