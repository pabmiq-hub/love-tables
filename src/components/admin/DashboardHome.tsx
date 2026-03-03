import { Calendar, Users, Handshake, Plus, BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import type { DashboardSection } from "./AdminSidebar";

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
}

interface DashboardHomeProps {
  events: Event[];
  stats: Stats;
  isPro: boolean;
  onNavigate: (section: DashboardSection) => void;
}

export function DashboardHome({ events, stats, isPro, onNavigate }: DashboardHomeProps) {
  const recentEvents = events.slice(0, 3);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <span className="px-2 py-0.5 rounded-full bg-accent/20 text-accent-foreground text-xs font-medium">Próximo</span>;
      case "active":
        return <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium">En curso</span>;
      case "completed":
        return <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium">Completado</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold mb-1">Panel de Administración</h1>
        <p className="text-muted-foreground">Resumen de tu actividad</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-card">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{events.length}</p>
              <p className="text-sm text-muted-foreground">Eventos totales</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.uniqueParticipants}</p>
              <p className="text-sm text-muted-foreground">
                {isPro ? "Empresas participantes" : "Participantes únicos"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Handshake className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalConnections}</p>
              <p className="text-sm text-muted-foreground">
                {isPro ? "Reuniones B2B" : "Conexiones realizadas"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Events */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-semibold">Eventos recientes</h2>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => onNavigate("events")}>
              Ver todos
            </Button>
            <Link to="/admin/events/new">
              <Button variant="hero" size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Nuevo
              </Button>
            </Link>
          </div>
        </div>

        {recentEvents.length === 0 ? (
          <Card className="text-center py-10">
            <CardContent>
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-7 h-7 text-muted-foreground" />
              </div>
              <h3 className="font-display text-lg font-semibold mb-1">Sin eventos todavía</h3>
              <p className="text-muted-foreground text-sm mb-4">Crea tu primer evento para empezar</p>
              <Link to="/admin/events/new">
                <Button variant="hero" size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Crear Evento
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {recentEvents.map((event) => (
              <Link key={event.id} to={`/admin/events/${event.id}`}>
                <Card className="hover:shadow-soft transition-all duration-200 cursor-pointer">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center shrink-0">
                        <Calendar className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm">{event.name}</p>
                          {getStatusBadge(event.status)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(event.date).toLocaleDateString("es-ES", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-bold text-sm">{event.participants_count || 0}</p>
                        <p className="text-xs text-muted-foreground">Participantes</p>
                      </div>
                      <BarChart3 className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
