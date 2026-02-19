import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CheckCircle2, Loader2, Heart, AlertCircle, Mail, Users, Clock } from "lucide-react";
import konektumLogo from "@/assets/konektum-logo.png";
import { useToast } from "@/hooks/use-toast";
import MultiSelectAge from "@/components/ui/multi-select-age";
import { supabase } from "@/integrations/supabase/client";
import { 
  AGE_RANGES, 
  GENDERS, 
  PREFERENCES, 
  DATING_PREFERENCES 
} from "@/lib/excelParser";

interface SlotQuota {
  gender: string;
  ageRange: string;
  maxSlots: number;
}

interface QuotaStatus {
  gender: string;
  ageRange: string;
  current: number;
  max: number;
  available: number;
}

const ParticipantJoin = () => {
  const { id: eventId } = useParams();
  const { toast } = useToast();
  
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [selectedAgeRanges, setSelectedAgeRanges] = useState<string[]>([]);
  const [preference, setPreference] = useState("");
  const [datingPreference, setDatingPreference] = useState("");
  const [gender, setGender] = useState("");
  const [isReturningParticipant, setIsReturningParticipant] = useState<string>("");
  
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [autoCheckedIn, setAutoCheckedIn] = useState(false);
  const [verificationCode, setVerificationCode] = useState<string | null>(null);
  
  const [eventExists, setEventExists] = useState<boolean | null>(null);
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Event preferences (custom or default)
  const [eventAgeRanges, setEventAgeRanges] = useState<string[]>([...AGE_RANGES]);
  const [eventGenders, setEventGenders] = useState<string[]>([...GENDERS]);
  const [eventPreferences, setEventPreferences] = useState<string[]>([...PREFERENCES]);
  const [eventDatingPreferences, setEventDatingPreferences] = useState<string[]>([...DATING_PREFERENCES]);

  // Filter dating preferences based on selected gender
  const getFilteredDatingPreferences = (selectedGender: string, allPrefs: string[]): string[] => {
    if (!selectedGender) return allPrefs;
    const genderNorm = selectedGender.toLowerCase();
    return allPrefs.filter(pref => {
      const prefLower = pref.toLowerCase();
      if (prefLower.startsWith("soy un hombre")) return genderNorm === "hombre";
      if (prefLower.startsWith("soy una mujer")) return genderNorm === "mujer";
      if (prefLower === "no binario") return genderNorm === "no binario" || genderNorm === "prefiero no decirlo";
      return true;
    });
  };

  const filteredDatingPreferences = getFilteredDatingPreferences(gender, eventDatingPreferences);
  
  // Quota system
  const [quotasEnabled, setQuotasEnabled] = useState(false);
  const [slotQuotas, setSlotQuotas] = useState<SlotQuota[]>([]);
  const [quotaStatuses, setQuotaStatuses] = useState<QuotaStatus[]>([]);
  const [calculatedAgeRange, setCalculatedAgeRange] = useState<string>("");

  useEffect(() => {
    const checkEvent = async () => {
      if (!eventId) {
        setEventExists(false);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("events")
        .select("id, name, date, status, custom_age_ranges, custom_genders, custom_preferences, custom_dating_preferences, registration_requirements_enabled, slot_quotas")
        .eq("id", eventId)
        .single();

      if (error || !data) {
        setEventExists(false);
        setIsLoading(false);
        return;
      }

      if (data.status !== 'pending') {
        setEventExists(false);
        setIsLoading(false);
        return;
      }

      setEventExists(true);
      setEventName(data.name);
      setEventDate(new Date(data.date));
      
      // Load custom preferences if they exist
      if (data.custom_age_ranges && Array.isArray(data.custom_age_ranges)) {
        setEventAgeRanges(data.custom_age_ranges as string[]);
      }
      if (data.custom_genders && Array.isArray(data.custom_genders)) {
        setEventGenders(data.custom_genders as string[]);
      }
      if (data.custom_preferences && Array.isArray(data.custom_preferences)) {
        setEventPreferences(data.custom_preferences as string[]);
      }
      if (data.custom_dating_preferences && Array.isArray(data.custom_dating_preferences)) {
        setEventDatingPreferences(data.custom_dating_preferences as string[]);
      }
      
      // Load quota configuration and current counts
      if (data.registration_requirements_enabled && data.slot_quotas) {
        setQuotasEnabled(true);
        const quotas = data.slot_quotas as unknown as SlotQuota[];
        setSlotQuotas(quotas);
        
        // Load current counts for ALL quotas upfront
        await loadAllQuotaCounts(eventId, quotas);
      }
      
      setIsLoading(false);
    };

    checkEvent();
  }, [eventId]);

  // Load ALL quota counts upfront to display before form
  const loadAllQuotaCounts = async (eventId: string, quotas: SlotQuota[]) => {
    const statuses: QuotaStatus[] = [];
    
    for (const quota of quotas) {
      const { count } = await supabase
        .from('participants')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('gender', quota.gender)
        .eq('age_range', quota.ageRange);
      
      const current = count || 0;
      statuses.push({
        gender: quota.gender,
        ageRange: quota.ageRange,
        current,
        max: quota.maxSlots,
        available: quota.maxSlots - current
      });
    }
    
    setQuotaStatuses(statuses);
  };

  // Calculate age range from birth date
  const calculateAgeRange = (dateString: string): string => {
    if (!dateString) return "";
    
    const today = new Date();
    const birth = new Date(dateString);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    // Find matching age range
    for (const range of eventAgeRanges) {
      // Handle "+" formats: "41+", "+ 50", "50+"
      if (range.includes('+')) {
        const num = parseInt(range.replace(/[^0-9]/g, ''));
        if (!isNaN(num) && age >= num) return range;
        continue;
      }
      // Handle "18-24" or "18–24" formats
      const parts = range.replace(/–/g, '-').split('-').map(n => parseInt(n.trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && age >= parts[0] && age <= parts[1]) {
        return range;
      }
    }
    
    return "Otro";
  };

  // Update calculated age range when birth date changes
  useEffect(() => {
    if (birthDate) {
      const range = calculateAgeRange(birthDate);
      setCalculatedAgeRange(range);
    } else {
      setCalculatedAgeRange("");
    }
  }, [birthDate, eventAgeRanges]);

  // Check if current selection has available slots
  const getAvailableSlots = (): { available: boolean; remaining: number; total: number } | null => {
    if (!quotasEnabled || !gender || !calculatedAgeRange) return null;
    
    const status = quotaStatuses.find(q => q.gender === gender && q.ageRange === calculatedAgeRange);
    if (!status) return null;
    
    return { available: status.available > 0, remaining: status.available, total: status.max };
  };

  // Computed preferred age ranges (event age ranges + "Cualquier rango de edad")
  const preferredAgeRanges = [...eventAgeRanges, "Cualquier rango de edad"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !email.trim() || !birthDate || !gender || selectedAgeRanges.length === 0 || !preference || !isReturningParticipant) {
      toast({
        title: "Error",
        description: "Por favor, completa todos los campos obligatorios",
        variant: "destructive",
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast({
        title: "Error",
        description: "Por favor, introduce un email válido",
        variant: "destructive",
      });
      return;
    }

    // Validate age (18+)
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    if (age < 18) {
      toast({
        title: "Error",
        description: "Debes ser mayor de 18 años para participar",
        variant: "destructive",
      });
      return;
    }
    
    if (preference === "Amistad y ligue" && !datingPreference) {
      toast({
        title: "Error",
        description: "Por favor, selecciona tu preferencia acerca de ligue",
        variant: "destructive",
      });
      return;
    }

    // Check quota availability
    const slots = getAvailableSlots();
    if (slots && !slots.available) {
      toast({
        title: "Sin plazas disponibles",
        description: "No hay plazas disponibles para tu perfil en este momento",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    const preferredAgeRange = selectedAgeRanges.join(', ');
    
    // Use secure edge function for registration
    const { data, error } = await supabase.functions.invoke('register-participant', {
      body: {
        eventId,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        gender,
        birthDate,
        datingPreference: preference === "Amistad y ligue" ? datingPreference : null,
        preferredAgeRange,
        isReturningParticipant: isReturningParticipant === "yes"
      }
    });

    if (error || data?.error) {
      toast({
        title: "Error",
        description: data?.error || "No se pudo registrar. Inténtalo de nuevo.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    // Send confirmation email (different depending on auto check-in)
    const baseUrl = window.location.origin;
    if (data.autoCheckedIn && data.verificationCode) {
      // Auto check-in: send email with code
      await supabase.functions.invoke('send-checkin-code', {
        body: {
          participantId: data.participantId,
          eventId,
          baseUrl
        }
      });
      setVerificationCode(data.verificationCode);
    } else {
      // Normal registration: send confirmation email without code
      await supabase.functions.invoke('send-registration-confirmation', {
        body: {
          participantId: data.participantId,
          eventId
        }
      });
    }

    setAutoCheckedIn(data.autoCheckedIn);
    setIsSubmitted(true);
    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!eventExists) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="font-display text-xl font-semibold mb-2">Evento no disponible</h2>
            <p className="text-muted-foreground">
              Este evento no existe o las inscripciones están cerradas.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center animate-scale-in">
          <CardContent className="pt-6 space-y-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            
            <div>
              <h2 className="font-display text-xl font-semibold mb-2">¡Registro completado!</h2>
              <p className="text-muted-foreground">
                Hemos enviado un email a <strong>{email}</strong> con la confirmación de tu registro.
              </p>
            </div>

            {autoCheckedIn && verificationCode ? (
              // Auto check-in: show code
              <>
                <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg p-3 flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                  <p className="text-sm text-green-700 dark:text-green-400 text-left">
                    Se ha realizado el <strong>check-in automático</strong> porque el evento está próximo a comenzar.
                  </p>
                </div>

                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-center gap-2 text-sm">
                    <span>Tu código personal de acceso:</span>
                  </div>
                  <div className="text-3xl font-mono font-bold tracking-widest text-primary">
                    {verificationCode}
                  </div>
                </div>

                <div className="text-left space-y-2 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">Con este código podrás:</p>
                  <ul className="space-y-1 ml-4">
                    <li>🪑 Ver en qué mesas estás asignado/a</li>
                    <li>💕 Enviar tus selecciones después del evento</li>
                  </ul>
                </div>

                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <p className="text-sm text-amber-700 dark:text-amber-400 text-left">
                    <strong>Importante:</strong> Guarda este código, lo necesitarás para participar.
                  </p>
                </div>
              </>
            ) : (
              // Normal registration: no code yet
              <>
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div className="text-5xl mb-2">🎉</div>
                  <p className="text-foreground font-medium">¡Ya tienes tu plaza reservada!</p>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-4 text-left">
                  <p className="font-medium text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    ¿Qué pasará el día del evento?
                  </p>
                  <ol className="text-sm text-blue-700 dark:text-blue-400 space-y-2 ml-4 list-decimal">
                    <li>Cuando llegues, el organizador hará tu <strong>check-in</strong></li>
                    <li>Recibirás un <strong>código de 6 dígitos</strong> por email</li>
                    <li>Con ese código podrás ver tus mesas y enviar tus selecciones</li>
                  </ol>
                </div>
              </>
            )}

            <div className="flex items-center justify-center gap-2 pt-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Revisa tu email para más detalles</span>
            </div>
            
            <img src={konektumLogo} alt="Konektum" className="h-10 w-auto mx-auto" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const slots = getAvailableSlots();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-center">
          <img src={konektumLogo} alt="Konektum" className="h-10 w-auto" />
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8 max-w-md">
        {/* Show quota availability BEFORE the form */}
        {quotasEnabled && quotaStatuses.length > 0 && (
          <Card className="mb-6 animate-fade-in">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5" />
                Plazas disponibles
              </CardTitle>
              <CardDescription>
                Consulta las plazas restantes antes de registrarte
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                {quotaStatuses.map((status, idx) => (
                  <div 
                    key={idx} 
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      status.available > 0 
                        ? 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800' 
                        : 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800'
                    }`}
                  >
                    <span className="text-sm font-medium">
                      {status.gender} ({status.ageRange})
                    </span>
                    <span className={`text-sm font-bold ${
                      status.available > 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
                    }`}>
                      {status.available > 0 ? `${status.available} de ${status.max}` : 'Completo'}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="animate-fade-in">
          <CardHeader className="text-center">
            <CardTitle className="font-display text-2xl">Únete a {eventName}</CardTitle>
            <CardDescription>
              Completa tus datos para participar en el speed dating
              {eventDate && (
                <span className="block mt-1 text-primary font-medium">
                  📅 {eventDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre y apellidos *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: María García López"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ej: tu@email.com"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Recibirás la confirmación y tu código de acceso en este email
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono de contacto (opcional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ej: +34 612 345 678"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="birthDate">Fecha de nacimiento *</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                  required
                />
                {calculatedAgeRange && (
                  <p className="text-xs text-muted-foreground">
                    Tu rango de edad: <span className="font-medium text-foreground">{calculatedAgeRange}</span>
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
              <Label>Género *</Label>
                <Select value={gender} onValueChange={(val) => {
                  setGender(val);
                  // Reset dating preference if it's no longer valid for the new gender
                  if (datingPreference) {
                    const newFiltered = getFilteredDatingPreferences(val, eventDatingPreferences);
                    if (!newFiltered.includes(datingPreference)) {
                      setDatingPreference("");
                    }
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tu género" />
                  </SelectTrigger>
                  <SelectContent>
                    {eventGenders.map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Show quota availability for selected profile */}
              {quotasEnabled && gender && calculatedAgeRange && slots && (
                <div className={`rounded-lg p-3 flex items-start gap-2 ${
                  slots.available 
                    ? 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900'
                    : 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900'
                }`}>
                  {slots.available ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                      <p className="text-sm text-green-700 dark:text-green-400">
                        Quedan <strong>{slots.remaining}</strong> de {slots.total} plazas para {gender} ({calculatedAgeRange})
                      </p>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                      <p className="text-sm text-red-700 dark:text-red-400">
                        No hay plazas disponibles para {gender} ({calculatedAgeRange})
                      </p>
                    </>
                  )}
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Rango de edad preferido * (puedes seleccionar varios)</Label>
                <MultiSelectAge
                  options={preferredAgeRanges}
                  selected={selectedAgeRanges}
                  onChange={setSelectedAgeRanges}
                  placeholder="Selecciona los rangos que buscas"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Preferencia *</Label>
                <Select value={preference} onValueChange={setPreference}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tu preferencia" />
                  </SelectTrigger>
                  <SelectContent>
                    {eventPreferences.map((pref) => (
                      <SelectItem key={pref} value={pref}>{pref}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {preference === "Amistad y ligue" && (
                <div className="space-y-2 animate-fade-in">
                  <Label>Preferencia acerca de ligue *</Label>
                  <Select value={datingPreference} onValueChange={setDatingPreference}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona tu preferencia" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredDatingPreferences.map((pref) => (
                        <SelectItem key={pref} value={pref}>{pref}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-3">
                <Label>¿Has participado antes en alguno de nuestros eventos? *</Label>
                <RadioGroup value={isReturningParticipant} onValueChange={setIsReturningParticipant}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="returning-yes" />
                    <Label htmlFor="returning-yes" className="font-normal cursor-pointer">Sí, ya he participado antes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="returning-no" />
                    <Label htmlFor="returning-no" className="font-normal cursor-pointer">No, es mi primera vez</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <Button 
                type="submit" 
                variant="hero" 
                className="w-full mt-6" 
                disabled={isSubmitting || (slots && !slots.available)}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  "Unirme al evento"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ParticipantJoin;
