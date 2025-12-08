import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, CheckCircle2, Loader2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { formatAnonymousName } from "@/lib/utils";

interface Participant {
  id: string;
  name: string;
  phone?: string;
  checked_in: boolean;
}

const ParticipantCheckin = () => {
  const { id: eventId } = useParams();
  const { toast } = useToast();
  
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [eventExists, setEventExists] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!eventId) {
        setEventExists(false);
        setIsLoading(false);
        return;
      }

      // Use secure edge function to get participant names only
      const { data, error } = await supabase.functions.invoke('get-event-participants', {
        body: { eventId, type: 'checkin' }
      });

      if (error || data?.error) {
        console.error('Error loading participants:', error || data?.error);
        setEventExists(false);
        setIsLoading(false);
        return;
      }

      setEventExists(true);
      setParticipants(data.participants || []);
      setIsLoading(false);
    };

    loadData();
  }, [eventId]);

  const handleCheckin = async () => {
    if (!selectedId || !eventId) return;

    setIsSubmitting(true);

    // Use secure edge function to perform check-in
    const { data, error } = await supabase.functions.invoke('checkin-participant', {
      body: { eventId, participantId: selectedId }
    });

    if (error || data?.error) {
      toast({
        title: "Error",
        description: data?.error || "No se pudo realizar el check-in. Inténtalo de nuevo.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    setIsCheckedIn(true);
    setIsSubmitting(false);
    toast({
      title: "¡Check-in completado!",
      description: "Ya estás registrado para el evento",
    });
  };

  const filteredParticipants = participants.filter(p => {
    const displayName = formatAnonymousName(p.name, p.phone);
    return displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           p.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

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

  if (isCheckedIn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center animate-scale-in">
          <CardContent className="pt-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <h2 className="font-display text-xl font-semibold mb-2">¡Check-in completado!</h2>
            <p className="text-muted-foreground mb-4">
              Ya estás registrado. Espera a que comience el evento.
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
            <CardTitle className="font-display text-2xl">Check-in</CardTitle>
            <CardDescription>
              Selecciona tu nombre para confirmar tu asistencia
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar tu nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Participant list */}
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {filteredParticipants.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  {searchTerm ? "No se encontraron participantes" : "No hay participantes pendientes de check-in"}
                </p>
              ) : (
                filteredParticipants.map((participant) => (
                  <button
                    key={participant.id}
                    onClick={() => setSelectedId(participant.id)}
                    className={`w-full p-4 rounded-lg border text-left transition-all ${
                      selectedId === participant.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    }`}
                  >
                    <span className="font-medium">{formatAnonymousName(participant.name, participant.phone)}</span>
                  </button>
                ))
              )}
            </div>

            {/* Confirm button */}
            <Button
              variant="hero"
              className="w-full"
              disabled={!selectedId || isSubmitting}
              onClick={handleCheckin}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Confirmando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirmar Check-in
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ParticipantCheckin;
