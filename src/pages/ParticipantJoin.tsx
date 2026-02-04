import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CheckCircle2, Loader2, Heart, AlertCircle, Mail, KeyRound } from "lucide-react";
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
  const [verificationCode, setVerificationCode] = useState("");
  const [autoCheckedIn, setAutoCheckedIn] = useState(false);
  
  const [eventExists, setEventExists] = useState<boolean | null>(null);
  const [eventName, setEventName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Event preferences (custom or default)
  const [eventAgeRanges, setEventAgeRanges] = useState<string[]>([...AGE_RANGES]);
  const [eventGenders, setEventGenders] = useState<string[]>([...GENDERS]);
  const [eventPreferences, setEventPreferences] = useState<string[]>([...PREFERENCES]);
  const [eventDatingPreferences, setEventDatingPreferences] = useState<string[]>([...DATING_PREFERENCES]);
  
  // Quota system
  const [quotasEnabled, setQuotasEnabled] = useState(false);
  const [slotQuotas, setSlotQuotas] = useState<SlotQuota[]>([]);
  const [currentCounts, setCurrentCounts] = useState<Record<string, number>>({});
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
        .select("id, name, status, custom_age_ranges, custom_genders, custom_preferences, custom_dating_preferences, registration_requirements_enabled, slot_quotas")
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
      
      // Load quota configuration
      if (data.registration_requirements_enabled && data.slot_quotas) {
        setQuotasEnabled(true);
        const quotas = data.slot_quotas as unknown as SlotQuota[];
        setSlotQuotas(quotas);
        
        // Load current counts for each quota
        await loadCurrentCounts(eventId, quotas);
      }
      
      setIsLoading(false);
    };

    checkEvent();
  }, [eventId]);

  // Load current registration counts for quotas
  const loadCurrentCounts = async (eventId: string, quotas: SlotQuota[]) => {
    const counts: Record<string, number> = {};
    
    for (const quota of quotas) {
      const { count } = await supabase
        .from('participants')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('gender', quota.gender)
        .eq('age_range', quota.ageRange);
      
      counts[`${quota.gender}-${quota.ageRange}`] = count || 0;
    }
    
    setCurrentCounts(counts);
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
      // Parse range like "25-32" or "51+"
      const match = range.match(/(\d+)[-–]?(\d+)?/);
      if (match) {
        const min = parseInt(match[1]);
        const max = match[2] ? parseInt(match[2]) : 100;
        
        if (age >= min && age <= max) {
          return range;
        }
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
    
    const quota = slotQuotas.find(q => q.gender === gender && q.ageRange === calculatedAgeRange);
    if (!quota) return null;
    
    const current = currentCounts[`${gender}-${calculatedAgeRange}`] || 0;
    const remaining = quota.maxSlots - current;
    
    return { available: remaining > 0, remaining, total: quota.maxSlots };
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

    // Send verification email
    const baseUrl = window.location.origin;
    await supabase.functions.invoke('send-verification-email', {
      body: {
        participantId: data.participantId,
        eventId,
        baseUrl
      }
    });

    setVerificationCode(data.verificationCode);
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
                Hemos enviado un email a <strong>{email}</strong> con tu código personal de verificación.
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <KeyRound className="w-4 h-4 text-primary" />
                <span>Tu código personal:</span>
              </div>
              <div className="text-3xl font-mono font-bold tracking-widest text-primary">
                {verificationCode}
              </div>
            </div>

            {autoCheckedIn && (
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg p-3 flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                <p className="text-sm text-green-700 dark:text-green-400 text-left">
                  Se ha realizado el check-in automáticamente porque el evento está próximo a comenzar.
                </p>
              </div>
            )}

            <div className="text-left space-y-2 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Con este código podrás:</p>
              <ul className="space-y-1 ml-4">
                <li>✅ Hacer check-in cuando llegues al evento</li>
                <li>🪑 Ver en qué mesas estás asignado/a</li>
                <li>💕 Enviar tus selecciones después del evento</li>
              </ul>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
              <p className="text-sm text-amber-700 dark:text-amber-400 text-left">
                <strong>Importante:</strong> Guarda este código, lo necesitarás para participar en el evento.
              </p>
            </div>

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
        <Card className="animate-fade-in">
          <CardHeader className="text-center">
            <CardTitle className="font-display text-2xl">Únete al evento</CardTitle>
            <CardDescription>
              Completa tus datos para participar en el speed dating
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
                  Recibirás tu código de acceso en este email
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
                <Select value={gender} onValueChange={setGender}>
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

              {/* Show quota availability */}
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
                      {eventDatingPreferences.map((pref) => (
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
