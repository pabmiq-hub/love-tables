import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Calendar, Users, Plus, LogOut, Settings, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

// Mock events data
const mockEvents = [
  {
    id: "1",
    name: "Speed Dating Valencia",
    date: "2024-02-15",
    participants: 24,
    status: "upcoming",
    matches: 0,
  },
  {
    id: "2",
    name: "Networking Profesional",
    date: "2024-01-28",
    participants: 18,
    status: "completed",
    matches: 7,
  },
];

const AdminDashboard = () => {
  const [events, setEvents] = useState(mockEvents);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if admin is logged in
    const isLoggedIn = localStorage.getItem("adminLoggedIn");
    if (!isLoggedIn) {
      navigate("/admin/login");
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("adminLoggedIn");
    toast({
      title: "Sesión cerrada",
      description: "Has cerrado sesión correctamente",
    });
    navigate("/");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "upcoming":
        return <span className="px-3 py-1 rounded-full bg-accent/20 text-accent-foreground text-xs font-medium">Próximo</span>;
      case "active":
        return <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium">En curso</span>;
      case "completed":
        return <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium">Completado</span>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Heart className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold">SpeedMatch</span>
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
          <p className="text-muted-foreground">Gestiona tus eventos de speed dating</p>
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
                <p className="text-2xl font-bold">{events.reduce((acc, e) => acc + e.participants, 0)}</p>
                <p className="text-sm text-muted-foreground">Participantes totales</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Heart className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{events.reduce((acc, e) => acc + e.matches, 0)}</p>
                <p className="text-sm text-muted-foreground">Matches realizados</p>
              </div>
            </CardContent>
          </Card>
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
              <p className="text-muted-foreground mb-4">Crea tu primer evento de speed dating</p>
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
                        <p className="text-lg font-bold">{event.participants}</p>
                        <p className="text-xs text-muted-foreground">Participantes</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-primary">{event.matches}</p>
                        <p className="text-xs text-muted-foreground">Matches</p>
                      </div>
                      <Link to={`/admin/events/${event.id}`}>
                        <Button variant="outline" size="sm">
                          <BarChart3 className="w-4 h-4 mr-2" />
                          Gestionar
                        </Button>
                      </Link>
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
