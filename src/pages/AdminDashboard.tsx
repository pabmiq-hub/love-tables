import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Users, Plus, LogOut, Settings, BarChart3, Trash2, Loader2, Handshake, Shield, Crown, RefreshCw, UserCheck, TrendingUp, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganizer } from "@/hooks/useOrganizer";
import { useFeatures } from "@/hooks/useFeatures";
import konektumLogo from "@/assets/konektum-logo.png";
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
import { Badge } from "@/components/ui/badge";

interface Event {
  id: string;
  name: string;
  date: string;
  participants_count: number;
  status: string;
  module: string | null;
}

const AdminDashboard = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    uniqueParticipants: 0,
    totalConnections: 0,
    returningParticipants: 0,
    avgPerEvent: 0,
    completedEvents: 0,
    activeEvents: 0,
    selectionRate: 0,
  });
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading, signOut } = useAuth();
  const { organizer, plan, limits, loading: orgLoading, isActive, isPending, isSuspended, canCreateEvent } = useOrganizer();
  const { isSuperAdmin } = useFeatures();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/admin/login");
      return;
    }
  }, [user, authLoading, navigate]);

  // Handle organizer status
  useEffect(() => {
    if (!orgLoading && organizer) {
      if (isPending) {
        navigate("/admin/pending-approval");
        return;
      }
      if (isSuspended) {
        toast({
          title: "Cuenta suspendida",
          description: "Tu cuenta ha sido suspendida. Contacta con soporte.",
          variant: "destructive",
        });
        signOut();
        return;
      }
    }
  }, [organizer, orgLoading, isPending, isSuspended, navigate]);

  const loadEvents = async () => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setEvents(data);
    }
    setIsLoading(false);
  };

  const loadStats = async () => {
    // Unique participants
    const { count: uniqueCount } = await supabase
      .from("global_participants")
      .select("*", { count: "exact", head: true });

    // Total connections (encounter records = unique pairs already)
    const { count: connectionsCount } = await supabase
      .from("participant_encounters")
      .select("*", { count: "exact", head: true });

    // Returning participants (events_attended > 1)
    const { count: returningCount } = await supabase
      .from("global_participants")
      .select("*", { count: "exact", head: true })
      .gt("events_attended", 1);

    // Selection rate
    const { count: totalParticipants } = await supabase
      .from("participants")
      .select("*", { count: "exact", head: true });
    const { count: submittedCount } = await supabase
      .from("participants")
      .select("*", { count: "exact", head: true })
      .not("selection_submitted_at", "is", null);

    setStats({
      uniqueParticipants: uniqueCount || 0,
      totalConnections: connectionsCount || 0,
      returningParticipants: returningCount || 0,
      avgPerEvent: 0, // calculated after events load
      completedEvents: 0,
      activeEvents: 0,
      selectionRate: totalParticipants ? Math.round(((submittedCount || 0) / totalParticipants) * 100) : 0,
    });
  };

  useEffect(() => {
    if (user && (isActive || isSuperAdmin)) {
      loadEvents();
      loadStats();
    }
  }, [user, isActive, isSuperAdmin]);

  const handleLogout = async () => {
    await signOut();
    toast({
      title: "Sesión cerrada",
      description: "Has cerrado sesión correctamente",
    });
    navigate("/admin/login");
  };

  const handleDeleteEvent = async (eventId: string) => {
    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", eventId);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el evento",
        variant: "destructive",
      });
      return;
    }

    setEvents(events.filter(e => e.id !== eventId));
    toast({
      title: "Evento eliminado",
      description: "El evento ha sido eliminado correctamente",
    });
  };

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
    switch (module) {
      case "social":
        return <Badge variant="secondary" className="bg-pink-500/10 text-pink-500">Social</Badge>;
      case "professional":
        return <Badge variant="secondary" className="bg-blue-500/10 text-blue-500">Profesional</Badge>;
      default:
        return null;
    }
  };

  const completedEvents = events.filter(e => e.status === "completed").length;
  const activeEvents = events.filter(e => e.status === "active").length;
  const avgPerEvent = events.length > 0 ? Math.round(events.reduce((acc, e) => acc + (e.participants_count || 0), 0) / events.length) : 0;

  if (authLoading || orgLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={konektumLogo} alt="Konektum" className="h-9 w-auto" />
          </Link>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon">
              <Settings className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Salir
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome section */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold mb-2">Panel de Administración</h1>
          <p className="text-muted-foreground">Gestiona tus eventos</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
                <p className="text-sm text-muted-foreground">Participantes únicos</p>
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
                <p className="text-sm text-muted-foreground">Conexiones realizadas</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* General Statistics */}
        <div className="mb-8">
          <h2 className="font-display text-xl font-semibold mb-4">Estadísticas generales</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  <RefreshCw className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-lg font-bold">{stats.returningParticipants}</p>
                  <p className="text-xs text-muted-foreground">Repiten evento</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-bold">{avgPerEvent}</p>
                  <p className="text-xs text-muted-foreground">Media por evento</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-bold">{completedEvents} / {activeEvents}</p>
                  <p className="text-xs text-muted-foreground">Completados / Activos</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  <UserCheck className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-lg font-bold">{stats.selectionRate}%</p>
                  <p className="text-xs text-muted-foreground">Tasa de selección</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Events section */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl font-semibold">Mis Eventos</h2>
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
                className="hover:shadow-soft transition-all duration-300 animate-fade-in cursor-pointer"
                style={{ animationDelay: `${index * 0.1}s` }}
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
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(event.date).toLocaleDateString('es-ES', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
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
                                onClick={() => handleDeleteEvent(event.id)}
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
      </main>
    </div>
  );
};

export default AdminDashboard;
