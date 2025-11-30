import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, ArrowLeft, Users, QrCode, Table2, Download, Play, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

// Mock data
const mockParticipants = [
  { id: "1", name: "María García", age: 28, gender: "Mujer", preference: "Amistad y ligue", agePreference: "25-35" },
  { id: "2", name: "Carlos López", age: 32, gender: "Hombre", preference: "Amistad y ligue", agePreference: "28-38" },
  { id: "3", name: "Ana Martínez", age: 26, gender: "Mujer", preference: "Solo amistad", agePreference: "24-32" },
  { id: "4", name: "David Fernández", age: 30, gender: "Hombre", preference: "Amistad y ligue", agePreference: "25-32" },
  { id: "5", name: "Laura Sánchez", age: 29, gender: "Mujer", preference: "Amistad y ligue", agePreference: "27-35" },
  { id: "6", name: "Pedro Ruiz", age: 34, gender: "Hombre", preference: "Solo amistad", agePreference: "28-40" },
];

const mockTables = [
  { round: 1, tables: [[mockParticipants[0], mockParticipants[1]], [mockParticipants[2], mockParticipants[3]], [mockParticipants[4], mockParticipants[5]]] },
  { round: 2, tables: [[mockParticipants[0], mockParticipants[3]], [mockParticipants[1], mockParticipants[4]], [mockParticipants[2], mockParticipants[5]]] },
  { round: 3, tables: [[mockParticipants[0], mockParticipants[5]], [mockParticipants[1], mockParticipants[2]], [mockParticipants[3], mockParticipants[4]]] },
];

const mockMatches = [
  { participant1: mockParticipants[0], participant2: mockParticipants[1], mutual: true },
  { participant1: mockParticipants[2], participant2: mockParticipants[3], mutual: false },
  { participant1: mockParticipants[4], participant2: mockParticipants[5], mutual: true },
];

const EventDetail = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const [showQR, setShowQR] = useState(false);
  const [currentRound, setCurrentRound] = useState(1);
  const [eventStatus, setEventStatus] = useState<"pending" | "active" | "completed">("pending");

  const handleStartEvent = () => {
    setEventStatus("active");
    toast({
      title: "Evento iniciado",
      description: "Los participantes ya pueden empezar las rondas",
    });
  };

  const handleEndEvent = () => {
    setEventStatus("completed");
    setShowQR(true);
    toast({
      title: "Evento finalizado",
      description: "El código QR está disponible para los participantes",
    });
  };

  const getGenderBadge = (gender: string) => {
    switch (gender) {
      case "Mujer":
        return <Badge variant="secondary" className="bg-pink-100 text-pink-700">Mujer</Badge>;
      case "Hombre":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-700">Hombre</Badge>;
      default:
        return <Badge variant="secondary">{gender}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/admin/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Volver al dashboard
          </Link>

          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Heart className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold">SpeedMatch</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold mb-2">Speed Dating Valencia</h1>
            <p className="text-muted-foreground">15 de febrero de 2024 • 6 participantes</p>
          </div>
          <div className="flex gap-3">
            {eventStatus === "pending" && (
              <Button variant="hero" onClick={handleStartEvent}>
                <Play className="w-4 h-4 mr-2" />
                Iniciar evento
              </Button>
            )}
            {eventStatus === "active" && (
              <Button variant="hero" onClick={handleEndEvent}>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Finalizar evento
              </Button>
            )}
            {eventStatus === "completed" && (
              <Button variant="outline" onClick={() => setShowQR(true)}>
                <QrCode className="w-4 h-4 mr-2" />
                Mostrar QR
              </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="participants" className="space-y-6">
          <TabsList className="bg-card border">
            <TabsTrigger value="participants" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users className="w-4 h-4 mr-2" />
              Participantes
            </TabsTrigger>
            <TabsTrigger value="tables" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Table2 className="w-4 h-4 mr-2" />
              Mesas
            </TabsTrigger>
            <TabsTrigger value="matches" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Heart className="w-4 h-4 mr-2" />
              Matches
            </TabsTrigger>
          </TabsList>

          {/* Participants Tab */}
          <TabsContent value="participants">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Lista de Participantes</CardTitle>
                    <CardDescription>{mockParticipants.length} personas registradas</CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Exportar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {mockParticipants.map((participant, index) => (
                    <div 
                      key={participant.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50 animate-fade-in"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-medium">
                          {participant.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{participant.name}</p>
                          <p className="text-sm text-muted-foreground">{participant.age} años • {participant.preference}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {getGenderBadge(participant.gender)}
                        <span className="text-sm text-muted-foreground">Busca: {participant.agePreference}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tables Tab */}
          <TabsContent value="tables">
            <div className="space-y-6">
              {/* Round selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Ronda:</span>
                {mockTables.map((table) => (
                  <Button
                    key={table.round}
                    variant={currentRound === table.round ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentRound(table.round)}
                  >
                    {table.round}
                  </Button>
                ))}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Ronda {currentRound}</CardTitle>
                  <CardDescription>Distribución de mesas para esta ronda</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {mockTables.find(t => t.round === currentRound)?.tables.map((table, tableIndex) => (
                      <Card key={tableIndex} className="bg-gradient-card">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Table2 className="w-4 h-4 text-primary" />
                            <span className="font-medium">Mesa {tableIndex + 1}</span>
                          </div>
                          <div className="space-y-2">
                            {table.map((participant) => (
                              <div key={participant.id} className="flex items-center gap-2 p-2 rounded-md bg-background/50">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium">
                                  {participant.name.charAt(0)}
                                </div>
                                <span className="text-sm">{participant.name}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Matches Tab */}
          <TabsContent value="matches">
            <Card>
              <CardHeader>
                <CardTitle>Coincidencias</CardTitle>
                <CardDescription>
                  {mockMatches.filter(m => m.mutual).length} matches mutuos de {mockMatches.length} posibles
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {mockMatches.map((match, index) => (
                    <div 
                      key={index}
                      className={`flex items-center justify-between p-4 rounded-lg animate-fade-in ${
                        match.mutual ? 'bg-primary/5 border-2 border-primary/20' : 'bg-muted/50'
                      }`}
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex -space-x-2">
                          <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-medium border-2 border-background">
                            {match.participant1.name.charAt(0)}
                          </div>
                          <div className="w-10 h-10 rounded-full bg-gradient-accent flex items-center justify-center text-accent-foreground font-medium border-2 border-background">
                            {match.participant2.name.charAt(0)}
                          </div>
                        </div>
                        <div>
                          <p className="font-medium">
                            {match.participant1.name} & {match.participant2.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {match.mutual ? '¡Match mutuo!' : 'Interés de una parte'}
                          </p>
                        </div>
                      </div>
                      {match.mutual && (
                        <div className="flex items-center gap-2 text-primary">
                          <Heart className="w-5 h-5 fill-current" />
                          <span className="font-medium">Match</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* QR Modal */}
        {showQR && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md animate-scale-in">
              <CardHeader className="text-center">
                <CardTitle>Código QR del Evento</CardTitle>
                <CardDescription>
                  Los participantes pueden escanear este código para seleccionar sus matches
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-6">
                <div className="w-64 h-64 bg-foreground rounded-xl flex items-center justify-center">
                  <QrCode className="w-48 h-48 text-background" />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  speedmatch.app/event/{id}
                </p>
                <Button variant="outline" className="w-full" onClick={() => setShowQR(false)}>
                  Cerrar
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default EventDetail;
