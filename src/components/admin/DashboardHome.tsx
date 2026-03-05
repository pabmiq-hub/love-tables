import { useMemo } from "react";
import {
  Calendar, Users, Handshake, Plus, TrendingUp, TrendingDown,
  Sparkles, Clock, ArrowRight, Target, UserCheck, Rocket
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import {
  AreaChart, Area, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import type { DashboardSection } from "./AdminSidebar";

interface Event {
  id: string;
  name: string;
  date: string;
  participants_count: number;
  status: string;
  module: string | null;
}

interface ParticipantRecord {
  id: string;
  event_id: string;
  checked_in: boolean | null;
  selection_submitted_at: string | null;
}

interface Stats {
  uniqueParticipants: number;
  totalConnections: number;
  returningParticipants: number;
  selectionRate: number;
}

interface DashboardHomeProps {
  events: Event[];
  stats: Stats;
  isPro: boolean;
  onNavigate: (section: DashboardSection) => void;
  participants: ParticipantRecord[];
  companyName: string | null;
}

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(262, 60%, 55%)",
];

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 20) return "Buenas tardes";
  return "Buenas noches";
}

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function DashboardHome({
  events, stats, isPro, onNavigate, participants, companyName
}: DashboardHomeProps) {

  // --- derived data ---
  const activeEvents = useMemo(() => events.filter(e => e.status === "active" || e.status === "pending"), [events]);

  const nextEvent = useMemo(() => {
    const upcoming = events
      .filter(e => e.status === "pending" || e.status === "active")
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return upcoming[0] ?? null;
  }, [events]);

  const sparklineData = useMemo(() => {
    const sorted = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(-8);
    return sorted.map(e => ({ name: e.name, value: e.participants_count || 0 }));
  }, [events]);

  const connectionsSparkline = useMemo(() => {
    // group participants by event to approximate "connections per event"
    const byEvent: Record<string, number> = {};
    participants.forEach(p => {
      byEvent[p.event_id] = (byEvent[p.event_id] || 0) + 1;
    });
    const sorted = [...events]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-8);
    return sorted.map(e => ({
      name: e.name,
      value: byEvent[e.id] || 0,
    }));
  }, [events, participants]);

  const moduleDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    events.forEach(e => {
      const m = e.module || "social";
      counts[m] = (counts[m] || 0) + 1;
    });
    const labels: Record<string, string> = {
      social: "Social",
      dating: "Dating",
      professional: "Profesional",
    };
    return Object.entries(counts).map(([key, value]) => ({
      name: labels[key] || key,
      value,
    }));
  }, [events]);

  const recentEvents = events.slice(0, 4);

  // --- render helpers ---
  const Sparkline = ({ data, color = "hsl(var(--primary))" }: { data: { name: string; value: number }[]; color?: string }) => (
    <ResponsiveContainer width="100%" height={40}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id={`grad-${color.replace(/[^a-z0-9]/gi, "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#grad-${color.replace(/[^a-z0-9]/gi, "")})`}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="text-[10px]">Próximo</Badge>;
      case "active":
        return <Badge className="text-[10px]">En curso</Badge>;
      case "completed":
        return <Badge variant="outline" className="text-[10px]">Completado</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      {/* ── Greeting ── */}
      <div>
        <h1 className="font-display text-3xl font-bold mb-1 flex items-center gap-2">
          {getGreeting()}, {companyName || "organizador"}
          <Sparkles className="w-6 h-6 text-primary animate-pulse" />
        </h1>
        <p className="text-muted-foreground">
          Tienes <span className="font-semibold text-foreground">{activeEvents.length}</span> evento{activeEvents.length !== 1 ? "s" : ""} activo{activeEvents.length !== 1 ? "s" : ""} y{" "}
          <span className="font-semibold text-foreground">{stats.uniqueParticipants}</span>{" "}
          {isPro ? "empresas" : "participantes"} registrados
        </p>
      </div>

      {/* ── Next Event Hero Card ── */}
      {nextEvent ? (
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5">
          <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0 shadow-lg">
              <Rocket className="w-7 h-7 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display text-lg font-bold truncate">{nextEvent.name}</h2>
                {getStatusBadge(nextEvent.status)}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {daysUntil(nextEvent.date) > 0
                    ? `En ${daysUntil(nextEvent.date)} día${daysUntil(nextEvent.date) !== 1 ? "s" : ""}`
                    : daysUntil(nextEvent.date) === 0
                      ? "¡Hoy!"
                      : "Pasado"}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {nextEvent.participants_count} participantes
                </span>
              </div>
              <Progress value={Math.min((nextEvent.participants_count / 50) * 100, 100)} className="h-2 max-w-xs" />
              <p className="text-xs text-muted-foreground">{nextEvent.participants_count} registrados</p>
            </div>
            <Link to={`/admin/events/${nextEvent.id}`}>
              <Button variant="hero" className="shrink-0">
                Gestionar <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed border-2 border-primary/20">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Rocket className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-display text-lg font-semibold">¡Crea tu próximo evento!</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto mb-2">
              Empieza a conectar personas. Configura un evento en minutos.
            </p>
            <Link to="/admin/events/new">
              <Button variant="hero">
                <Plus className="w-4 h-4 mr-1" />
                Crear evento
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* ── KPI Cards with Sparklines ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Events */}
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              {events.length > 0 && (
                <span className="flex items-center gap-0.5 text-xs font-medium text-primary">
                  <TrendingUp className="w-3 h-3" />
                </span>
              )}
            </div>
            <div>
              <p className="text-2xl font-bold">{events.length}</p>
              <p className="text-xs text-muted-foreground">Eventos totales</p>
            </div>
            {sparklineData.length > 1 && <Sparkline data={sparklineData} />}
          </CardContent>
        </Card>

        {/* Participants */}
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-accent" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.uniqueParticipants}</p>
              <p className="text-xs text-muted-foreground">{isPro ? "Empresas" : "Participantes únicos"}</p>
            </div>
            {connectionsSparkline.length > 1 && <Sparkline data={connectionsSparkline} color="hsl(var(--accent))" />}
          </CardContent>
        </Card>

        {/* Matches */}
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Handshake className="w-5 h-5 text-primary" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalConnections}</p>
              <p className="text-xs text-muted-foreground">{isPro ? "Reuniones B2B" : "Matches mutuos"}</p>
            </div>
          </CardContent>
        </Card>

        {/* Selection Rate */}
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-accent" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.selectionRate}%</p>
              <p className="text-xs text-muted-foreground">Tasa de selección</p>
            </div>
            <Progress value={stats.selectionRate} className="h-1.5" />
          </CardContent>
        </Card>
      </div>

      {/* ── Module Distribution + Recent Events ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Module Distribution */}
        {moduleDistribution.length > 0 && (
          <Card className="lg:col-span-1">
            <CardContent className="p-5">
              <h3 className="font-display text-sm font-semibold mb-4">Distribución por módulo</h3>
              <div className="flex items-center justify-center">
                <ResponsiveContainer width={140} height={140}>
                  <PieChart>
                    <Pie
                      data={moduleDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={65}
                      dataKey="value"
                      stroke="none"
                    >
                      {moduleDistribution.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-3 justify-center mt-3">
                {moduleDistribution.map((m, i) => (
                  <div key={m.name} className="flex items-center gap-1.5 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    {m.name} ({m.value})
                  </div>
                ))}
              </div>
              <Button variant="ghost" size="sm" className="w-full mt-3 text-xs" onClick={() => onNavigate("analytics")}>
                Ver analítica completa
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Recent Events */}
        <div className={moduleDistribution.length > 0 ? "lg:col-span-2" : "lg:col-span-3"}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-sm font-semibold">Eventos recientes</h3>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => onNavigate("events")}>
                Ver todos
              </Button>
              <Link to="/admin/events/new">
                <Button variant="hero" size="sm" className="text-xs">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Nuevo
                </Button>
              </Link>
            </div>
          </div>

          {recentEvents.length === 0 ? (
            <Card className="text-center py-8">
              <CardContent>
                <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Sin eventos todavía</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {recentEvents.map((event) => {
                const eventParticipants = participants.filter(p => p.event_id === event.id);
                const submitted = eventParticipants.filter(p => p.selection_submitted_at).length;
                const rate = eventParticipants.length > 0 ? Math.round((submitted / eventParticipants.length) * 100) : 0;

                return (
                  <Link key={event.id} to={`/admin/events/${event.id}`}>
                    <Card className="hover:shadow-soft transition-all duration-200 cursor-pointer group">
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
                          <Calendar className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm truncate">{event.name}</p>
                            {getStatusBadge(event.status)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(event.date).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                          <div className="flex items-center gap-2">
                            <Progress value={rate} className="h-1 flex-1 max-w-[120px]" />
                            <span className="text-[10px] text-muted-foreground">{rate}% selección</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-sm">{event.participants_count || 0}</p>
                          <p className="text-[10px] text-muted-foreground">participantes</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Quick Stats Footer ── */}
      <div className="flex items-center gap-6 text-xs text-muted-foreground border-t pt-4">
        <span className="flex items-center gap-1">
          <UserCheck className="w-3.5 h-3.5" />
          {stats.returningParticipants} recurrentes
        </span>
        <span className="flex items-center gap-1">
          <Handshake className="w-3.5 h-3.5" />
          {stats.totalConnections} conexiones totales
        </span>
        <span className="flex items-center gap-1">
          <Target className="w-3.5 h-3.5" />
          {stats.selectionRate}% tasa media
        </span>
      </div>
    </div>
  );
}
