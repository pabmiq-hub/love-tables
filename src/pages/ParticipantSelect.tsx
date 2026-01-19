import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Sparkles, AlertCircle, Loader2, Users, Smile, CheckCircle, Clock, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { formatAnonymousName } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import konektumLogo from "@/assets/konektum-logo.png";

interface Participant {
  id: string;
  name: string;
  phone?: string;
  preference?: string;
  dating_preference?: string;
}

interface MatchSelection {
  participantId: string;
  friendship: boolean;
  dating: boolean;
  canShowDating: boolean;
  alreadySelected: boolean; // Whether already selected in a previous round
  previousSelectionType?: string;
}

interface TableData {
  round: number;
  tables: { id: string; name: string }[][];
}

interface ExistingSelection {
  selector_id: string;
  selected_id: string;
  selection_type: string;
}

const ParticipantSelect = () => {
  const { id: eventId } = useParams();
  const [step, setStep] = useState<"identify" | "select" | "done" | "error" | "not_started" | "completed">("identify");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [availableParticipants, setAvailableParticipants] = useState<Participant[]>([]);
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null);
  const [matchSelections, setMatchSelections] = useState<MatchSelection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUserPreference, setCurrentUserPreference] = useState<string | null>(null);
  const [tablesData, setTablesData] = useState<TableData[]>([]);
  const [existingSelections, setExistingSelections] = useState<ExistingSelection[]>([]);
  const [eventStatus, setEventStatus] = useState<string>("");
  const [currentRound, setCurrentRound] = useState<number>(0);
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      if (!eventId) {
        setStep("error");
        setIsLoading(false);
        return;
      }

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
      const tables = data.tables || [];
      const allExistingSelections = data.existingSelections || [];
      const status = data.eventStatus || 'pending';
      const round = data.currentRound || 0;

      setParticipants(participantsData);
      setAvailableParticipants(participantsData);
      setTablesData(tables);
      setExistingSelections(allExistingSelections);
      setEventStatus(status);
      setCurrentRound(round);
      
      // Check event status
      if (status === 'completed') {
        setStep("completed");
      } else if (status === 'pending' || round === 0) {
        setStep("not_started");
      }
      
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

  // Filter participants to only show tablemates
  const getFilteredParticipants = (): Participant[] => {
    if (!selectedParticipant) return [];
    
    const tablemates = getTablemates(selectedParticipant);
    
    // If no tables data, fall back to all participants
    if (tablemates.size === 0 && tablesData.length === 0) {
      return participants.filter(p => p.id !== selectedParticipant);
    }
    
    return participants.filter(p => tablemates.has(p.id));
  };

  // Get user's existing selections
  const getUserExistingSelections = (): Map<string, string> => {
    const userSelections = new Map<string, string>();
    if (!selectedParticipant) return userSelections;
    
    existingSelections
      .filter(s => s.selector_id === selectedParticipant)
      .forEach(s => {
        userSelections.set(s.selected_id, s.selection_type);
      });
    
    return userSelections;
  };

  // Check if two dating preferences are compatible
  const areDatingPreferencesCompatible = (pref1?: string | null, pref2?: string | null): boolean => {
    if (!pref1 || !pref2) return true;
    
    const p1 = pref1.toLowerCase();
    const p2 = pref2.toLowerCase();
    
    if (p1.includes('abierto a todo') || p2.includes('abierto a todo')) return true;
    if (p1.includes('no binario') || p2.includes('no binario')) return true;
    if (p1.includes('prefiero no contestar') || p2.includes('prefiero no contestar')) return true;
    
    const isManSeekingWoman = (p: string) => p.includes('hombre') && p.includes('busco una mujer');
    const isManSeekingMan = (p: string) => p.includes('hombre') && p.includes('busco un hombre');
    const isWomanSeekingMan = (p: string) => p.includes('mujer') && p.includes('busco un hombre');
    const isWomanSeekingWoman = (p: string) => p.includes('mujer') && p.includes('busco una mujer');
    
    if (isManSeekingWoman(p1) && isWomanSeekingMan(p2)) return true;
    if (isWomanSeekingMan(p1) && isManSeekingWoman(p2)) return true;
    if (isManSeekingMan(p1) && isManSeekingMan(p2)) return true;
    if (isWomanSeekingWoman(p1) && isWomanSeekingWoman(p2)) return true;
    
    return false;
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
    
    const currentUser = participants.find(p => p.id === selectedParticipant);
    const userPreference = currentUser?.preference || null;
    setCurrentUserPreference(userPreference);
    
    const tablemates = getFilteredParticipants();
    const userExistingSelections = getUserExistingSelections();
    
    const userInterestedInDating = userPreference?.toLowerCase().includes('sentimental') || 
                                   userPreference?.toLowerCase().includes('pareja') ||
                                   userPreference?.toLowerCase().includes('ligue');
    
    setMatchSelections(tablemates.map(p => {
      const targetPreference = p.preference?.toLowerCase() || '';
      const targetInterestedInDating = targetPreference.includes('sentimental') || 
                                        targetPreference.includes('pareja') ||
                                        targetPreference.includes('ligue');
      
      const existingSelection = userExistingSelections.get(p.id);
      const alreadySelected = !!existingSelection;
      
      return {
        participantId: p.id,
        friendship: false,
        dating: false,
        canShowDating: userInterestedInDating && targetInterestedInDating,
        alreadySelected,
        previousSelectionType: existingSelection,
      };
    }));
    
    setStep("select");
  };

  const toggleSelection = (participantId: string, type: 'friendship' | 'dating') => {
    setMatchSelections(prev => 
      prev.map(ms => 
        ms.participantId === participantId && !ms.alreadySelected
          ? { ...ms, [type]: !ms[type] }
          : ms
      )
    );
  };

  const tablematesForSelection = getFilteredParticipants();
  const newSelectionsCount = matchSelections.filter(ms => !ms.alreadySelected && (ms.friendship || ms.dating)).length;
  const alreadySelectedCount = matchSelections.filter(ms => ms.alreadySelected).length;

  const handleSubmit = async () => {
    if (!selectedParticipant || !eventId) return;

    setIsSubmitting(true);

    // Filter only NEW selections where at least one option is selected
    const activeSelections = matchSelections.filter(ms => !ms.alreadySelected && (ms.friendship || ms.dating));

    if (activeSelections.length === 0) {
      toast({
        title: "Sin nuevas selecciones",
        description: "No has seleccionado ningún compañero nuevo. Puedes volver más tarde.",
      });
      setIsSubmitting(false);
      setStep("done");
      return;
    }

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
        description: data?.error || "No se pudieron guardar las selecciones.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    toast({
      title: "¡Selecciones guardadas!",
      description: data?.message || `Se han guardado ${selections.length} nuevas selecciones.`,
    });
    setIsSubmitting(false);
    setStep("done");
  };

  const getSelectionState = (participantId: string): MatchSelection => {
    return matchSelections.find(ms => ms.participantId === participantId) || { 
      participantId, 
      friendship: false, 
      dating: false, 
      canShowDating: false,
      alreadySelected: false
    };
  };

  const hasAnySelection = (participantId: string) => {
    const state = getSelectionState(participantId);
    return state.friendship || state.dating || state.alreadySelected;
  };

  const getPreviousSelectionLabel = (type?: string): string => {
    switch (type) {
      case 'friendship': return 'Amistad';
      case 'dating': return 'Ligue';
      case 'both': return 'Amistad y Ligue';
      default: return 'Seleccionado';
    }
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
      <div className="mb-8 animate-fade-in">
        <img src={konektumLogo} alt="Konektum" className="h-10 w-auto" />
      </div>

      {/* Completed state */}
      {step === "completed" && (
        <Card className="w-full max-w-md animate-scale-in bg-card/80 backdrop-blur-sm text-center">
          <CardContent className="pt-8 pb-8">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="font-display text-xl font-bold mb-2">Evento finalizado</h2>
            <p className="text-muted-foreground mb-6">
              Este evento ya ha sido cerrado. El periodo de selecciones ha terminado.
            </p>
            <Link to="/">
              <Button variant="outline" className="w-full">
                Volver al inicio
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Not started state */}
      {step === "not_started" && (
        <Card className="w-full max-w-md animate-scale-in bg-card/80 backdrop-blur-sm text-center">
          <CardContent className="pt-8 pb-8">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-amber-500" />
            </div>
            <h2 className="font-display text-xl font-bold mb-2">El evento aún no ha comenzado</h2>
            <p className="text-muted-foreground mb-6">
              Las selecciones estarán disponibles cuando el organizador inicie el evento.
            </p>
            <Link to="/">
              <Button variant="outline" className="w-full">
                Volver al inicio
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Error state */}
      {step === "error" && (
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
            {currentRound > 0 && (
              <Badge variant="secondary" className="mx-auto mt-2">
                Ronda {currentRound} {eventStatus === 'completed' ? '(Evento finalizado)' : 'en curso'}
              </Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
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
                  <span className="font-medium">{formatAnonymousName(participant.name, participant.phone)}</span>
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
              Selecciona a las personas con las que coincidiste
            </CardDescription>
            {alreadySelectedCount > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                Ya tienes {alreadySelectedCount} selección(es) de rondas anteriores
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {tablematesForSelection.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  No hay compañeros de mesa disponibles aún. Espera a que avance el evento.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 max-h-96 overflow-y-auto">
                {tablematesForSelection.map((person) => {
                  const selectionState = getSelectionState(person.id);
                  const isSelected = hasAnySelection(person.id);
                  const isAlreadySelected = selectionState.alreadySelected;
                  
                  return (
                    <div
                      key={person.id}
                      className={`p-4 rounded-lg transition-all ${
                        isAlreadySelected
                          ? 'bg-green-50 dark:bg-green-950/20 border-2 border-green-500/50'
                          : isSelected
                          ? 'bg-primary/10 border-2 border-primary shadow-soft'
                          : 'bg-muted hover:bg-muted/80 border-2 border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium">{formatAnonymousName(person.name, person.phone)}</span>
                        {isAlreadySelected && (
                          <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            {getPreviousSelectionLabel(selectionState.previousSelectionType)}
                          </Badge>
                        )}
                      </div>
                      
                      {isAlreadySelected ? (
                        <p className="text-xs text-muted-foreground">
                          Ya seleccionado en una ronda anterior
                        </p>
                      ) : (
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
                      )}
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
                  {newSelectionsCount > 0 
                    ? `Enviar ${newSelectionsCount} selección(es)` 
                    : 'Continuar sin seleccionar'}
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
            <h2 className="font-display text-2xl font-bold mb-2">¡Gracias por participar!</h2>
            <p className="text-muted-foreground mb-6">
              {eventStatus === 'completed' 
                ? 'Tus selecciones han sido guardadas. Te notificaremos si hay matches.'
                : 'Tus selecciones han sido guardadas. Puedes volver a escanear el QR en las siguientes rondas para añadir más selecciones.'}
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
