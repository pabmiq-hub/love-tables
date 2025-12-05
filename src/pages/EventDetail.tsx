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
  phone: string | null;
  checked_in: boolean;
}

interface Match {
  participant1: DbParticipant;
  participant2: DbParticipant;
  matchTypes: {
    friendship: boolean;
    dating: boolean;
  };
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
  const [showCheckinQR, setShowCheckinQR] = useState(false);
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

    // Load matches (mutual selections) with selection types
    const { data: selectionsData } = await supabase
      .from("participant_selections")
      .select("selector_id, selected_id, selection_type")
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
            // Determine match types based on both selections
            const sel1Type = (sel as any).selection_type || 'friendship';
            const sel2Type = (reverse as any).selection_type || 'friendship';
            
            const matchTypes = {
              friendship: (sel1Type === 'friendship' || sel1Type === 'both') && 
                          (sel2Type === 'friendship' || sel2Type === 'both'),
              dating: (sel1Type === 'dating' || sel1Type === 'both') && 
                      (sel2Type === 'dating' || sel2Type === 'both'),
            };
            
            mutualMatches.push({ participant1: p1, participant2: p2, matchTypes });
          }
          processed.add(key);
        }
      });

      setMatches(mutualMatches);
    }

    setIsLoading(false);
  };

  // Generate tables based on participants (stored or new)
  const generateTables = () => {
    // Use stored tables if available
    if (eventData?.tables && Array.isArray(eventData.tables) && eventData.tables.length > 0) {
      return eventData.tables;
    }
    
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

  const saveTablesAndStart = async () => {
    // Filter only checked-in participants
    const checkedInParticipants = participants.filter(p => p.checked_in);
    
    if (checkedInParticipants.length < 2) {
      toast({
        title: "Error",
        description: "Necesitas al menos 2 participantes con check-in para iniciar el evento",
        variant: "destructive",
      });
      return;
    }

    // Remove non-checked-in participants from database
    const nonCheckedInIds = participants.filter(p => !p.checked_in).map(p => p.id);
    if (nonCheckedInIds.length > 0) {
      await supabase
        .from("participants")
        .delete()
        .in("id", nonCheckedInIds);
    }

    // Generate smart tables based on preferences
    const generatedTables = generateSmartTables(checkedInParticipants, eventData?.rounds || 5, eventData?.table_size || 2);

    // Save tables and update status
    await supabase
      .from("events")
      .update({ 
        tables: generatedTables,
        status: "active",
        participants_count: checkedInParticipants.length
      })
      .eq("id", id);

    setParticipants(checkedInParticipants);
    setEventData(prev => prev ? { ...prev, tables: generatedTables, participants_count: checkedInParticipants.length } : prev);
    setEventStatus("active");
    toast({
      title: "Evento iniciado",
      description: `${nonCheckedInIds.length > 0 ? `Se eliminaron ${nonCheckedInIds.length} participantes sin check-in. ` : ""}Las mesas han sido generadas.`,
    });
  };

  // Smart table generation algorithm based on preferences
  const generateSmartTables = (participantsList: DbParticipant[], numRounds: number, tableSize: number) => {
    const tables = [];
    const actualRounds = Math.min(numRounds, participantsList.length - 1);
    
    for (let round = 1; round <= actualRounds; round++) {
      const roundTables = [];
      const available = [...participantsList];
      const paired = new Set<string>();
      
      while (available.length >= tableSize) {
        const table: { id: string; name: string }[] = [];
        
        // Pick first person
        const first = available.shift()!;
        table.push({ id: first.id, name: first.name });
        paired.add(first.id);
        
        // Find best matches for the table
        for (let i = 1; i < tableSize && available.length > 0; i++) {
          let bestMatch = 0;
          let bestScore = -1;
          
          for (let j = 0; j < available.length; j++) {
            const candidate = available[j];
            const score = calculateCompatibilityScore(first, candidate);
            if (score > bestScore) {
              bestScore = score;
              bestMatch = j;
            }
          }
          
          const matched = available.splice(bestMatch, 1)[0];
          table.push({ id: matched.id, name: matched.name });
          paired.add(matched.id);
        }
        
        roundTables.push(table);
      }
      
      tables.push({ round, tables: roundTables });
      
      // Shuffle for next round to get different combinations
      participantsList = [...participantsList].sort(() => Math.random() - 0.5);
    }
    
    return tables;
  };

  // Calculate compatibility score between two participants
  const calculateCompatibilityScore = (p1: DbParticipant, p2: DbParticipant): number => {
    let score = 0;
    
    // Age range compatibility (check if each person's age is in the other's preferred range)
    const p1AgeInP2Pref = checkAgeRangeMatch(p1.age_range, p2.preferred_age_range);
    const p2AgeInP1Pref = checkAgeRangeMatch(p2.age_range, p1.preferred_age_range);
    if (p1AgeInP2Pref && p2AgeInP1Pref) score += 3;
    else if (p1AgeInP2Pref || p2AgeInP1Pref) score += 1;
    
    // Preference compatibility (both friendship, both dating, or mixed)
    const bothFriendship = p1.preference === "Sólo amistad" && p2.preference === "Sólo amistad";
    const bothDating = p1.preference === "Amistad y ligue" && p2.preference === "Amistad y ligue";
    if (bothFriendship || bothDating) score += 2;
    
    // Dating preference compatibility (if both are looking for dating)
    if (bothDating && p1.dating_preference && p2.dating_preference) {
      if (areDatingPreferencesCompatible(p1.dating_preference, p1.gender, p2.dating_preference, p2.gender)) {
        score += 3;
      }
    }
    
    return score;
  };

  const checkAgeRangeMatch = (personAge: string | null, preferredRange: string | null): boolean => {
    if (!personAge || !preferredRange) return true; // No preference = accept all
    if (preferredRange.includes("Cualquier rango")) return true;
    return preferredRange.includes(personAge);
  };

  const areDatingPreferencesCompatible = (pref1: string, gender1: string | null, pref2: string, gender2: string | null): boolean => {
    const openPrefs = ["Estoy abierto a todo", "No binario"];
    if (openPrefs.includes(pref1) || openPrefs.includes(pref2)) return true;
    
    // Check specific preferences
    const p1LookingForWoman = pref1.includes("busco una mujer");
    const p1LookingForMan = pref1.includes("busco un hombre");
    const p2LookingForWoman = pref2.includes("busco una mujer");
    const p2LookingForMan = pref2.includes("busco un hombre");
    
    const p1IsWoman = gender1 === "Mujer" || pref1.includes("Soy una mujer");
    const p1IsMan = gender1 === "Hombre" || pref1.includes("Soy un hombre");
    const p2IsWoman = gender2 === "Mujer" || pref2.includes("Soy una mujer");
    const p2IsMan = gender2 === "Hombre" || pref2.includes("Soy un hombre");
    
    // Check mutual attraction
    if (p1LookingForWoman && p2IsWoman && p2LookingForMan && p1IsMan) return true;
    if (p1LookingForMan && p2IsMan && p2LookingForMan && p1IsMan) return true;
    if (p1LookingForWoman && p2IsWoman && p2LookingForWoman && p1IsWoman) return true;
    if (p1LookingForMan && p2IsMan && p2LookingForWoman && p1IsWoman) return true;
    
    return false;
  };

  const handleToggleCheckin = async (participantId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("participants")
      .update({ checked_in: !currentStatus })
      .eq("id", participantId);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el check-in",
        variant: "destructive",
      });
      return;
    }

    setParticipants(participants.map(p => 
      p.id === participantId ? { ...p, checked_in: !currentStatus } : p
    ));
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
      phone: p.phone || null,
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
        phone: participant.phone || null,
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
    await saveTablesAndStart();
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
    
    const headers = ["Nombre", "Teléfono", "Rango Edad", "Edad Preferida", "Preferencia", "Preferencia de Ligue", "Género"];
    const rows = participants.map(p => [p.name, p.phone || "", p.age_range, p.preferred_age_range, p.preference, p.dating_preference || "", p.gender]);
    
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
            <p className="text-muted-foreground">
              {participants.length} participantes • {participants.filter(p => p.checked_in).length} check-in ✅
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => setShowJoinQR(true)}>
              <QrCode className="w-4 h-4 mr-2" />
              QR Registro
            </Button>
            {eventStatus === "pending" && (
              <Button variant="outline" onClick={() => setShowCheckinQR(true)}>
                <QrCode className="w-4 h-4 mr-2" />
                QR Check-in
              </Button>
            )}
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
                        className={`flex items-center justify-between p-4 rounded-lg animate-fade-in ${
                          participant.checked_in ? "bg-primary/10 border border-primary/20" : "bg-muted/50"
                        }`}
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => handleToggleCheckin(participant.id, participant.checked_in)}
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition-all ${
                              participant.checked_in 
                                ? "bg-primary text-primary-foreground" 
                                : "bg-gradient-primary text-primary-foreground"
                            }`}
                            title={participant.checked_in ? "Desmarcar check-in" : "Marcar check-in"}
                          >
                            {participant.checked_in ? "✓" : participant.name.charAt(0)}
                          </button>
                          <div>
                            <p className="font-medium flex items-center gap-2">
                              {participant.name}
                              {participant.checked_in && (
                                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">Check-in ✅</span>
                              )}
                            </p>
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
                    {matches.map((match, index) => {
                      const matchLabels: string[] = [];
                      if (match.matchTypes.friendship) matchLabels.push("Amistad 😊");
                      if (match.matchTypes.dating) matchLabels.push("Ligue 💕");
                      const matchLabel = matchLabels.length > 0 ? matchLabels.join(" + ") : "Match";
                      
                      return (
                        <div 
                          key={index}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20 gap-3"
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
                              <p className="text-sm text-muted-foreground">¡Match mutuo! {matchLabel}</p>
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2 text-sm">
                            {match.participant1.phone && (
                              <a href={`tel:${match.participant1.phone}`} className="text-primary hover:underline">
                                📞 {match.participant1.name.split(' ')[0]}
                              </a>
                            )}
                            {match.participant2.phone && (
                              <a href={`tel:${match.participant2.phone}`} className="text-primary hover:underline">
                                📞 {match.participant2.name.split(' ')[0]}
                              </a>
                            )}
                          </div>
                          <Heart className="w-5 h-5 text-primary hidden sm:block" />
                        </div>
                      );
                    })}
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

        {/* QR Modal - Check-in */}
        {showCheckinQR && (
          <EventQRCode eventId={id || ""} onClose={() => setShowCheckinQR(false)} type="checkin" />
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
