import { useState, useRef, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, ArrowLeft, Users, QrCode, Table2, Download, Play, CheckCircle2, Plus, Upload, Trash2, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import RoundTimer from "@/components/event/RoundTimer";
import EventQRCode from "@/components/event/EventQRCode";
import AddParticipantModal from "@/components/event/AddParticipantModal";
import ExcelPreviewModal from "@/components/event/ExcelPreviewModal";
import { parseExcelFile, Participant } from "@/lib/excelParser";
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

interface EventData {
  id: string;
  name: string;
  date: string;
  location?: string;
  rounds: number;
  tableSize: number;
  roundDuration: number;
  matchPreference: string;
  participants: number;
  status: string;
  matches: number;
}

const EventDetail = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [showQR, setShowQR] = useState(false);
  const [showJoinQR, setShowJoinQR] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentRound, setCurrentRound] = useState(1);
  const [eventStatus, setEventStatus] = useState<"pending" | "active" | "completed">("pending");
  const [isLoadingExcel, setIsLoadingExcel] = useState(false);
  const [excelPreview, setExcelPreview] = useState<{participants: Participant[], errors: string[]} | null>(null);

  // Load event data and participants from localStorage
  useEffect(() => {
    const savedEvents = localStorage.getItem("events");
    if (savedEvents) {
      const events: EventData[] = JSON.parse(savedEvents);
      const currentEvent = events.find(e => e.id === id);
      if (currentEvent) {
        setEventData(currentEvent);
        if (currentEvent.status === "active") setEventStatus("active");
        if (currentEvent.status === "completed") setEventStatus("completed");
      }
    }
    
    const savedParticipants = localStorage.getItem(`event-${id}-participants`);
    if (savedParticipants) {
      setParticipants(JSON.parse(savedParticipants));
    }
  }, [id]);

  // Generate tables based on participants
  const generateTables = () => {
    if (participants.length < 2) return [];
    
    const tables = [];
    const numRounds = Math.min(5, participants.length - 1);
    
    for (let round = 1; round <= numRounds; round++) {
      const roundTables = [];
      const shuffled = [...participants].sort(() => Math.random() - 0.5);
      
      for (let i = 0; i < shuffled.length; i += 2) {
        if (i + 1 < shuffled.length) {
          roundTables.push([shuffled[i], shuffled[i + 1]]);
        }
      }
      
      tables.push({ round, tables: roundTables });
    }
    
    return tables;
  };

  const tables = generateTables();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast({
        title: "Error",
        description: "Por favor, sube un archivo Excel (.xlsx o .xls)",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoadingExcel(true);
    
    try {
      const result = await parseExcelFile(file);
      
      // Show preview instead of directly adding
      setExcelPreview({
        participants: result.participants,
        errors: result.errors,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo procesar el archivo Excel",
        variant: "destructive",
      });
    } finally {
      setIsLoadingExcel(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleConfirmExcelImport = () => {
    if (!excelPreview) return;
    
    const newParticipants = [...participants, ...excelPreview.participants];
    setParticipants(newParticipants);
    localStorage.setItem(`event-${id}-participants`, JSON.stringify(newParticipants));
    
    // Update event participant count
    const savedEvents = localStorage.getItem("events");
    if (savedEvents) {
      const events: EventData[] = JSON.parse(savedEvents);
      const updatedEvents = events.map(e => 
        e.id === id ? { ...e, participants: newParticipants.length } : e
      );
      localStorage.setItem("events", JSON.stringify(updatedEvents));
    }
    
    toast({
      title: "Participantes cargados",
      description: `Se han añadido ${excelPreview.participants.length} participantes`,
    });
    
    setExcelPreview(null);
  };

  const handleAddParticipant = (participant: Participant) => {
    const newParticipants = [...participants, participant];
    setParticipants(newParticipants);
    localStorage.setItem(`event-${id}-participants`, JSON.stringify(newParticipants));
    
    // Update event participant count
    const savedEvents = localStorage.getItem("events");
    if (savedEvents) {
      const events: EventData[] = JSON.parse(savedEvents);
      const updatedEvents = events.map(e => 
        e.id === id ? { ...e, participants: newParticipants.length } : e
      );
      localStorage.setItem("events", JSON.stringify(updatedEvents));
    }
    
    toast({
      title: "Participante añadido",
      description: `${participant.name} ha sido añadido al evento`,
    });
  };

  const handleDeleteParticipant = (participantId: string) => {
    const newParticipants = participants.filter(p => p.id !== participantId);
    setParticipants(newParticipants);
    localStorage.setItem(`event-${id}-participants`, JSON.stringify(newParticipants));
    
    // Update event participant count
    const savedEvents = localStorage.getItem("events");
    if (savedEvents) {
      const events: EventData[] = JSON.parse(savedEvents);
      const updatedEvents = events.map(e => 
        e.id === id ? { ...e, participants: newParticipants.length } : e
      );
      localStorage.setItem("events", JSON.stringify(updatedEvents));
    }
    
    toast({
      title: "Participante eliminado",
      description: "El participante ha sido eliminado del evento",
    });
  };

  const handleStartEvent = () => {
    if (participants.length < 2) {
      toast({
        title: "Error",
        description: "Necesitas al menos 2 participantes para iniciar el evento",
        variant: "destructive",
      });
      return;
    }
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
        return <Badge variant="secondary" className="bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300">Mujer</Badge>;
      case "Hombre":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">Hombre</Badge>;
      default:
        return <Badge variant="secondary">{gender}</Badge>;
    }
  };

  const exportToCSV = () => {
    if (participants.length === 0) return;
    
    const headers = ["Nombre", "Rango Edad", "Edad Preferida", "Preferencia", "Género"];
    const rows = participants.map(p => [p.name, p.ageRange, p.preferredAgeRange, p.preference, p.gender]);
    
    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = `participantes-evento-${id}.csv`;
    a.click();
    
    URL.revokeObjectURL(url);
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
            <h1 className="font-display text-3xl font-bold mb-2">{eventData?.name || "Evento"}</h1>
            <p className="text-muted-foreground">Evento #{id} • {participants.length} participantes</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowJoinQR(true)}>
              <QrCode className="w-4 h-4 mr-2" />
              QR Registro
            </Button>
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
                QR Matches
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Lista de Participantes</CardTitle>
                    <CardDescription>{participants.length} personas registradas</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="excel-upload"
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isLoadingExcel}
                    >
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      {isLoadingExcel ? "Cargando..." : "Cargar Excel"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowAddModal(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Añadir manual
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={exportToCSV}
                      disabled={participants.length === 0}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Exportar
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {participants.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                      <Users className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-display text-lg font-semibold mb-2">Sin participantes</h3>
                    <p className="text-muted-foreground mb-4">Carga un archivo Excel o añade participantes manualmente</p>
                    <div className="flex justify-center gap-3">
                      <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="w-4 h-4 mr-2" />
                        Cargar Excel
                      </Button>
                      <Button variant="hero" onClick={() => setShowAddModal(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Añadir manual
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {participants.map((participant, index) => (
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
                            <p className="text-sm text-muted-foreground">
                              {participant.ageRange || "Sin rango"} • {participant.preference}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {getGenderBadge(participant.gender)}
                          <span className="text-sm text-muted-foreground hidden sm:inline">
                            Busca: {participant.preferredAgeRange || "Sin preferencia"}
                          </span>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar participante?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  ¿Estás seguro de que quieres eliminar a {participant.name}?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteParticipant(participant.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tables Tab */}
          <TabsContent value="tables">
            <div className="space-y-6">
              {/* Timer */}
              {eventStatus === "active" && tables.length > 0 && (
                <RoundTimer
                  roundDuration={5}
                  currentRound={currentRound}
                  totalRounds={tables.length}
                  onRoundComplete={() => {
                    toast({
                      title: "¡Ronda completada!",
                      description: "Es hora de cambiar de mesa",
                    });
                  }}
                />
              )}

              {tables.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                      <Table2 className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-display text-lg font-semibold mb-2">Sin mesas generadas</h3>
                    <p className="text-muted-foreground">Añade al menos 2 participantes para generar las mesas</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Round selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Ronda:</span>
                    {tables.map((table) => (
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
                        {tables.find(t => t.round === currentRound)?.tables.map((table, tableIndex) => (
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
                </>
              )}
            </div>
          </TabsContent>

          {/* Matches Tab */}
          <TabsContent value="matches">
            <Card>
              <CardHeader>
                <CardTitle>Coincidencias</CardTitle>
                <CardDescription>
                  Los matches aparecerán aquí cuando los participantes voten
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <Heart className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-display text-lg font-semibold mb-2">Sin matches todavía</h3>
                  <p className="text-muted-foreground">
                    {eventStatus === "completed" 
                      ? "Espera a que los participantes voten usando el código QR"
                      : "Finaliza el evento y comparte el código QR para que los participantes voten"
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* QR Modal - Matches */}
        {showQR && (
          <EventQRCode eventId={id || "1"} onClose={() => setShowQR(false)} type="select" />
        )}

        {/* QR Modal - Join/Registration */}
        {showJoinQR && (
          <EventQRCode eventId={id || "1"} onClose={() => setShowJoinQR(false)} type="join" />
        )}

        {/* Add Participant Modal */}
        {showAddModal && (
          <AddParticipantModal
            onClose={() => setShowAddModal(false)}
            onAdd={handleAddParticipant}
          />
        )}

        {/* Excel Preview Modal */}
        {excelPreview && (
          <ExcelPreviewModal
            participants={excelPreview.participants}
            errors={excelPreview.errors}
            onConfirm={handleConfirmExcelImport}
            onCancel={() => setExcelPreview(null)}
          />
        )}
      </main>
    </div>
  );
};

export default EventDetail;
