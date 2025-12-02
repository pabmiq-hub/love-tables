import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  Participant, 
  AGE_RANGES, 
  PREFERRED_AGE_RANGES, 
  GENDERS, 
  PREFERENCES, 
  DATING_PREFERENCES 
} from "@/lib/excelParser";

const ParticipantJoin = () => {
  const { id: eventId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [name, setName] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [preferredAgeRange, setPreferredAgeRange] = useState("");
  const [preference, setPreference] = useState("");
  const [datingPreference, setDatingPreference] = useState("");
  const [gender, setGender] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [eventExists, setEventExists] = useState(true);

  useEffect(() => {
    // Check if event exists
    const events = JSON.parse(localStorage.getItem("events") || "[]");
    const event = events.find((e: any) => e.id === eventId);
    if (!event) {
      setEventExists(false);
    }
  }, [eventId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !ageRange || !gender || !preferredAgeRange || !preference) {
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
    
    const participant: Participant = {
      id: Math.random().toString(36).substring(2, 11),
      name: name.trim(),
      age: parseInt(ageRange.split('–')[0]) || 0,
      ageRange,
      preferredAgeRange,
      preference,
      gender,
    };
    
    if (preference === "Amistad y ligue" && datingPreference) {
      participant.datingPreference = datingPreference;
    }
    
    // Save to localStorage
    const existingParticipants = JSON.parse(
      localStorage.getItem(`event-${eventId}-participants`) || "[]"
    );
    const newParticipants = [...existingParticipants, participant];
    localStorage.setItem(`event-${eventId}-participants`, JSON.stringify(newParticipants));
    
    // Update event participant count
    const events = JSON.parse(localStorage.getItem("events") || "[]");
    const updatedEvents = events.map((e: any) => 
      e.id === eventId ? { ...e, participants: newParticipants.length } : e
    );
    localStorage.setItem("events", JSON.stringify(updatedEvents));
    
    setIsSubmitted(true);
    toast({
      title: "¡Registrado!",
      description: "Te has unido al evento correctamente",
    });
  };

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
                <Label>Rango de edad preferido *</Label>
                <Select value={preferredAgeRange} onValueChange={setPreferredAgeRange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el rango que buscas" />
                  </SelectTrigger>
                  <SelectContent>
                    {PREFERRED_AGE_RANGES.map((range) => (
                      <SelectItem key={range} value={range}>{range}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              
              <Button type="submit" variant="hero" className="w-full mt-6">
                Unirme al evento
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ParticipantJoin;
