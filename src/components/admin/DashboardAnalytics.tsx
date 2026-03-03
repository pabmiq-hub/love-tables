import { RefreshCw, TrendingUp, CheckCircle2, UserCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Event {
  id: string;
  name: string;
  date: string;
  participants_count: number;
  status: string;
  module: string | null;
}

interface Stats {
  uniqueParticipants: number;
  totalConnections: number;
  returningParticipants: number;
  selectionRate: number;
}

interface DashboardAnalyticsProps {
  events: Event[];
  stats: Stats;
  isPro: boolean;
}

export function DashboardAnalytics({ events, stats, isPro }: DashboardAnalyticsProps) {
  const completedEvents = events.filter((e) => e.status === "completed").length;
  const activeEvents = events.filter((e) => e.status === "active").length;
  const avgPerEvent =
    events.length > 0
      ? Math.round(events.reduce((acc, e) => acc + (e.participants_count || 0), 0) / events.length)
      : 0;

  const cards = [
    {
      icon: RefreshCw,
      value: stats.returningParticipants,
      label: isPro ? "Empresas recurrentes" : "Repiten evento",
      color: "accent" as const,
    },
    {
      icon: TrendingUp,
      value: avgPerEvent,
      label: "Media por evento",
      color: "primary" as const,
    },
    {
      icon: CheckCircle2,
      value: `${completedEvents} / ${activeEvents}`,
      label: "Completados / Activos",
      color: "primary" as const,
    },
    {
      icon: UserCheck,
      value: `${stats.selectionRate}%`,
      label: isPro ? "Contactos generados" : "Tasa de selección",
      color: "accent" as const,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold mb-1">Analítica</h1>
        <p className="text-muted-foreground">Estadísticas generales de tus eventos</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cards.map((card, i) => (
          <Card key={i}>
            <CardContent className="p-6 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl bg-${card.color}/10 flex items-center justify-center shrink-0`}>
                <card.icon className={`w-6 h-6 text-${card.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-sm text-muted-foreground">{card.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
