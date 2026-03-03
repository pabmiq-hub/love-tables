import { Calendar, Plus, BarChart3, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Event {
  id: string;
  name: string;
  date: string;
  participants_count: number;
  status: string;
  module: string | null;
}

interface DashboardEventsProps {
  events: Event[];
  isPro: boolean;
  onDeleteEvent: (eventId: string) => void;
}

export function DashboardEvents({ events, isPro, onDeleteEvent }: DashboardEventsProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <span className="px-3 py-1 rounded-full bg-accent/20 text-accent-foreground text-xs font-medium">Próximo</span>;
      case "active":
        return <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium">En curso</span>;
      case "completed":
        return <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium">Completado</span>;
      default:
        return null;
    }
  };

  const getModuleBadge = (module: string | null) => {
    if (!module) return null;
    if (isPro && module === "professional") return null;
    switch (module) {
      case "social":
        return <Badge variant="secondary" className="bg-pink-500/10 text-pink-500">Social</Badge>;
      case "professional":
        return <Badge variant="secondary" className="bg-blue-500/10 text-blue-500">Profesional</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold mb-1">Mis Eventos</h1>
          <p className="text-muted-foreground">{events.length} eventos en total</p>
        </div>
        <Link to="/admin/events/new">
          <Button variant="hero">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Evento
          </Button>
        </Link>
      </div>

      {events.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-display text-xl font-semibold mb-2">Sin eventos todavía</h3>
            <p className="text-muted-foreground mb-4">Crea tu primer evento</p>
            <Link to="/admin/events/new">
              <Button variant="hero">
                <Plus className="w-4 h-4 mr-2" />
                Crear Evento
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {events.map((event, index) => (
            <Card
              key={event.id}
              className="hover:shadow-soft transition-all duration-300 animate-fade-in"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center shrink-0">
                      <Calendar className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-display text-lg font-semibold">{event.name}</h3>
                        {getStatusBadge(event.status)}
                        {getModuleBadge(event.module)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(event.date).toLocaleDateString("es-ES", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-lg font-bold">{event.participants_count || 0}</p>
                      <p className="text-xs text-muted-foreground">Participantes</p>
                    </div>
                    <div className="flex gap-2">
                      <Link to={`/admin/events/${event.id}`}>
                        <Button variant="outline" size="sm">
                          <BarChart3 className="w-4 h-4 mr-2" />
                          Gestionar
                        </Button>
                      </Link>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar evento?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción no se puede deshacer. Se eliminarán todos los datos del evento "{event.name}".
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onDeleteEvent(event.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
