import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Heart, ArrowLeft, Upload, Users, Clock, Table2, Loader2, Plus, FileSpreadsheet, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { parseExcelFile, Participant } from "@/lib/excelParser";
import AddParticipantModal from "@/components/event/AddParticipantModal";
import EventPreferencesEditor, { EventPreferences, DEFAULT_PREFERENCES } from "@/components/event/EventPreferencesEditor";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type ParticipantMode = "manual" | "excel" | "both";

const CreateEvent = () => {
  const [step, setStep] = useState(1);
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [rounds, setRounds] = useState(5);
  const [tableSize, setTableSize] = useState(2);
  const [roundDuration, setRoundDuration] = useState(5);
  const [roundDurationSeconds, setRoundDurationSeconds] = useState(0);
  const [matchPreference, setMatchPreference] = useState("both");
  const [rotationMode, setRotationMode] = useState<"fixed_host" | "all_rotate">("fixed_host");
  const [genderParity, setGenderParity] = useState(false);
  const [participantMode, setParticipantMode] = useState<ParticipantMode | null>(null);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [eventPreferences, setEventPreferences] = useState<EventPreferences>({ ...DEFAULT_PREFERENCES });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading } = useAuth();

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate("/admin/login");
    }
  }, [user, loading, navigate]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        setExcelFile(file);
        setIsLoading(true);
        
        try {
          const result = await parseExcelFile(file);
          
          if (result.success) {
            setParticipants(prev => [...prev, ...result.participants]);
            toast({
              title: "Participantes cargados",
              description: `Se han añadido ${result.participants.length} participantes del Excel`,
            });
          } else {
            toast({
              title: "Error al procesar Excel",
              description: result.errors.join(". "),
              variant: "destructive",
            });
          }
        } catch (error) {
          toast({
            title: "Error",
            description: "No se pudo procesar el archivo Excel",
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
        }
      } else {
        toast({
          title: "Error",
          description: "Por favor, sube un archivo Excel (.xlsx o .xls)",
          variant: "destructive",
        });
      }
    }
  };

  const handleAddParticipant = (participant: Participant) => {
    setParticipants(prev => [...prev, participant]);
    toast({
      title: "Participante añadido",
      description: `${participant.name} ha sido añadido`,
    });
  };

  const handleRemoveParticipant = (id: string) => {
    setParticipants(prev => prev.filter(p => p.id !== id));
  };

  const handleCreateEvent = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para crear un evento",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    // Check if preferences are customized
    const hasCustomPreferences = JSON.stringify(eventPreferences) !== JSON.stringify(DEFAULT_PREFERENCES);
    
    // Create event in database with organizer_id
    const { data: eventData, error: eventError } = await supabase
      .from("events")
      .insert({
        name: eventName,
        date: eventDate.split('T')[0],
        rounds,
        table_size: tableSize,
        round_duration: roundDuration * 60 + roundDurationSeconds, // Convert to seconds
        participants_count: participants.length,
        status: "pending",
        organizer_id: user.id,
        rotation_mode: rotationMode,
        gender_parity: genderParity,
        custom_age_ranges: hasCustomPreferences ? eventPreferences.ageRanges : null,
        custom_genders: hasCustomPreferences ? eventPreferences.genders : null,
        custom_preferences: hasCustomPreferences ? eventPreferences.preferences : null,
        custom_dating_preferences: hasCustomPreferences ? eventPreferences.datingPreferences : null,
      })
      .select()
      .single();
    
    if (eventError || !eventData) {
      toast({
        title: "Error",
        description: "No se pudo crear el evento",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }
    
    // Save participants
    if (participants.length > 0) {
      const participantsToInsert = participants.map(p => ({
        event_id: eventData.id,
        name: p.name,
        age: p.age || null,
        age_range: p.ageRange || null,
        preferred_age_range: p.preferredAgeRange || null,
        preference: p.preference || null,
        dating_preference: p.datingPreference || null,
        gender: p.gender || null,
        phone: p.phone || null,
      }));
      
      const { error: participantsError } = await supabase
        .from("participants")
        .insert(participantsToInsert);
      
      if (participantsError) {
        toast({
          title: "Advertencia",
          description: "El evento se creó pero hubo un error al añadir algunos participantes",
          variant: "destructive",
        });
      }
    }
    
    toast({
      title: "Evento creado",
      description: "El evento se ha creado correctamente",
    });
    navigate(`/admin/events/${eventData.id}`);
    setIsLoading(false);
  };

  const nextStep = () => {
    if (step === 1 && (!eventName || !eventDate)) {
      toast({
        title: "Error",
        description: "Por favor, completa todos los campos",
        variant: "destructive",
      });
      return;
    }
    if (step === 3 && !participantMode) {
      toast({
        title: "Error",
        description: "Por favor, selecciona una opción",
        variant: "destructive",
      });
      return;
    }
    setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  const canCreateEvent = () => {
    if (participantMode === "manual" || participantMode === "both") {
      return participants.length > 0;
    }
    if (participantMode === "excel") {
      return excelFile && participants.length > 0;
    }
    return false;
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
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold mb-2">Crear Nuevo Evento</h1>
          <p className="text-muted-foreground">Configura los detalles de tu speed dating</p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                s <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {s}
              </div>
              {s < 4 && (
                <div className={`w-12 h-1 mx-2 rounded ${s < step ? 'bg-primary' : 'bg-muted'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Basic info */}
        {step === 1 && (
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle>Información básica</CardTitle>
              <CardDescription>Define los datos principales del evento</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="eventName">Nombre del evento</Label>
                <Input
                  id="eventName"
                  placeholder="Ej: Speed Dating Valencia"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="eventDate">Fecha del evento</Label>
                <Input
                  id="eventDate"
                  type="datetime-local"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="eventLocation">Ubicación (opcional)</Label>
                <Input
                  id="eventLocation"
                  placeholder="Ej: Restaurante El Encuentro"
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                />
              </div>
              <Button variant="hero" className="w-full mt-4" onClick={nextStep}>
                Continuar
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Configuration */}
        {step === 2 && (
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle>Configuración del evento</CardTitle>
              <CardDescription>Define las reglas y parámetros</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <Label>Número de rondas: {rounds}</Label>
                    <Slider
                      value={[rounds]}
                      onValueChange={(v) => setRounds(v[0])}
                      min={3}
                      max={15}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Table2 className="w-5 h-5 text-accent" />
                  </div>
                  <div className="flex-1">
                    <Label>Participantes por mesa: {tableSize}</Label>
                    <Slider
                      value={[tableSize]}
                      onValueChange={(v) => setTableSize(v[0])}
                      min={2}
                      max={6}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <Label>Duración por ronda</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <Input
                        type="number"
                        min={1}
                        max={120}
                        value={roundDuration}
                        onChange={(e) => setRoundDuration(Math.max(1, Math.min(120, parseInt(e.target.value) || 1)))}
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">minutos</span>
                      <Input
                        type="number"
                        min={0}
                        max={59}
                        value={roundDurationSeconds}
                        onChange={(e) => setRoundDurationSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">segundos</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Total: {roundDuration} min {roundDurationSeconds > 0 ? `${roundDurationSeconds} seg` : ""}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tipo de conexiones</Label>
                  <Select value={matchPreference} onValueChange={setMatchPreference}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="both">Amistad y romance</SelectItem>
                      <SelectItem value="friendship">Solo amistad</SelectItem>
                      <SelectItem value="romance">Solo romance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Rotación de mesas</Label>
                  <Select value={rotationMode} onValueChange={(v) => setRotationMode(v as "fixed_host" | "all_rotate")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed_host">Un participante fijo por mesa</SelectItem>
                      <SelectItem value="all_rotate">Todos los participantes rotan</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {rotationMode === "fixed_host" 
                      ? "Un participante se mantiene en cada mesa y los demás rotan"
                      : "Todos los participantes cambian de mesa en cada ronda"
                    }
                  </p>
                </div>

                {/* Gender parity option - only show for friendship events */}
                {(matchPreference === "friendship" || matchPreference === "both") && (
                  <div className="space-y-2">
                    <Label>Paridad de géneros</Label>
                    <Select value={genderParity ? "yes" : "no"} onValueChange={(v) => setGenderParity(v === "yes")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no">No aplicar paridad</SelectItem>
                        <SelectItem value="yes">Aplicar paridad de géneros</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {genderParity 
                        ? "Se intentará equilibrar géneros en cada mesa (ej: 2 hombres y 2 mujeres en mesa de 4)"
                        : "Los participantes se asignan según preferencias sin considerar paridad de género"
                      }
                    </p>
                  </div>
                )}

                {/* Event Preferences Editor */}
                <div className="pt-2">
                  <EventPreferencesEditor
                    value={eventPreferences}
                    onChange={setEventPreferences}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={prevStep}>
                  Atrás
                </Button>
                <Button variant="hero" className="flex-1" onClick={nextStep}>
                  Continuar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Choose participant mode */}
        {step === 3 && (
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle>¿Cómo quieres añadir participantes?</CardTitle>
              <CardDescription>Selecciona el método para registrar a los asistentes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    participantMode === "manual" 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => setParticipantMode("manual")}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <UserPlus className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Solo manual</p>
                      <p className="text-sm text-muted-foreground">Añadir participantes uno a uno</p>
                    </div>
                  </div>
                </div>

                <div
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    participantMode === "excel" 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => setParticipantMode("excel")}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                      <FileSpreadsheet className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <p className="font-medium">Solo Excel</p>
                      <p className="text-sm text-muted-foreground">Cargar participantes desde un archivo</p>
                    </div>
                  </div>
                </div>

                <div
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    participantMode === "both" 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => setParticipantMode("both")}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Excel + Manual</p>
                      <p className="text-sm text-muted-foreground">Cargar Excel y añadir más manualmente</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1" onClick={prevStep}>
                  Atrás
                </Button>
                <Button variant="hero" className="flex-1" onClick={nextStep} disabled={!participantMode}>
                  Continuar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Add participants */}
        {step === 4 && (
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle>Añadir participantes</CardTitle>
              <CardDescription>
                {participantMode === "manual" && "Añade los participantes manualmente"}
                {participantMode === "excel" && "Carga el archivo Excel con los participantes"}
                {participantMode === "both" && "Carga el Excel y añade más participantes si lo necesitas"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Excel upload */}
              {(participantMode === "excel" || participantMode === "both") && (
                <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                    id="excel-upload"
                  />
                  <label htmlFor="excel-upload" className="cursor-pointer">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <Upload className="w-6 h-6 text-primary" />
                    </div>
                    {excelFile ? (
                      <>
                        <p className="font-medium text-foreground">{excelFile.name}</p>
                        <p className="text-sm text-muted-foreground mt-1">Haz clic para cambiar</p>
                      </>
                    ) : (
                      <>
                        <p className="font-medium text-foreground">Arrastra tu archivo Excel aquí</p>
                        <p className="text-sm text-muted-foreground mt-1">o haz clic para seleccionar</p>
                      </>
                    )}
                  </label>
                </div>
              )}

              {/* Excel format info */}
              {(participantMode === "excel" || participantMode === "both") && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="font-medium mb-2">Formato del Excel:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• <strong>Nombre y apellidos</strong></li>
                    <li>• <strong>Rango de edad</strong> (18–24, 25–32, 33–40, 41–50, + 50)</li>
                    <li>• <strong>Género</strong> (Hombre, Mujer, No binario, Prefiero no decirlo)</li>
                    <li>• <strong>Rango de edad preferido</strong></li>
                    <li>• <strong>Preferencia</strong> (Amistad y ligue / Solo amistad)</li>
                    <li>• <strong>Preferencia acerca de ligue</strong> (si aplica)</li>
                  </ul>
                </div>
              )}

              {/* Manual add button */}
              {(participantMode === "manual" || participantMode === "both") && (
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => setShowAddModal(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Añadir participante
                </Button>
              )}

              {/* Participants list */}
              {participants.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Participantes ({participants.length})</h4>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {participants.map((p) => (
                      <div 
                        key={p.id} 
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div>
                          <p className="font-medium text-sm">{p.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.ageRange} • {p.gender} • {p.preference}
                          </p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleRemoveParticipant(p.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={prevStep}>
                  Atrás
                </Button>
                <Button 
                  variant="hero" 
                  className="flex-1" 
                  onClick={handleCreateEvent}
                  disabled={!canCreateEvent() || isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Creando...
                    </>
                  ) : (
                    <>
                      <Users className="w-4 h-4 mr-2" />
                      Crear evento
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Add Participant Modal */}
        {showAddModal && (
          <AddParticipantModal
            onClose={() => setShowAddModal(false)}
            onAdd={handleAddParticipant}
          />
        )}
      </main>
    </div>
  );
};

export default CreateEvent;
