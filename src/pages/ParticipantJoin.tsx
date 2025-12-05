import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import MultiSelectAge from "@/components/ui/multi-select-age";
import { supabase } from "@/integrations/supabase/client";
import { 
  AGE_RANGES, 
  PREFERRED_AGE_RANGES, 
  GENDERS, 
  PREFERENCES, 
  DATING_PREFERENCES 
} from "@/lib/excelParser";

const ParticipantJoin = () => {
  const { id: eventId } = useParams();
  const { toast } = useToast();
  
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [selectedAgeRanges, setSelectedAgeRanges] = useState<string[]>([]);
  const [preference, setPreference] = useState("");
  const [datingPreference, setDatingPreference] = useState("");
  const [gender, setGender] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [eventExists, setEventExists] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const checkEvent = async () => {
      if (!eventId) {
        setEventExists(false);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("events")
        .select("id")
        .eq("id", eventId)
        .single();

      setEventExists(!error && !!data);
      setIsLoading(false);
    };

    checkEvent();
  }, [eventId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !ageRange || !gender || selectedAgeRanges.length === 0 || !preference) {
      toast({
        title: "Error",
        description: "Por favor, completa todos los campos obligatorios",
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

    setIsSubmitting(true);

    const preferredAgeRange = selectedAgeRanges.join(', ');
    
    // Auto check-in when registering via QR
    const { error } = await supabase.from("participants").insert({
      event_id: eventId,
      name: name.trim(),
      phone: phone.trim() || null,
      age: parseInt(ageRange.split('–')[0]) || null,
      age_range: ageRange,
      preferred_age_range: preferredAgeRange,
      preference,
      dating_preference: preference === "Amistad y ligue" ? datingPreference : null,
      gender,
      checked_in: true, // Auto check-in
    });

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo registrar. Inténtalo de nuevo.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    // Update participant count
    const { data: eventData } = await supabase
      .from("events")
      .select("participants_count")
      .eq("id", eventId)
      .single();
    
    if (eventData) {
      await supabase
        .from("events")
        .update({ participants_count: (eventData.participants_count || 0) + 1 })
        .eq("id", eventId);
    }
    
    setIsSubmitted(true);
    setIsSubmitting(false);
    toast({
      title: "¡Registrado!",
      description: "Te has unido al evento correctamente",
    });
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
            <h2 className="font-display text-xl font-semibold mb-2">Evento no encontrado</h2>
            <p className="text-muted-foreground">
              Este evento no existe o ha sido eliminado.
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
          <CardContent className="pt-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <h2 className="font-display text-xl font-semibold mb-2">¡Te has unido al evento!</h2>
            <p className="text-muted-foreground mb-4">
              Gracias por registrarte. Nos vemos en el evento.
            </p>
            <div className="flex items-center justify-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Heart className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-display text-xl font-bold">SpeedMatch</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Heart className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold">SpeedMatch</span>
          </div>
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
                <Label htmlFor="phone">Teléfono de contacto</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ej: +34 612 345 678"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Rango de edad *</Label>
                <Select value={ageRange} onValueChange={setAgeRange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tu rango de edad" />
                  </SelectTrigger>
                  <SelectContent>
                    {AGE_RANGES.map((range) => (
                      <SelectItem key={range} value={range}>{range}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Género *</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tu género" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDERS.map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Rango de edad preferido * (puedes seleccionar varios)</Label>
                <MultiSelectAge
                  options={PREFERRED_AGE_RANGES}
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
                    {PREFERENCES.map((pref) => (
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
                      {DATING_PREFERENCES.map((pref) => (
                        <SelectItem key={pref} value={pref}>{pref}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <Button type="submit" variant="hero" className="w-full mt-6" disabled={isSubmitting}>
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
