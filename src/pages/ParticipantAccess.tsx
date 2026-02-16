import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Sparkles, AlertCircle, Loader2, Users, Smile, CheckCircle, Clock, Heart, KeyRound, Table2, Lock } from "lucide-react";
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
  round: number;
  table: number;
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

interface TableAssignment {
  round: number;
  table: number;
  tablemates: { id: string; name: string }[];
}

type Step = "verify_code" | "confirm_identity" | "panel" | "done" | "error" | "not_started" | "expired";

const ParticipantAccess = () => {
  const { id: eventId } = useParams();
  const [step, setStep] = useState<Step>("verify_code");
  const [verificationCode, setVerificationCode] = useState("");
  const [verifiedParticipant, setVerifiedParticipant] = useState<Participant | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [matchSelections, setMatchSelections] = useState<MatchSelection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tablesData, setTablesData] = useState<TableData[]>([]);
  const [existingSelections, setExistingSelections] = useState<ExistingSelection[]>([]);
  const [eventStatus, setEventStatus] = useState<string>("");
  const [currentRound, setCurrentRound] = useState<number>(0);

  // Table assignments
  const [tableAssignments, setTableAssignments] = useState<TableAssignment[]>([]);
  const [totalRounds, setTotalRounds] = useState<number>(0);
  const [participantName, setParticipantName] = useState("");

  // Deadline
  const [selectionDeadline, setSelectionDeadline] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  const { toast } = useToast();

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
          .select('status, current_round, selection_deadline_hours, selection_closed_at, emails_sent_at')
          .eq('id', eventId)
          .single();

        if (error || !event) {
          setStep("error");
          setIsLoading(false);
          return;
        }

        setEventStatus(event.status);
        setCurrentRound(event.current_round || 0);

        // Check if selection period has been manually closed
        if (event.selection_closed_at) {
          setStep("expired");
          setIsLoading(false);
          return;
        }

        // Check deadline if event is completed
        if (event.status === 'completed' && event.emails_sent_at && event.selection_deadline_hours) {
          const deadline = new Date(new Date(event.emails_sent_at).getTime() + event.selection_deadline_hours * 3600000);
          setSelectionDeadline(deadline);
          if (new Date() > deadline) {
            setStep("expired");
            setIsLoading(false);
            return;
          }
        }

        if (event.status === 'pending' || event.current_round === 0) {
          setStep("not_started");
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Error checking event status:', err);
        setStep("error");
        setIsLoading(false);
      }
    };

    checkEventStatus();
  }, [eventId]);

  // Countdown timer
  useEffect(() => {
    if (!selectionDeadline) return;
    const update = () => {
      const now = new Date();
      const diff = selectionDeadline.getTime() - now.getTime();
      if (diff <= 0) {
        setTimeRemaining("Plazo expirado");
        setStep("expired");
        return;
      }
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      setTimeRemaining(`${hours}h ${minutes}m restantes`);
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [selectionDeadline]);

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      toast({ title: "Código incompleto", description: "Por favor, introduce los 6 dígitos del código", variant: "destructive" });
      return;
    }

    setIsVerifying(true);

    try {
      const { data, error } = await supabase.functions.invoke('get-event-participants', {
        body: { eventId, type: 'verify', verificationCode }
      });

      if (error || data?.error || !data?.participant) {
        toast({ title: "Código inválido", description: "El código introducido no es válido o ha expirado", variant: "destructive" });
        setIsVerifying(false);
        return;
      }

      setVerifiedParticipant(data.participant);
      setStep("confirm_identity");
    } catch (err) {
      console.error('Error verifying code:', err);
      toast({ title: "Error", description: "No se pudo verificar el código. Inténtalo de nuevo.", variant: "destructive" });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleConfirmIdentity = async () => {
    if (!verifiedParticipant || !eventId) return;

    setIsLoading(true);

    try {
      const [tablesResult, selectResult] = await Promise.all([
        supabase.functions.invoke('get-table-assignments', {
          body: { eventId, verificationCode }
        }),
        supabase.functions.invoke('get-event-participants', {
          body: { eventId, type: 'select' }
        })
      ]);

      // Process table assignments
      if (!tablesResult.error && tablesResult.data && !tablesResult.data.error) {
        setParticipantName(tablesResult.data.participantName);
        setTableAssignments(tablesResult.data.assignments || []);
        setTotalRounds(tablesResult.data.totalRounds);
      }

      // Process selection data
      if (!selectResult.error && selectResult.data && !selectResult.data.error) {
        const participantsData = selectResult.data.participants;
        const tables = selectResult.data.tables || [];
        const allExistingSelections = selectResult.data.existingSelections || [];

        setParticipants(participantsData);
        setTablesData(tables);
        setExistingSelections(allExistingSelections);

        const userPreference = verifiedParticipant.preference || null;
        const userExistingSelections = getUserExistingSelections(verifiedParticipant.id, allExistingSelections);

        const userInterestedInDating = userPreference?.toLowerCase().includes('sentimental') ||
          userPreference?.toLowerCase().includes('pareja') ||
          userPreference?.toLowerCase().includes('ligue');

        // Build selections grouped by round using table assignments
        const allSelections: MatchSelection[] = [];
        
        // Use the table assignments which include tablemates per round
        const assignments = tablesResult.data?.assignments || [];
        assignments.forEach((assignment: TableAssignment) => {
          assignment.tablemates.forEach((tm: { id: string; name: string }) => {
            const participant = participantsData.find((p: Participant) => p.id === tm.id);
            if (!participant) return;
            
            const targetPreference = participant.preference?.toLowerCase() || '';
            const targetInterestedInDating = targetPreference.includes('sentimental') ||
              targetPreference.includes('pareja') ||
              targetPreference.includes('ligue');

            const existingSelection = userExistingSelections.get(tm.id);

            allSelections.push({
              participantId: tm.id,
              friendship: false,
              dating: false,
              canShowDating: !!(userInterestedInDating && targetInterestedInDating),
              alreadySelected: !!existingSelection,
              previousSelectionType: existingSelection,
              round: assignment.round,
              table: assignment.table,
            });
          });
        });

        setMatchSelections(allSelections);
      }

      setStep("panel");
    } catch (err) {
      console.error('Error loading data:', err);
      setStep("error");
    } finally {
      setIsLoading(false);
    }
  };

  const getUserExistingSelections = (participantId: string, selections: ExistingSelection[]): Map<string, string> => {
    const userSelections = new Map<string, string>();
    selections.filter(s => s.selector_id === participantId).forEach(s => {
      userSelections.set(s.selected_id, s.selection_type);
    });
    return userSelections;
  };

  const toggleSelection = (participantId: string, round: number, type: 'friendship' | 'dating') => {
    setMatchSelections(prev =>
      prev.map(ms =>
        ms.participantId === participantId && ms.round === round && !ms.alreadySelected
          ? { ...ms, [type]: !ms[type] }
          : ms
      )
    );
  };

  const getSelectionState = (participantId: string, round: number): MatchSelection => {
    return matchSelections.find(ms => ms.participantId === participantId && ms.round === round) || {
      participantId, friendship: false, dating: false, canShowDating: false, alreadySelected: false, round, table: 0
    };
  };

  const getPreviousSelectionLabel = (type?: string): string => {
    switch (type) {
      case 'friendship': return 'Amistad';
      case 'dating': return 'Ligue';
      case 'both': return 'Amistad y Ligue';
      default: return 'Seleccionado';
    }
  };

  // Group selections by round
  const selectionsByRound = tableAssignments.map(assignment => {
    const roundSelections = matchSelections.filter(ms => ms.round === assignment.round);
    return { round: assignment.round, table: assignment.table, selections: roundSelections };
  });

  const newSelectionsCount = matchSelections.filter(ms => !ms.alreadySelected && (ms.friendship || ms.dating)).length;
  const alreadySelectedCount = matchSelections.filter(ms => ms.alreadySelected).length;

  const handleSubmit = async () => {
    if (!verifiedParticipant || !eventId) return;
    setIsSubmitting(true);

    const activeSelections = matchSelections.filter(ms => !ms.alreadySelected && (ms.friendship || ms.dating));

    // Deduplicate by participantId (a person may appear in multiple rounds)
    const deduped = new Map<string, MatchSelection>();
    activeSelections.forEach(ms => {
      const existing = deduped.get(ms.participantId);
      if (existing) {
        deduped.set(ms.participantId, {
          ...existing,
          friendship: existing.friendship || ms.friendship,
          dating: existing.dating || ms.dating,
        });
      } else {
        deduped.set(ms.participantId, ms);
      }
    });

    if (deduped.size === 0) {
      toast({ title: "Sin nuevas selecciones", description: "No has seleccionado ningún compañero nuevo." });
      setIsSubmitting(false);
      setStep("done");
      return;
    }

    const selections = Array.from(deduped.values()).map(ms => {
      let selectionType = 'friendship';
      if (ms.friendship && ms.dating) selectionType = 'both';
      else if (ms.dating) selectionType = 'dating';
      return { selected_id: ms.participantId, selection_type: selectionType };
    });

    const { data, error } = await supabase.functions.invoke('submit-selections', {
      body: { eventId, verificationCode, selections }
    });

    if (error || data?.error) {
      toast({ title: "Error", description: data?.error || "No se pudieron guardar las selecciones.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    toast({ title: "¡Selecciones guardadas!", description: data?.message || `Se han guardado ${selections.length} nuevas selecciones.` });
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
      <Link to="/" className="absolute top-6 left-6 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Volver
      </Link>

      <div className="mb-8 animate-fade-in">
        <img src={konektumLogo} alt="Konektum" className="h-10 w-auto" />
      </div>

      {/* Not started */}
      {step === "not_started" && (
        <Card className="w-full max-w-md animate-scale-in bg-card/80 backdrop-blur-sm text-center">
          <CardContent className="pt-8 pb-8">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-amber-500" />
            </div>
            <h2 className="font-display text-xl font-bold mb-2">El evento aún no ha comenzado</h2>
            <p className="text-muted-foreground mb-6">El panel estará disponible cuando el organizador inicie el evento.</p>
            <Link to="/"><Button variant="outline" className="w-full">Volver al inicio</Button></Link>
          </CardContent>
        </Card>
      )}

      {/* Expired */}
      {step === "expired" && (
        <Card className="w-full max-w-md animate-scale-in bg-card/80 backdrop-blur-sm text-center">
          <CardContent className="pt-8 pb-8">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="font-display text-xl font-bold mb-2">Plazo finalizado</h2>
            <p className="text-muted-foreground mb-6">
              El periodo para enviar selecciones ha expirado. Ya no puedes acceder al panel de participante.
            </p>
            <Link to="/"><Button variant="outline" className="w-full">Volver al inicio</Button></Link>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {step === "error" && (
        <Card className="w-full max-w-md animate-scale-in bg-card/80 backdrop-blur-sm text-center">
          <CardContent className="pt-8 pb-8">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="font-display text-xl font-bold mb-2">Evento no disponible</h2>
            <p className="text-muted-foreground mb-6">Este evento no existe o el enlace es inválido.</p>
            <Link to="/"><Button variant="outline" className="w-full">Volver al inicio</Button></Link>
          </CardContent>
        </Card>
      )}

      {/* Verify Code */}
      {step === "verify_code" && (
        <Card className="w-full max-w-md animate-scale-in bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <KeyRound className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Panel del participante</CardTitle>
            <CardDescription>Introduce el código de 6 dígitos que recibiste al registrarte.</CardDescription>
            {currentRound > 0 && (
              <Badge variant="secondary" className="mx-auto mt-2">Ronda {currentRound} en curso</Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={verificationCode} onChange={setVerificationCode}>
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
            <Button variant="hero" className="w-full" onClick={handleVerifyCode} disabled={verificationCode.length !== 6 || isVerifying}>
              {isVerifying ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verificando...</> : "Acceder"}
            </Button>
            <p className="text-xs text-center text-muted-foreground">¿No tienes código? Búscalo en el email que recibiste al hacer check-in.</p>
          </CardContent>
        </Card>
      )}

      {/* Confirm Identity */}
      {step === "confirm_identity" && verifiedParticipant && (
        <Card className="w-full max-w-md animate-scale-in bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">¿Eres tú?</CardTitle>
            <CardDescription>Confirma que estos datos son correctos antes de continuar.</CardDescription>
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
              <Button variant="outline" className="flex-1" onClick={() => { setStep("verify_code"); setVerificationCode(""); setVerifiedParticipant(null); }}>
                No, volver
              </Button>
              <Button variant="hero" className="flex-1" onClick={handleConfirmIdentity} disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sí, soy yo"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Panel with Tabs */}
      {step === "panel" && (
        <Card className="w-full max-w-lg animate-scale-in bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">Hola, {participantName || verifiedParticipant?.name}</CardTitle>
            <CardDescription>
              {eventStatus === 'completed' ? 'El evento ha finalizado' : `Ronda ${currentRound} en curso`}
            </CardDescription>
            {timeRemaining && eventStatus === 'completed' && (
              <Badge variant="secondary" className="mx-auto mt-2">
                <Clock className="w-3 h-3 mr-1" />
                {timeRemaining}
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="tables" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="tables" className="flex items-center gap-1.5">
                  <Table2 className="w-4 h-4" />
                  Mis mesas
                </TabsTrigger>
                <TabsTrigger value="selections" className="flex items-center gap-1.5">
                  <Heart className="w-4 h-4" />
                  Selecciones
                </TabsTrigger>
              </TabsList>

              {/* Tables Tab */}
              <TabsContent value="tables" className="space-y-3 mt-4">
                {tableAssignments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Las mesas aún no han sido asignadas.</p>
                    <p className="text-sm mt-2">Espera a que el organizador genere las mesas.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tableAssignments.map((assignment) => (
                      <div key={assignment.round} className={`rounded-lg border overflow-hidden ${
                        currentRound === assignment.round ? 'border-primary' : 'border-border'
                      }`}>
                        <div className={`flex items-center justify-between p-4 ${
                          currentRound === assignment.round ? 'bg-primary/10' : 'bg-muted/50'
                        }`}>
                          <div className="flex items-center gap-3">
                            <span className={`text-sm font-medium ${currentRound === assignment.round ? 'text-primary' : 'text-muted-foreground'}`}>
                              Ronda {assignment.round}
                            </span>
                            {currentRound === assignment.round && (
                              <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full animate-pulse">AHORA</span>
                            )}
                          </div>
                          <div className={`text-2xl font-bold ${currentRound === assignment.round ? 'text-primary' : 'text-foreground'}`}>
                            Mesa {assignment.table}
                          </div>
                        </div>
                        {assignment.tablemates && assignment.tablemates.length > 0 && (
                          <div className="px-4 py-2 border-t border-border/50 bg-background/50">
                            <p className="text-xs text-muted-foreground mb-1">Compañeros de mesa:</p>
                            <div className="flex flex-wrap gap-1">
                              {assignment.tablemates.map(tm => (
                                <Badge key={tm.id} variant="outline" className="text-xs">{tm.name}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-center text-muted-foreground pt-2">Busca el número de tu mesa en el local</p>
              </TabsContent>

              {/* Selections Tab - Grouped by Round */}
              <TabsContent value="selections" className="space-y-4 mt-4">
                {eventStatus === 'completed' && (
                  <div className="bg-green-500/10 rounded-lg p-3 text-center">
                    <p className="text-sm text-green-700 dark:text-green-300 font-medium">Evento finalizado — selecciona a las personas con las que conectaste</p>
                  </div>
                )}

                {selectionsByRound.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No hay compañeros de mesa disponibles aún. Espera a que avance el evento.</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[28rem] overflow-y-auto">
                    {selectionsByRound.map(({ round, table, selections: roundSelections }) => (
                      <div key={round} className="space-y-2">
                        <div className="flex items-center gap-2 sticky top-0 bg-card/90 backdrop-blur-sm py-1 z-10">
                          <Badge variant="secondary" className="text-xs">Ronda {round} · Mesa {table}</Badge>
                          {currentRound === round && (
                            <Badge className="text-xs bg-primary text-primary-foreground animate-pulse">AHORA</Badge>
                          )}
                        </div>
                        {roundSelections.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-2">Sin compañeros en esta ronda</p>
                        ) : (
                          <div className="grid gap-2">
                            {roundSelections.map((ms) => {
                              const person = participants.find(p => p.id === ms.participantId) || 
                                tableAssignments.find(a => a.round === round)?.tablemates.find(t => t.id === ms.participantId);
                              if (!person) return null;

                              return (
                                <div
                                  key={`${ms.participantId}-${round}`}
                                  className={`p-3 rounded-lg transition-all ${ms.alreadySelected
                                    ? 'bg-green-50 dark:bg-green-950/20 border-2 border-green-500/50'
                                    : (ms.friendship || ms.dating)
                                      ? 'bg-primary/10 border-2 border-primary shadow-soft'
                                      : 'bg-muted hover:bg-muted/80 border-2 border-transparent'
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-medium text-sm">{formatAnonymousName(person.name, (person as any).phone)}</span>
                                    {ms.alreadySelected && (
                                      <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs">
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        {getPreviousSelectionLabel(ms.previousSelectionType)}
                                      </Badge>
                                    )}
                                  </div>

                                  {ms.alreadySelected ? (
                                    <p className="text-xs text-muted-foreground">Ya seleccionado anteriormente</p>
                                  ) : (
                                    <div className="flex gap-4">
                                      <label className="flex items-center gap-2 cursor-pointer">
                                        <Checkbox checked={ms.friendship} onCheckedChange={() => toggleSelection(ms.participantId, round, 'friendship')} />
                                        <span className="text-sm flex items-center gap-1"><Smile className="w-3.5 h-3.5" /> Amistad</span>
                                      </label>
                                      {ms.canShowDating && (
                                        <label className="flex items-center gap-2 cursor-pointer">
                                          <Checkbox checked={ms.dating} onCheckedChange={() => toggleSelection(ms.participantId, round, 'dating')} />
                                          <span className="text-sm flex items-center gap-1"><Heart className="w-3.5 h-3.5" /> Ligue</span>
                                        </label>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-sm text-center text-muted-foreground">
                  Si ambos os seleccionáis mutuamente, ¡es un match! 💕
                </p>

                <Button variant="hero" className="w-full" onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Guardando...</>
                  ) : (
                    <><Heart className="w-4 h-4 mr-2" />{newSelectionsCount > 0 ? `Enviar ${newSelectionsCount} selección(es)` : 'Continuar sin seleccionar'}</>
                  )}
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Done */}
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
                : 'Tus selecciones han sido guardadas. Puedes volver a acceder para añadir más selecciones.'}
            </p>
            <Link to="/"><Button variant="outline" className="w-full">Volver al inicio</Button></Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ParticipantAccess;
