import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, ArrowLeft, Sparkles, AlertCircle, Loader2, Users, Smile } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";

interface Participant {
  id: string;
  name: string;
  preference?: string;
}

interface MatchSelection {
  participantId: string;
  friendship: boolean;
  dating: boolean;
  canShowDating: boolean; // Whether to show dating option based on both participants' preferences
}

interface TableData {
  round: number;
  tables: { id: string; name: string }[][];
}

const ParticipantSelect = () => {
  const { id: eventId } = useParams();
  const [step, setStep] = useState<"identify" | "select" | "done" | "error">("identify");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [availableParticipants, setAvailableParticipants] = useState<Participant[]>([]);
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null);
  const [matchSelections, setMatchSelections] = useState<MatchSelection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUserPreference, setCurrentUserPreference] = useState<string | null>(null);
  const [tablesData, setTablesData] = useState<TableData[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      if (!eventId) {
        setStep("error");
        setIsLoading(false);
        return;
      }

      // Use secure edge function to get participant data (names and preferences only)
      const { data, error } = await supabase.functions.invoke('get-event-participants', {
        body: { eventId, type: 'select' }
      });

      if (error || data?.error || !data?.participants || data.participants.length === 0) {
        console.error('Error loading participants:', error || data?.error);
        setStep("error");
        setIsLoading(false);
        return;
      }

      const participantsData = data.participants;
      const submittedIds = new Set(data.submittedIds || []);
      const tables = data.tables || [];

      // Filter out participants who have already submitted
      const available = participantsData.filter((p: Participant) => !submittedIds.has(p.id));

      setParticipants(participantsData);
      setAvailableParticipants(available);
      setTablesData(tables);
      setIsLoading(false);
    };

    loadData();
  }, [eventId]);

  // Find participants who sat at the same table as the selected participant
  const getTablemates = (participantId: string): Set<string> => {
    const tablemates = new Set<string>();
    
    tablesData.forEach(round => {
      round.tables.forEach(table => {
        const participantAtTable = table.some(p => p.id === participantId);
        if (participantAtTable) {
          table.forEach(p => {
            if (p.id !== participantId) {
              tablemates.add(p.id);
            }
          });
        }
      });
    });
    
    return tablemates;
  };

  // Filter participants to only show tablemates (people who sat at the same table)
  const getFilteredParticipants = (): Participant[] => {
    if (!selectedParticipant) return [];
    
    const tablemates = getTablemates(selectedParticipant);
    
    // If no tables data, fall back to all participants
    if (tablemates.size === 0 && tablesData.length === 0) {
      return participants.filter(p => p.id !== selectedParticipant);
    }
    
    return participants.filter(p => tablemates.has(p.id));
  };

  const handleIdentify = () => {
    if (!selectedParticipant) {
      toast({
        title: "Selecciona tu nombre",
        description: "Por favor, selecciona tu nombre de la lista",
        variant: "destructive",
      });
      return;
    }
    
    // Set current user's preference
    const currentUser = participants.find(p => p.id === selectedParticipant);
    const userPreference = currentUser?.preference || null;
    setCurrentUserPreference(userPreference);
    
    // Get tablemates only
    const tablemates = getFilteredParticipants();
    const userInterestedInDating = userPreference?.toLowerCase().includes('sentimental') || 
                                    userPreference?.toLowerCase().includes('pareja');
    
    // Initialize match selections for tablemates only
    setMatchSelections(tablemates.map(p => {
      // Check if both participants are interested in dating
      const otherInterestedInDating = p.preference?.toLowerCase().includes('sentimental') || 
                                       p.preference?.toLowerCase().includes('pareja');
      const canShowDating = userInterestedInDating && otherInterestedInDating;
      
      return {
        participantId: p.id,
        friendship: false,
        dating: false,
        canShowDating: canShowDating || false,
      };
    }));
    
    setStep("select");
  };

  const toggleSelection = (participantId: string, type: 'friendship' | 'dating') => {
    setMatchSelections(prev => 
      prev.map(ms => 
        ms.participantId === participantId
          ? { ...ms, [type]: !ms[type] }
          : ms
      )
    );
  };

  // Get only tablemates for display
  const tablematesForSelection = getFilteredParticipants();

  const handleSubmit = async () => {
    if (!selectedParticipant || !eventId) return;

    setIsSubmitting(true);

    // Filter selections where at least one option is selected
    const activeSelections = matchSelections.filter(ms => ms.friendship || ms.dating);

    // Create selection records with selection_type
    const selections = activeSelections.map(ms => {
      let selectionType = 'friendship';
      if (ms.friendship && ms.dating) {
        selectionType = 'both';
      } else if (ms.dating) {
        selectionType = 'dating';
      }
      
      return {
        selected_id: ms.participantId,
        selection_type: selectionType,
      };
    });

    // Use secure edge function to submit selections
    const { data, error } = await supabase.functions.invoke('submit-selections', {
      body: { 
        eventId, 
        selectorId: selectedParticipant, 
        selections 
      }
    });

    if (error || data?.error) {
      console.error('Error saving selections:', error || data?.error);
      toast({
        title: "Error",
        description: data?.error || "No se pudieron guardar las selecciones. Es posible que ya hayas enviado tus selecciones.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    toast({
      title: "¡Gracias por participar!",
      description: "Tus selecciones han sido guardadas. Te notificaremos si hay matches.",
    });
    setIsSubmitting(false);
    setStep("done");
  };

  const getSelectionState = (participantId: string): MatchSelection => {
    return matchSelections.find(ms => ms.participantId === participantId) || { 
      participantId, 
      friendship: false, 
      dating: false, 
      canShowDating: false 
    };
  };

  const hasAnySelection = (participantId: string) => {
    const state = getSelectionState(participantId);
    return state.friendship || state.dating;
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
            {availableParticipants.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">
                  Todos los participantes ya han enviado sus selecciones.
                </p>
              </div>
            ) : (
              <>
                <div className="grid gap-2 max-h-80 overflow-y-auto">
                  {availableParticipants.map((participant) => (
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
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step: Select matches */}
      {step === "select" && (
        <Card className="w-full max-w-md animate-scale-in bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">¿Con quién conectaste?</CardTitle>
            <CardDescription>
              Selecciona a las personas con las que coincidiste y el tipo de conexión
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {tablematesForSelection.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  No se encontraron participantes con los que coincidiste en las mesas.
                </p>
              </div>
            ) : (
            <div className="grid gap-3 max-h-96 overflow-y-auto">
              {tablematesForSelection.map((person) => {
                const selectionState = getSelectionState(person.id);
                const isSelected = hasAnySelection(person.id);
                
                return (
                  <div
                    key={person.id}
                    className={`p-4 rounded-lg transition-all ${
                      isSelected
                        ? 'bg-primary/10 border-2 border-primary shadow-soft'
                        : 'bg-muted hover:bg-muted/80 border-2 border-transparent'
                    }`}
                  >
                    <div className="font-medium mb-3">{person.name}</div>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={selectionState.friendship}
                          onCheckedChange={() => toggleSelection(person.id, 'friendship')}
                        />
                        <span className="text-sm flex items-center gap-1">
                          <Smile className="w-4 h-4" /> Amistad
                        </span>
                      </label>
                      {selectionState.canShowDating && (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={selectionState.dating}
                            onCheckedChange={() => toggleSelection(person.id, 'dating')}
                          />
                          <span className="text-sm flex items-center gap-1">
                            <Heart className="w-4 h-4" /> Ligue
                          </span>
                        </label>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            )}
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
