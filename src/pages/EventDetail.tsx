import { useState, useRef, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, ArrowLeft, Users, QrCode, Table2, Download, Play, CheckCircle2, Plus, Upload, Trash2, FileSpreadsheet, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import RoundTimer from "@/components/event/RoundTimer";
import EventQRCode from "@/components/event/EventQRCode";
import AddParticipantModal from "@/components/event/AddParticipantModal";
import ExcelPreviewModal from "@/components/event/ExcelPreviewModal";
import { parseExcelFile, Participant } from "@/lib/excelParser";
import { supabase } from "@/integrations/supabase/client";
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
  rounds: number;
  table_size: number;
  round_duration: number;
  participants_count: number;
  status: string;
  tables: any;
}

interface DbParticipant {
  id: string;
  name: string;
  age: number | null;
  age_range: string | null;
  preferred_age_range: string | null;
  preference: string | null;
  dating_preference: string | null;
  gender: string | null;
}

interface Match {
  participant1: DbParticipant;
  participant2: DbParticipant;
}

const EventDetail = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [participants, setParticipants] = useState<DbParticipant[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [showQR, setShowQR] = useState(false);
  const [showJoinQR, setShowJoinQR] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentRound, setCurrentRound] = useState(1);
  const [eventStatus, setEventStatus] = useState<"pending" | "active" | "completed">("pending");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingExcel, setIsLoadingExcel] = useState(false);
  const [excelPreview, setExcelPreview] = useState<{participants: Participant[], errors: string[]} | null>(null);

  useEffect(() => {
    loadEventData();
  }, [id]);

  const loadEventData = async () => {
    if (!id) return;

    // Load event
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .single();

    if (eventError || !event) {
      setIsLoading(false);
      return;
    }

    setEventData(event);
    setEventStatus(event.status as "pending" | "active" | "completed");

    // Load participants
    const { data: participantsData } = await supabase
      .from("participants")
      .select("*")
      .eq("event_id", id);

    if (participantsData) {
      setParticipants(participantsData);
    }

    // Load matches (mutual selections)
    const { data: selectionsData } = await supabase
      .from("participant_selections")
      .select("selector_id, selected_id")
      .eq("event_id", id);

    if (selectionsData && participantsData) {
      const mutualMatches: Match[] = [];
      const processed = new Set<string>();

      selectionsData.forEach(sel => {
        const key = [sel.selector_id, sel.selected_id].sort().join('-');
        if (processed.has(key)) return;

        const reverse = selectionsData.find(
          s => s.selector_id === sel.selected_id && s.selected_id === sel.selector_id
        );

        if (reverse) {
          const p1 = participantsData.find(p => p.id === sel.selector_id);
          const p2 = participantsData.find(p => p.id === sel.selected_id);
          if (p1 && p2) {
            mutualMatches.push({ participant1: p1, participant2: p2 });
          }
          processed.add(key);
        }
      });

      setMatches(mutualMatches);
    }

    setIsLoading(false);
  };

  // Generate tables based on participants
  const generateTables = () => {
    if (participants.length < 2) return [];
    
    const tables = [];
    const numRounds = Math.min(eventData?.rounds || 5, participants.length - 1);
    
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

  const handleConfirmExcelImport = async () => {
    if (!excelPreview || !id) return;
    
    const participantsToInsert = excelPreview.participants.map(p => ({
      event_id: id,
      name: p.name,
      age: p.age || null,
      age_range: p.ageRange || null,
      preferred_age_range: p.preferredAgeRange || null,
      preference: p.preference || null,
      dating_preference: p.datingPreference || null,
      gender: p.gender || null,
    }));

    const { data: newParticipants, error } = await supabase
      .from("participants")
      .insert(participantsToInsert)
      .select();

    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron añadir los participantes",
        variant: "destructive",
      });
      return;
    }

    if (newParticipants) {
      setParticipants([...participants, ...newParticipants]);
      
      // Update participant count
      await supabase
        .from("events")
        .update({ participants_count: participants.length + newParticipants.length })
        .eq("id", id);
    }
    
    toast({
      title: "Participantes cargados",
      description: `Se han añadido ${excelPreview.participants.length} participantes`,
    });
    
    setExcelPreview(null);
  };

  const handleAddParticipant = async (participant: Participant) => {
    if (!id) return;

    const { data: newParticipant, error } = await supabase
      .from("participants")
      .insert({
        event_id: id,
        name: participant.name,
        age: participant.age || null,
        age_range: participant.ageRange || null,
        preferred_age_range: participant.preferredAgeRange || null,
        preference: participant.preference || null,
        dating_preference: participant.datingPreference || null,
        gender: participant.gender || null,
      })
      .select()
      .single();

    if (error || !newParticipant) {
      toast({
        title: "Error",
        description: "No se pudo añadir el participante",
        variant: "destructive",
      });
      return;
    }

    setParticipants([...participants, newParticipant]);
    
    // Update participant count
    await supabase
      .from("events")
      .update({ participants_count: participants.length + 1 })
      .eq("id", id);
    
    toast({
      title: "Participante añadido",
      description: `${participant.name} ha sido añadido al evento`,
    });
  };

  const handleDeleteParticipant = async (participantId: string) => {
    const { error } = await supabase
      .from("participants")
      .delete()
      .eq("id", participantId);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el participante",
        variant: "destructive",
      });
      return;
    }

    const newParticipants = participants.filter(p => p.id !== participantId);
    setParticipants(newParticipants);
    
    // Update participant count
    await supabase
      .from("events")
      .update({ participants_count: newParticipants.length })
      .eq("id", id);
    
    toast({
      title: "Participante eliminado",
      description: "El participante ha sido eliminado del evento",
    });
  };

  const handleStartEvent = async () => {
    if (participants.length < 2) {
      toast({
        title: "Error",
        description: "Necesitas al menos 2 participantes para iniciar el evento",
        variant: "destructive",
      });
      return;
    }

    await supabase
      .from("events")
      .update({ status: "active" })
      .eq("id", id);

    setEventStatus("active");
    toast({
      title: "Evento iniciado",
      description: "Los participantes ya pueden empezar las rondas",
    });
  };

  const handleEndEvent = async () => {
    await supabase
      .from("events")
      .update({ status: "completed" })
      .eq("id", id);

    setEventStatus("completed");
    setShowQR(true);
    toast({
      title: "Evento finalizado",
      description: "El código QR está disponible para los participantes",
    });
  };

  const getGenderBadge = (gender: string | null) => {
    if (!gender) return null;
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
    
    const headers = ["Nombre", "Rango Edad", "Edad Preferida", "Preferencia", "Preferencia de Ligue", "Género"];
    const rows = participants.map(p => [p.name, p.age_range, p.preferred_age_range, p.preference, p.dating_preference || "", p.gender]);
    
    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = `participantes-evento-${id}.csv`;
    a.click();
    
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!eventData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <h2 className="font-display text-xl font-semibold mb-2">Evento no encontrado</h2>
            <Link to="/admin/dashboard">
              <Button variant="outline" className="mt-4">Volver al dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            <h1 className="font-display text-3xl font-bold mb-2">{eventData.name}</h1>
            <p className="text-muted-foreground">{participants.length} participantes</p>
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
              Matches ({matches.length})
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
                              {participant.age_range || "Sin rango"} • {participant.preference}
                              {participant.dating_preference && ` • ${participant.dating_preference}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {getGenderBadge(participant.gender)}
                          <span className="text-sm text-muted-foreground hidden sm:inline">
                            Busca: {participant.preferred_age_range || "Sin preferencia"}
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
              {eventStatus === "active" && tables.length > 0 && (
                <RoundTimer
                  roundDuration={Math.floor((eventData.round_duration || 300) / 60)}
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
                        {tables.find(t => t.round === currentRound)?.tables.map((table: DbParticipant[], tableIndex: number) => (
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
                <CardTitle>Coincidencias ({matches.length})</CardTitle>
                <CardDescription>
                  Matches mutuos entre participantes
                </CardDescription>
              </CardHeader>
              <CardContent>
                {matches.length === 0 ? (
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
                    <Button variant="outline" className="mt-4" onClick={loadEventData}>
                      Actualizar matches
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {matches.map((match, index) => (
                      <div 
                        key={index}
                        className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex -space-x-2">
                            <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-medium border-2 border-background">
                              {match.participant1.name.charAt(0)}
                            </div>
                            <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-medium border-2 border-background">
                              {match.participant2.name.charAt(0)}
                            </div>
                          </div>
                          <div>
                            <p className="font-medium">{match.participant1.name} & {match.participant2.name}</p>
                            <p className="text-sm text-muted-foreground">¡Match mutuo! 💕</p>
                          </div>
                        </div>
                        <Heart className="w-5 h-5 text-primary" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* QR Modal - Matches */}
        {showQR && (
          <EventQRCode eventId={id || ""} onClose={() => setShowQR(false)} type="select" />
        )}

        {/* QR Modal - Join/Registration */}
        {showJoinQR && (
          <EventQRCode eventId={id || ""} onClose={() => setShowJoinQR(false)} type="join" />
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
