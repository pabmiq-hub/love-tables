import { Clock, MapPin, Table2, Users, Layers } from "lucide-react";
import { ReactNode } from "react";

interface EventHeroCardProps {
  eventName: string;
  eventDate: string;
  eventTime?: string | null;
  eventLocation?: string | null;
  participantName?: string;
  participantsCount?: number | null;
  rounds?: number | null;
  currentTable?: number | null;
  statusLabel?: string;
  roundSlot?: ReactNode;
  lang: "es" | "en";
}


const MONTHS = {
  es: ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"],
  en: ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"],
};

const WEEKDAYS = {
  es: ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"],
  en: ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"],
};

export default function EventHeroCard({
  eventName,
  eventDate,
  eventTime,
  eventLocation,
  participantName,
  participantsCount,
  rounds,
  currentTable,
  statusLabel,
  lang,
}: EventHeroCardProps) {
  // Timezone-safe parsing: append midday to avoid day shifts.
  const d = eventDate ? new Date(`${eventDate.slice(0, 10)}T12:00:00`) : null;
  const dateBadge = d
    ? `${WEEKDAYS[lang][d.getDay()]} ${d.getDate()} ${MONTHS[lang][d.getMonth()]}`
    : null;

  const stats: { icon: typeof Users; value: string; label: string }[] = [];
  if (participantsCount != null) {
    stats.push({
      icon: Users,
      value: String(participantsCount),
      label: lang === "es" ? "Personas" : "People",
    });
  }
  if (rounds) {
    stats.push({
      icon: Layers,
      value: String(rounds),
      label: lang === "es" ? "Rondas" : "Rounds",
    });
  }
  if (currentTable != null) {
    stats.push({
      icon: Table2,
      value: String(currentTable),
      label: lang === "es" ? "Tu mesa" : "Your table",
    });
  }

  return (
    <div className="rounded-2xl overflow-hidden shadow-card bg-card border border-border/60">
      <div className="relative bg-gradient-primary px-5 pt-5 pb-6 text-primary-foreground">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {dateBadge && (
              <span className="inline-block rounded-full bg-primary-foreground/15 backdrop-blur-sm px-3 py-1 text-[11px] font-semibold tracking-widest">
                {dateBadge}
              </span>
            )}
            <h2 className="font-display text-xl font-bold leading-tight mt-3 truncate">{eventName}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-primary-foreground/85">
              {eventTime && (
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {eventTime.slice(0, 5)}
                </span>
              )}
              {eventLocation && (
                <span className="flex items-center gap-1.5 truncate max-w-[15rem]">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{eventLocation}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 py-4 space-y-3">
        <div>
          <p className="font-display text-lg font-semibold leading-tight">
            {lang === "es" ? "Hola" : "Hi"} {participantName}
          </p>
          {statusLabel && <p className="text-xs text-muted-foreground mt-0.5">{statusLabel}</p>}
        </div>

        {stats.length > 0 && (
          <div className="grid grid-cols-3 gap-2 pt-1">
            {stats.map(({ icon: Icon, value, label }) => (
              <div key={label} className="rounded-xl bg-muted/50 px-2 py-3 text-center">
                <Icon className="w-4 h-4 text-primary mx-auto mb-1" />
                <p className="font-display text-base font-bold leading-none">{value}</p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1">{label}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
