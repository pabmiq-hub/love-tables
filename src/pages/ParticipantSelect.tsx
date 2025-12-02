import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, ArrowLeft, Check, Sparkles, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Participant {
  id: string;
  name: string;
  age_range?: string;
  preferred_age_range?: string;
  preference?: string;
  gender?: string;
}

const ParticipantSelect = () => {
  const { id: eventId } = useParams();
  const [step, setStep] = useState<"identify" | "select" | "done" | "error">("identify");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null);
  const [selectedMatches, setSelectedMatches] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const loadParticipants = async () => {
      if (!eventId) {
        setStep("error");
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("participants")
        .select("id, name, age_range, preferred_age_range, preference, gender")
        .eq("event_id", eventId);

      if (error || !data || data.length === 0) {
        setStep("error");
      } else {
        setParticipants(data);
      }
      setIsLoading(false);
    };

    loadParticipants();
  }, [eventId]);

  const otherParticipants = participants.filter(p => p.id !== selectedParticipant);

  const handleIdentify = () => {
    if (!selectedParticipant) {
      toast({
        title: "Selecciona tu nombre",
        description: "Por favor, selecciona tu nombre de la lista",
        variant: "destructive",
      });
      return;
    }
    setStep("select");
  };

  const toggleMatch = (id: string) => {
    setSelectedMatches(prev => 
      prev.includes(id) 
        ? prev.filter(p => p !== id)
        : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!selectedParticipant || !eventId) return;

    setIsSubmitting(true);

    // Insert all selections
    const selections = selectedMatches.map(selectedId => ({
      event_id: eventId,
      selector_id: selectedParticipant,
      selected_id: selectedId,
    }));

    if (selections.length > 0) {
      const { error } = await supabase
        .from("participant_selections")
        .insert(selections);

      if (error) {
        toast({
          title: "Error",
          description: "No se pudieron guardar las selecciones. Inténtalo de nuevo.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }
    }

    toast({
      title: "¡Gracias por participar!",
      description: "Tus selecciones han sido guardadas. Te notificaremos si hay matches.",
    });
    setIsSubmitting(false);
    setStep("done");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col items-center justify-center p-4">
      <Link 
        to="/" 
        className="absolute top-6 left-6 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver
      </Link>

      {/* Logo */}
      <div className="flex items-center gap-2 mb-8 animate-fade-in">
        <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
          <Heart className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="font-display text-2xl font-bold">SpeedMatch</span>
      </div>

      {/* Error state */}
      {(step === "error" || participants.length === 0) && step !== "done" && (
        <Card className="w-full max-w-md animate-scale-in bg-card/80 backdrop-blur-sm text-center">
          <CardContent className="pt-8 pb-8">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="font-display text-xl font-bold mb-2">Evento no disponible</h2>
            <p className="text-muted-foreground mb-6">
              Este evento no tiene participantes registrados o el enlace es inválido.
            </p>
            <Link to="/">
              <Button variant="outline" className="w-full">
                Volver al inicio
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Step: Identify */}
      {step === "identify" && participants.length > 0 && (
        <Card className="w-full max-w-md animate-scale-in bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">¡Hola! 👋</CardTitle>
            <CardDescription>
              Selecciona tu nombre de la lista para continuar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 max-h-80 overflow-y-auto">
              {participants.map((participant) => (
                <button
                  key={participant.id}
                  onClick={() => setSelectedParticipant(participant.id)}
                  className={`w-full p-4 rounded-lg text-left transition-all ${
                    selectedParticipant === participant.id
                      ? 'bg-primary text-primary-foreground shadow-soft'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  <span className="font-medium">{participant.name}</span>
                </button>
              ))}
            </div>
            <Button variant="hero" className="w-full" onClick={handleIdentify}>
              Continuar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step: Select matches */}
      {step === "select" && (
        <Card className="w-full max-w-md animate-scale-in bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">¿Con quién conectaste?</CardTitle>
            <CardDescription>
              Selecciona a las personas que te gustaría volver a ver
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 max-h-80 overflow-y-auto">
              {otherParticipants.map((person) => (
                <button
                  key={person.id}
                  onClick={() => toggleMatch(person.id)}
                  className={`w-full p-4 rounded-lg text-left transition-all flex items-center justify-between ${
                    selectedMatches.includes(person.id)
                      ? 'bg-primary text-primary-foreground shadow-soft'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  <span className="font-medium">{person.name}</span>
                  {selectedMatches.includes(person.id) && (
                    <Check className="w-5 h-5" />
                  )}
                </button>
              ))}
            </div>
            <p className="text-sm text-center text-muted-foreground">
              Si ambos os seleccionáis mutuamente, ¡es un match! 💕
            </p>
            <Button 
              variant="hero" 
              className="w-full" 
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Heart className="w-4 h-4 mr-2" />
                  Enviar selecciones
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step: Done */}
      {step === "done" && (
        <Card className="w-full max-w-md animate-scale-in bg-card/80 backdrop-blur-sm text-center">
          <CardContent className="pt-8 pb-8">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-10 h-10 text-primary" />
            </div>
            <h2 className="font-display text-2xl font-bold mb-2">¡Listo!</h2>
            <p className="text-muted-foreground mb-6">
              Tus selecciones han sido guardadas. Si hay matches mutuos, te lo haremos saber pronto.
            </p>
            <Link to="/">
              <Button variant="outline" className="w-full">
                Volver al inicio
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ParticipantSelect;
