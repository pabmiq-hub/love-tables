import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Sparkles, AlertCircle, Loader2, Users, Smile, CheckCircle, Clock, Heart, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { formatAnonymousName } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import konektumLogo from "@/assets/konektum-logo.png";

interface Participant {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  preference?: string;
  dating_preference?: string;
}

interface MatchSelection {
  participantId: string;
  friendship: boolean;
  dating: boolean;
  canShowDating: boolean;
  alreadySelected: boolean;
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

type Step = "verify_code" | "confirm_identity" | "select" | "done" | "error" | "not_started" | "completed";

const ParticipantSelect = () => {
  const { id: eventId } = useParams();
  const [step, setStep] = useState<Step>("verify_code");
  const [verificationCode, setVerificationCode] = useState("");
  const [verifiedParticipant, setVerifiedParticipant] = useState<Participant | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [matchSelections, setMatchSelections] = useState<MatchSelection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUserPreference, setCurrentUserPreference] = useState<string | null>(null);
  const [tablesData, setTablesData] = useState<TableData[]>([]);
  const [existingSelections, setExistingSelections] = useState<ExistingSelection[]>([]);
  const [eventStatus, setEventStatus] = useState<string>("");
  const [currentRound, setCurrentRound] = useState<number>(0);
  const { toast } = useToast();

  // Initial data load - only check event status
  useEffect(() => {
    const checkEventStatus = async () => {
      if (!eventId) {
        setStep("error");
        setIsLoading(false);
        return;
      }

      try {
        const { data: event, error } = await supabase
          .from('events')
          .select('status, current_round')
          .eq('id', eventId)
          .single();

        if (error || !event) {
          setStep("error");
          setIsLoading(false);
          return;
        }

        setEventStatus(event.status);
        setCurrentRound(event.current_round || 0);

        if (event.status === 'completed') {
          setStep("completed");
        } else if (event.status === 'pending' || event.current_round === 0) {
          setStep("not_started");
        }
        // else stay on verify_code
        
        setIsLoading(false);
      } catch (err) {
        console.error('Error checking event status:', err);
        setStep("error");
        setIsLoading(false);
      }
    };

    checkEventStatus();
  }, [eventId]);

  // Verify the code and get participant info
  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      toast({
        title: "Código incompleto",
        description: "Por favor, introduce los 6 dígitos del código",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);

    try {
      const { data, error } = await supabase.functions.invoke('get-event-participants', {
        body: { eventId, type: 'verify', verificationCode }
      });

      if (error || data?.error || !data?.participant) {
        toast({
          title: "Código inválido",
          description: "El código introducido no es válido o ha expirado",
          variant: "destructive",
        });
        setIsVerifying(false);
        return;
      }

      setVerifiedParticipant(data.participant);
      setStep("confirm_identity");
    } catch (err) {
      console.error('Error verifying code:', err);
      toast({
        title: "Error",
        description: "No se pudo verificar el código. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Confirm identity and load full data
  const handleConfirmIdentity = async () => {
    if (!verifiedParticipant || !eventId) return;

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('get-event-participants', {
        body: { eventId, type: 'select' }
      });

      if (error || data?.error || !data?.participants) {
        setStep("error");
        setIsLoading(false);
        return;
      }

      const participantsData = data.participants;
      const tables = data.tables || [];
      const allExistingSelections = data.existingSelections || [];

      setParticipants(participantsData);
      setTablesData(tables);
      setExistingSelections(allExistingSelections);

      // Setup match selections
      const userPreference = verifiedParticipant.preference || null;
      setCurrentUserPreference(userPreference);

      const tablemates = getTablemates(verifiedParticipant.id, tables, participantsData);
      const userExistingSelections = getUserExistingSelections(verifiedParticipant.id, allExistingSelections);

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
    } catch (err) {
      console.error('Error loading data:', err);
      setStep("error");
    } finally {
      setIsLoading(false);
    }
  };

  // Helper functions
  const getTablemates = (participantId: string, tables: TableData[], allParticipants: Participant[]): Participant[] => {
    const tablematesIds = new Set<string>();

    tables.forEach(round => {
      round.tables.forEach(table => {
        const participantAtTable = table.some(p => p.id === participantId);
        if (participantAtTable) {
          table.forEach(p => {
            if (p.id !== participantId) {
              tablematesIds.add(p.id);
            }
          });
        }
      });
    });

    if (tablematesIds.size === 0 && tables.length === 0) {
      return allParticipants.filter(p => p.id !== participantId);
    }

    return allParticipants.filter(p => tablematesIds.has(p.id));
  };

  const getUserExistingSelections = (participantId: string, selections: ExistingSelection[]): Map<string, string> => {
    const userSelections = new Map<string, string>();
    selections
      .filter(s => s.selector_id === participantId)
      .forEach(s => {
        userSelections.set(s.selected_id, s.selection_type);
      });
    return userSelections;
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

  // Get tablemates for the verified participant
  const getTablematesForSelection = (): Participant[] => {
    if (!verifiedParticipant) return [];
    return getTablemates(verifiedParticipant.id, tablesData, participants);
  };

  const tablematesForSelection = getTablematesForSelection();
  const newSelectionsCount = matchSelections.filter(ms => !ms.alreadySelected && (ms.friendship || ms.dating)).length;
  const alreadySelectedCount = matchSelections.filter(ms => ms.alreadySelected).length;

  const handleSubmit = async () => {
    if (!verifiedParticipant || !eventId) return;

    setIsSubmitting(true);

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
        verificationCode, // Use verification code instead of selectorId
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
            <p className="text-muted-foreground">
              Este evento ya ha sido cerrado. El periodo de selecciones ha terminado.
            </p>
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
              Este evento no existe o el enlace es inválido.
            </p>
            <Link to="/">
              <Button variant="outline" className="w-full">
                Volver al inicio
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Step: Verify Code */}
      {step === "verify_code" && (
        <Card className="w-full max-w-md animate-scale-in bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <KeyRound className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Introduce tu código</CardTitle>
            <CardDescription>
              Introduce el código de 6 dígitos que recibiste por email al registrarte.
            </CardDescription>
            {currentRound > 0 && (
              <Badge variant="secondary" className="mx-auto mt-2">
                Ronda {currentRound} en curso
              </Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={verificationCode}
                onChange={setVerificationCode}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button
              variant="hero"
              className="w-full"
              onClick={handleVerifyCode}
              disabled={verificationCode.length !== 6 || isVerifying}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                "Verificar código"
              )}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              ¿No tienes código? Búscalo en el email que recibiste al registrarte.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Step: Confirm Identity */}
      {step === "confirm_identity" && verifiedParticipant && (
        <Card className="w-full max-w-md animate-scale-in bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">¿Eres tú?</CardTitle>
            <CardDescription>
              Confirma que estos datos son correctos antes de continuar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 rounded-lg bg-muted space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nombre:</span>
                <span className="font-medium">{verifiedParticipant.name}</span>
              </div>
              {verifiedParticipant.email && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-medium">{verifiedParticipant.email}</span>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setStep("verify_code");
                  setVerificationCode("");
                  setVerifiedParticipant(null);
                }}
              >
                No, volver
              </Button>
              <Button
                variant="hero"
                className="flex-1"
                onClick={handleConfirmIdentity}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Sí, soy yo"
                )}
              </Button>
            </div>
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
                      className={`p-4 rounded-lg transition-all ${isAlreadySelected
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
