import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Upload, Users, Clock, Table2, Loader2, Plus, FileSpreadsheet, UserPlus, History, Lock, Sparkles, Briefcase, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { parseExcelFile, Participant } from "@/lib/excelParser";
import AddParticipantModal from "@/components/event/AddParticipantModal";
import AddProfessionalParticipantModal, { ProfessionalParticipant } from "@/components/event/AddProfessionalParticipantModal";
import EventPreferencesEditor, { EventPreferences, DEFAULT_PREFERENCES } from "@/components/event/EventPreferencesEditor";
import ProfessionalPreferencesEditor, { ProfessionalPreferences, DEFAULT_PROFESSIONAL_PREFERENCES } from "@/components/event/ProfessionalPreferencesEditor";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFeatures } from "@/hooks/useFeatures";
import { useOrganizer } from "@/hooks/useOrganizer";
import konektumLogo from "@/assets/konektum-logo.png";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

type ParticipantMode = "manual" | "excel" | "both";
type EventModule = "social" | "professional";
type B2BRotationType = "client_fixed" | "provider_fixed";

const CreateEvent = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const { hasFeature, isSuperAdmin } = useFeatures();
  const { hasModule, organizer } = useOrganizer();

  // Detect available modules
  const hasSocialModule = hasModule("social") || isSuperAdmin;
  const hasProfessionalModule = hasModule("professional") || isSuperAdmin;
  const hasBothModules = hasSocialModule && hasProfessionalModule;

  // Determine the effective starting step based on modules
  const getInitialStep = () => hasBothModules ? 0 : 1;
  const getDefaultModule = (): EventModule => {
    if (hasSocialModule) return "social";
    if (hasProfessionalModule) return "professional";
    return "social";
  };

  // Step state - step 0 is module selector (only if both modules available)
  const [step, setStep] = useState(getInitialStep());
  const [eventModule, setEventModule] = useState<EventModule>(getDefaultModule());
  
  // Common fields
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [rounds, setRounds] = useState(5);
  const [roundDuration, setRoundDuration] = useState(5);
  const [roundDurationSeconds, setRoundDurationSeconds] = useState(0);
  const [avoidPreviousEncounters, setAvoidPreviousEncounters] = useState(false);
  const [avoidEncountersMode, setAvoidEncountersMode] = useState<"preference" | "strict">("preference");
  
  // Social-specific fields
  const [tableSize, setTableSize] = useState(2);
  const [matchPreference, setMatchPreference] = useState("both");
  const [rotationMode, setRotationMode] = useState<"fixed_host" | "all_rotate">("fixed_host");
  const [genderParity, setGenderParity] = useState(false);
  const [eventPreferences, setEventPreferences] = useState<EventPreferences>({ ...DEFAULT_PREFERENCES });
  
  // Professional-specific fields
  const [b2bRotationType, setB2bRotationType] = useState<B2BRotationType>("client_fixed");
  const [professionalPreferences, setProfessionalPreferences] = useState<ProfessionalPreferences>({ ...DEFAULT_PROFESSIONAL_PREFERENCES });
  
  // Participant management
  const [participantMode, setParticipantMode] = useState<ParticipantMode | null>(null);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showProfessionalAddModal, setShowProfessionalAddModal] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canUseExcel = hasFeature("excel_import") || isSuperAdmin;

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate("/admin/login");
    }
  }, [user, loading, navigate]);

  // Check if organizer has no modules assigned
  const hasNoModules = !hasSocialModule && !hasProfessionalModule && !loading && !isSuperAdmin;

  // Calculate total steps based on module availability
  const totalSteps = hasBothModules ? 5 : 4;
  const displayStep = hasBothModules ? step : step; // Adjust display for progress indicator

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

  const handleAddProfessionalParticipant = (participant: ProfessionalParticipant) => {
    // Convert ProfessionalParticipant to Participant format for storage
    const participantData: Participant = {
      id: participant.id,
      name: participant.name,
      age: 0, // Not used in professional
      ageRange: "", // Not used in professional
      preferredAgeRange: "", // Not used in professional
      preference: "", // Not used in professional
      gender: "", // Not used in professional
      phone: participant.phone,
      email: participant.email,
      companyName: participant.companyName,
      entityType: participant.entityType,
      sector: participant.sector,
      companySize: participant.companySize,
      needs: participant.needs,
      solutions: participant.solutions,
      businessInterests: participant.businessInterests,
    };
    setParticipants(prev => [...prev, participantData]);
    toast({
      title: "Participante añadido",
      description: `${participant.companyName} ha sido añadido`,
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
    
    // Check if preferences are customized (social only)
    const hasCustomPreferences = eventModule === "social" && 
      JSON.stringify(eventPreferences) !== JSON.stringify(DEFAULT_PREFERENCES);
    
    // Build professional config if needed
    const professionalConfig = eventModule === "professional" ? {
      rotation_type: b2bRotationType,
      sectors: professionalPreferences.sectors,
      company_sizes: professionalPreferences.companySizes,
      predefined_needs: professionalPreferences.predefinedNeeds,
      predefined_solutions: professionalPreferences.predefinedSolutions,
    } : null;
    
    // Create event in database with organizer_id
    const { data: eventData, error: eventError } = await supabase
      .from("events")
      .insert({
        name: eventName,
        date: eventDate.split('T')[0],
        rounds,
        table_size: eventModule === "professional" ? 2 : tableSize, // B2B always 1:1
        round_duration: roundDuration * 60 + roundDurationSeconds,
        participants_count: participants.length,
        status: "pending",
        organizer_id: user.id,
        module: eventModule,
        rotation_mode: eventModule === "professional" 
          ? (b2bRotationType === "client_fixed" ? "fixed_host" : "all_rotate")
          : rotationMode,
        gender_parity: eventModule === "social" ? genderParity : false,
        avoid_previous_encounters: avoidPreviousEncounters,
        avoid_encounters_mode: avoidEncountersMode,
        custom_age_ranges: hasCustomPreferences ? eventPreferences.ageRanges : null,
        custom_genders: hasCustomPreferences ? eventPreferences.genders : null,
        custom_preferences: hasCustomPreferences ? eventPreferences.preferences : null,
        custom_dating_preferences: hasCustomPreferences ? eventPreferences.datingPreferences : null,
        professional_config: professionalConfig,
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
        email: p.email || null,
        // Professional fields
        company_name: p.companyName || null,
        entity_type: p.entityType || null,
        sector: p.sector || null,
        company_size: p.companySize || null,
        needs: p.needs || null,
        solutions: p.solutions || null,
        business_interests: p.businessInterests ? [p.businessInterests] : null,
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
    // Validate step 0 (module selection) - only if both modules available
    if (step === 0 && hasBothModules) {
      setStep(1);
      return;
    }
    
    // Validate step 1 (basic info)
    if (step === 1 && (!eventName || !eventDate)) {
      toast({
        title: "Error",
        description: "Por favor, completa todos los campos",
        variant: "destructive",
      });
      return;
    }
    
    // Validate step 3 (participant mode) - step adjusted based on module selector
    const participantModeStep = hasBothModules ? 3 : 3;
    if (step === participantModeStep && !participantMode) {
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

  // Get the step numbers for the progress indicator
  const getProgressSteps = () => {
    if (hasBothModules) {
      return [0, 1, 2, 3, 4];
    }
    return [1, 2, 3, 4];
  };

  // Show error if organizer has no modules
  if (hasNoModules) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <Link to="/admin/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Volver al dashboard
            </Link>
            <img src={konektumLogo} alt="Konektum" className="h-10 w-auto" />
          </div>
        </header>
        <main className="container mx-auto px-4 py-8 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-destructive" />
                Sin acceso a módulos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Tu cuenta no tiene módulos asignados. Contacta con el administrador para activar 
                los módulos de Speed Dating o Networking B2B.
              </p>
              <Button asChild>
                <Link to="/admin/dashboard">Volver al dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
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

          <img src={konektumLogo} alt="Konektum" className="h-10 w-auto" />
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold mb-2">Crear Nuevo Evento</h1>
          <p className="text-muted-foreground">
            {eventModule === "social" 
              ? "Configura los detalles de tu speed dating"
              : "Configura los detalles de tu networking B2B"
            }
          </p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-8">
          {getProgressSteps().map((s, index) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                s <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {hasBothModules ? index : index + 1}
              </div>
              {index < getProgressSteps().length - 1 && (
                <div className={`w-12 h-1 mx-2 rounded ${s < step ? 'bg-primary' : 'bg-muted'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 0: Module Selection (only if both modules available) */}
        {step === 0 && hasBothModules && (
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle>Tipo de evento</CardTitle>
              <CardDescription>¿Qué tipo de evento vas a crear?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div
                  className={`p-6 rounded-lg border-2 cursor-pointer transition-all ${
                    eventModule === "social" 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => setEventModule("social")}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-pink-500/10 flex items-center justify-center">
                      <Heart className="w-6 h-6 text-pink-500" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-lg">Speed Dating</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Eventos sociales de citas rápidas. Los participantes se conocen en mesas rotativas 
                        y luego seleccionan con quién quieren conectar.
                      </p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Badge variant="secondary" className="text-xs">Amistad</Badge>
                        <Badge variant="secondary" className="text-xs">Romance</Badge>
                        <Badge variant="secondary" className="text-xs">Preferencias personales</Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className={`p-6 rounded-lg border-2 cursor-pointer transition-all ${
                    eventModule === "professional" 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => setEventModule("professional")}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Briefcase className="w-6 h-6 text-blue-500" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-lg">Networking B2B</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Eventos de networking profesional. Conecta clientes con proveedores 
                        en reuniones 1:1 rotativas.
                      </p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Badge variant="secondary" className="text-xs">Cliente-Proveedor</Badge>
                        <Badge variant="secondary" className="text-xs">Sectores</Badge>
                        <Badge variant="secondary" className="text-xs">Reuniones 1:1</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Button variant="hero" className="w-full mt-4" onClick={nextStep}>
                Continuar
              </Button>
            </CardContent>
          </Card>
        )}

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
                  placeholder={eventModule === "social" 
                    ? "Ej: Speed Dating Valencia" 
                    : "Ej: Networking Tech Barcelona"
                  }
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
                  placeholder={eventModule === "social" 
                    ? "Ej: Restaurante El Encuentro" 
                    : "Ej: Hotel Business Center"
                  }
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                {hasBothModules && (
                  <Button variant="outline" className="flex-1" onClick={prevStep}>
                    Atrás
                  </Button>
                )}
                <Button variant="hero" className={hasBothModules ? "flex-1" : "w-full"} onClick={nextStep}>
                  Continuar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Configuration - SOCIAL */}
        {step === 2 && eventModule === "social" && (
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle>Configuración del evento</CardTitle>
              <CardDescription>Define las reglas y parámetros del speed dating</CardDescription>
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

                {/* Avoid previous encounters option */}
                <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                        <History className="w-5 h-5 text-orange-500" />
                      </div>
                      <div>
                        <Label htmlFor="avoid-encounters" className="font-medium cursor-pointer">
                          Evitar coincidencias de eventos anteriores
                        </Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Participantes que ya se conocen no se sentarán juntos
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="avoid-encounters"
                      checked={avoidPreviousEncounters}
                      onCheckedChange={setAvoidPreviousEncounters}
                    />
                  </div>
                  
                  {avoidPreviousEncounters && (
                    <div className="ml-[52px] space-y-2">
                      <Label className="text-sm">Intensidad</Label>
                      <Select value={avoidEncountersMode} onValueChange={(v) => setAvoidEncountersMode(v as "preference" | "strict")}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="preference">Preferencia (evitar si es posible)</SelectItem>
                          <SelectItem value="strict">Estricto (nunca repetir)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {avoidEncountersMode === "preference" 
                          ? "El algoritmo priorizará evitar coincidencias, pero las permitirá si es necesario"
                          : "El algoritmo nunca sentará juntos a participantes que ya coincidieron (puede limitar opciones)"
                        }
                      </p>
                    </div>
                  )}
                </div>

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

        {/* Step 2: Configuration - PROFESSIONAL */}
        {step === 2 && eventModule === "professional" && (
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle>Configuración del evento</CardTitle>
              <CardDescription>Define las reglas y parámetros del networking B2B</CardDescription>
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
                      max={20}
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
                    <Label>Duración por reunión</Label>
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

                {/* B2B Rotation Type */}
                <div className="space-y-2">
                  <Label>Tipo de rotación</Label>
                  <Select value={b2bRotationType} onValueChange={(v) => setB2bRotationType(v as B2BRotationType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client_fixed">Clientes fijos - Proveedores rotan</SelectItem>
                      <SelectItem value="provider_fixed">Proveedores fijos - Clientes rotan</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {b2bRotationType === "client_fixed" 
                      ? "Los clientes permanecen en su mesa y los proveedores rotan para presentarse"
                      : "Los proveedores permanecen en su mesa y los clientes rotan para conocerlos"
                    }
                  </p>
                </div>

                {/* B2B always 1:1 info */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <Users className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium">Reuniones 1 a 1</p>
                    <p className="text-xs text-muted-foreground">
                      Los encuentros profesionales son siempre entre 2 participantes (cliente + proveedor)
                    </p>
                  </div>
                </div>

                {/* Avoid previous encounters option */}
                <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                        <History className="w-5 h-5 text-orange-500" />
                      </div>
                      <div>
                        <Label htmlFor="avoid-encounters-pro" className="font-medium cursor-pointer">
                          Evitar coincidencias de eventos anteriores
                        </Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Participantes que ya se reunieron no serán emparejados
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="avoid-encounters-pro"
                      checked={avoidPreviousEncounters}
                      onCheckedChange={setAvoidPreviousEncounters}
                    />
                  </div>
                  
                  {avoidPreviousEncounters && (
                    <div className="ml-[52px] space-y-2">
                      <Label className="text-sm">Intensidad</Label>
                      <Select value={avoidEncountersMode} onValueChange={(v) => setAvoidEncountersMode(v as "preference" | "strict")}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="preference">Preferencia (evitar si es posible)</SelectItem>
                          <SelectItem value="strict">Estricto (nunca repetir)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Professional Preferences Editor */}
                <div className="pt-2">
                  <ProfessionalPreferencesEditor
                    value={professionalPreferences}
                    onChange={setProfessionalPreferences}
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
                  className={`p-4 rounded-lg border-2 transition-all ${
                    !canUseExcel 
                      ? "opacity-50 cursor-not-allowed border-border"
                      : participantMode === "excel" 
                        ? "border-primary bg-primary/5 cursor-pointer" 
                        : "border-border hover:border-primary/50 cursor-pointer"
                  }`}
                  onClick={() => canUseExcel && setParticipantMode("excel")}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                      <FileSpreadsheet className="w-5 h-5 text-accent" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">Solo Excel</p>
                        {!canUseExcel && (
                          <Badge variant="outline" className="text-xs">
                            <Sparkles className="w-3 h-3 mr-1" />
                            Pro
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">Cargar participantes desde un archivo</p>
                    </div>
                    {!canUseExcel && <Lock className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>

                <div
                  className={`p-4 rounded-lg border-2 transition-all ${
                    !canUseExcel 
                      ? "opacity-50 cursor-not-allowed border-border"
                      : participantMode === "both" 
                        ? "border-primary bg-primary/5 cursor-pointer" 
                        : "border-border hover:border-primary/50 cursor-pointer"
                  }`}
                  onClick={() => canUseExcel && setParticipantMode("both")}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">Excel + Manual</p>
                        {!canUseExcel && (
                          <Badge variant="outline" className="text-xs">
                            <Sparkles className="w-3 h-3 mr-1" />
                            Pro
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">Cargar Excel y añadir más manualmente</p>
                    </div>
                    {!canUseExcel && <Lock className="w-4 h-4 text-muted-foreground" />}
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
                  {eventModule === "social" ? (
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• <strong>Nombre y apellidos</strong></li>
                      <li>• <strong>Rango de edad</strong> (18–24, 25–32, 33–40, 41–50, + 50)</li>
                      <li>• <strong>Género</strong> (Hombre, Mujer, No binario, Prefiero no decirlo)</li>
                      <li>• <strong>Rango de edad preferido</strong></li>
                      <li>• <strong>Preferencia</strong> (Amistad y ligue / Solo amistad)</li>
                      <li>• <strong>Preferencia acerca de ligue</strong> (si aplica)</li>
                    </ul>
                  ) : (
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• <strong>Nombre</strong> (persona de contacto)</li>
                      <li>• <strong>Empresa</strong></li>
                      <li>• <strong>Tipo</strong> (Cliente / Proveedor)</li>
                      <li>• <strong>Sector</strong></li>
                      <li>• <strong>Tamaño</strong> (Autónomo, Startup, PYME, etc.)</li>
                      <li>• <strong>Necesidades</strong> (si es cliente, separadas por coma)</li>
                      <li>• <strong>Soluciones</strong> (si es proveedor, separadas por coma)</li>
                      <li>• <strong>Email</strong> y <strong>Teléfono</strong> (opcionales)</li>
                    </ul>
                  )}
                </div>
              )}

              {/* Manual add button */}
              {(participantMode === "manual" || participantMode === "both") && (
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => eventModule === "social" 
                    ? setShowAddModal(true) 
                    : setShowProfessionalAddModal(true)
                  }
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
                          {eventModule === "social" ? (
                            <>
                              <p className="font-medium text-sm">{p.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {p.ageRange} • {p.gender} • {p.preference}
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="font-medium text-sm">{p.companyName || p.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {p.entityType === "client" ? "Cliente" : "Proveedor"} • {p.sector} • {p.name}
                              </p>
                            </>
                          )}
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

        {/* Add Participant Modal (Social) */}
        {showAddModal && (
          <AddParticipantModal
            onClose={() => setShowAddModal(false)}
            onAdd={handleAddParticipant}
            customPreferences={{
              ageRanges: eventPreferences.ageRanges,
              genders: eventPreferences.genders,
              preferences: eventPreferences.preferences,
              datingPreferences: eventPreferences.datingPreferences,
            }}
          />
        )}

        {/* Add Participant Modal (Professional) */}
        {showProfessionalAddModal && (
          <AddProfessionalParticipantModal
            onClose={() => setShowProfessionalAddModal(false)}
            onAdd={handleAddProfessionalParticipant}
            customPreferences={{
              sectors: professionalPreferences.sectors,
              companySizes: professionalPreferences.companySizes,
              predefinedNeeds: professionalPreferences.predefinedNeeds,
              predefinedSolutions: professionalPreferences.predefinedSolutions,
            }}
          />
        )}
      </main>
    </div>
  );
};

export default CreateEvent;
