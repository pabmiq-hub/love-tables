import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Sparkles, AlertCircle, Loader2, Users, Smile, CheckCircle, Clock, Heart, KeyRound, Table2, Lock, MinusCircle } from "lucide-react";
import ParticipantRoundTimer from "@/components/event/ParticipantRoundTimer";
import EventCountdown from "@/components/event/EventCountdown";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import konektumLogo from "@/assets/konektum-logo.png";
import { translations, Language } from "@/i18n/translations";

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

interface TableAssignment {
  round: number;
  table: number;
  tablemates: { id: string; name: string; preference?: string | null; dating_preference?: string | null }[];
}

interface ExistingSelection {
  selected_id: string;
  selection_type: string;
}

type Step = "verify_code" | "confirm_identity" | "panel" | "done" | "error" | "not_started" | "expired";

const SESSION_EXPIRY_BUFFER_MS = 60 * 60 * 1000; // 1 hour after event

const ParticipantAccess = () => {
  const { id: eventId } = useParams();
  const [step, setStep] = useState<Step>("verify_code");
  const [verificationCode, setVerificationCode] = useState("");
  const [verifiedParticipant, setVerifiedParticipant] = useState<{ id: string; name: string; email?: string; preference?: string; dating_preference?: string } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [sessionRestored, setSessionRestored] = useState(false);

  const [matchSelections, setMatchSelections] = useState<MatchSelection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [eventStatus, setEventStatus] = useState<string>("");
  const [currentRound, setCurrentRound] = useState<number>(0);

  const [tableAssignments, setTableAssignments] = useState<TableAssignment[]>([]);
  const [totalRounds, setTotalRounds] = useState<number>(0);
  const [participantName, setParticipantName] = useState("");

  // Timer state
  const [timerData, setTimerData] = useState<{
    roundDuration: number;
    roundStartedAt: string | null;
    roundPausedAt: string | null;
    roundElapsedSeconds: number;
    completedRounds: number[];
  } | null>(null);

  const [eventDate, setEventDate] = useState<string>("");
  const [eventName, setEventName] = useState<string>("");
  const [eventTime, setEventTime] = useState<string | null>(null);
  const [checkinMinutes, setCheckinMinutes] = useState<number>(60);
  const [selectionDeadline, setSelectionDeadline] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  const [eventLang, setEventLang] = useState<Language>("es");
  const t = translations[eventLang];

  const { toast } = useToast();

  const sessionKey = eventId ? `participant_session_${eventId}` : '';

  const saveSession = (participantId: string, name: string, email: string | undefined, code: string) => {
    if (!sessionKey) return;
    localStorage.setItem(sessionKey, JSON.stringify({
      participantId, name, email, verificationCode: code, timestamp: new Date().toISOString()
    }));
  };

  const clearSession = () => {
    if (sessionKey) localStorage.removeItem(sessionKey);
  };

  const isSessionExpired = (eventDateStr: string): boolean => {
    if (!eventDateStr) return false;
    const eventEnd = new Date(eventDateStr);
    eventEnd.setHours(23, 59, 59); // end of event day
    return new Date().getTime() > eventEnd.getTime() + SESSION_EXPIRY_BUFFER_MS;
  };

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
          .select('status, current_round, selection_deadline_hours, selection_closed_at, scheduled_email_at, language, date, name, event_time, checkin_opens_minutes_before')
          .eq('id', eventId)
          .single();

        if (error || !event) {
          setStep("error");
          setIsLoading(false);
          return;
        }

        if (event.language === 'en' || event.language === 'es') {
          setEventLang(event.language as Language);
        }

        setEventStatus(event.status);
        setCurrentRound(event.current_round || 0);
        setEventDate(event.date);
        setEventName(event.name);
        setEventTime(event.event_time || null);
        setCheckinMinutes(event.checkin_opens_minutes_before ?? 60);

        if (event.selection_closed_at) {
          clearSession();
          setStep("expired");
          setIsLoading(false);
          return;
        }

        if (event.status === 'completed' && event.scheduled_email_at) {
          const deadline = new Date(event.scheduled_email_at);
          setSelectionDeadline(deadline);
          if (new Date() > deadline) {
            clearSession();
            setStep("expired");
            setIsLoading(false);
            return;
          }
        }

        if (event.status === 'pending' || event.current_round === 0) {
          setStep("not_started");
          setIsLoading(false);
          return;
        }

        // Try to restore session from localStorage
        const savedSession = sessionKey ? localStorage.getItem(sessionKey) : null;
        if (savedSession) {
          try {
            const session = JSON.parse(savedSession);
            if (session.verificationCode && !isSessionExpired(event.date)) {
              setVerificationCode(session.verificationCode);
              setVerifiedParticipant({ id: session.participantId, name: session.name, email: session.email });
              setSessionRestored(true);
              setIsLoading(false);
              return;
            } else {
              clearSession();
            }
          } catch {
            clearSession();
          }
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

  // Auto-restore session: once session data is set, auto-confirm identity
  useEffect(() => {
    if (sessionRestored && verifiedParticipant && verificationCode) {
      handleConfirmIdentity();
      setSessionRestored(false);
    }
  }, [sessionRestored, verifiedParticipant, verificationCode]);

  useEffect(() => {
    if (!selectionDeadline) return;
    const update = () => {
      const now = new Date();
      const diff = selectionDeadline.getTime() - now.getTime();
      if (diff <= 0) {
        setTimeRemaining(t.access.timeExpired);
        setStep("expired");
        return;
      }
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      setTimeRemaining(t.access.timeRemaining.replace('{hours}', String(hours)).replace('{minutes}', String(minutes)));
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [selectionDeadline, t]);

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      toast({ title: t.access.incompleteCode, description: t.access.incompleteCodeDesc, variant: "destructive" });
      return;
    }

    setIsVerifying(true);

    try {
      const { data, error } = await supabase.functions.invoke('get-event-participants', {
        body: { eventId, type: 'verify', verificationCode }
      });

      if (error || data?.error || !data?.participant) {
        toast({ title: t.access.invalidCode, description: t.access.invalidCodeDesc, variant: "destructive" });
        setIsVerifying(false);
        return;
      }

      setVerifiedParticipant(data.participant);
      setStep("confirm_identity");
    } catch (err) {
      console.error('Error verifying code:', err);
      toast({ title: t.access.error, description: t.access.errorSaving, variant: "destructive" });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleConfirmIdentity = async () => {
    if (!verifiedParticipant || !eventId) return;

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('get-table-assignments', {
        body: { eventId, verificationCode }
      });

      if (error || !data || data.error) {
        console.error('Error fetching table assignments:', data?.error || error);
        setStep("error");
        setIsLoading(false);
        return;
      }

      setParticipantName(data.participantName);
      const assignments: TableAssignment[] = data.assignments || [];
      setTableAssignments(assignments);
      setTotalRounds(data.totalRounds);

      // Store timer data
      if (data.timer) {
        setTimerData(data.timer);
      }

      const existingSelections: ExistingSelection[] = data.existingSelections || [];
      const existingMap = new Map<string, string>();
      existingSelections.forEach(s => existingMap.set(s.selected_id, s.selection_type));

      const participantPreference = data.participantPreference || verifiedParticipant.preference || '';
      const userInterestedInDating = participantPreference.toLowerCase().includes('sentimental') ||
        participantPreference.toLowerCase().includes('pareja') ||
        participantPreference.toLowerCase().includes('ligue');

      const allSelections: MatchSelection[] = [];
      assignments.forEach((assignment: TableAssignment) => {
        assignment.tablemates.forEach((tm) => {
          const targetPreference = (tm.preference || '').toLowerCase();
          const targetInterestedInDating = targetPreference.includes('sentimental') ||
            targetPreference.includes('pareja') ||
            targetPreference.includes('ligue');

          const existingType = existingMap.get(tm.id);

          allSelections.push({
            participantId: tm.id,
            friendship: false,
            dating: false,
            canShowDating: !!(userInterestedInDating && targetInterestedInDating),
            alreadySelected: !!existingType,
            previousSelectionType: existingType,
            round: assignment.round,
            table: assignment.table,
          });
        });
      });

      setMatchSelections(allSelections);
      setStep("panel");

      // Save session to localStorage
      saveSession(verifiedParticipant.id, data.participantName || verifiedParticipant.name, verifiedParticipant.email, verificationCode);
    } catch (err) {
      console.error('Error loading data:', err);
      setStep("error");
    } finally {
      setIsLoading(false);
    }
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

  const getPreviousSelectionLabel = (type?: string): string => {
    switch (type) {
      case 'friendship': return t.access.friendship;
      case 'dating': return t.access.dating;
      case 'both': return `${t.access.friendship} & ${t.access.dating}`;
      default: return t.access.alreadySelected;
    }
  };

  const selectionsByRound = tableAssignments.map(assignment => {
    const roundSelections = matchSelections.filter(ms => ms.round === assignment.round);
    return { round: assignment.round, table: assignment.table, selections: roundSelections };
  });

  const seenParticipantIds = new Set<string>();
  const deduplicatedSelectionsByRound = selectionsByRound.map(roundGroup => {
    const uniqueSelections = roundGroup.selections.filter(ms => {
      if (seenParticipantIds.has(ms.participantId)) return false;
      seenParticipantIds.add(ms.participantId);
      return true;
    });
    return { ...roundGroup, selections: uniqueSelections };
  });

  const newSelectionsCount = matchSelections.filter(ms => !ms.alreadySelected && (ms.friendship || ms.dating)).length;

  const handleSubmit = async () => {
    if (!verifiedParticipant || !eventId) return;
    setIsSubmitting(true);

    const activeSelections = matchSelections.filter(ms => !ms.alreadySelected && (ms.friendship || ms.dating));

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
      toast({ title: t.access.error, description: data?.error || t.access.errorSaving, variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    toast({ title: t.access.selectionsSaved, description: data?.message || `${selections.length} ${t.access.selectionsCount}` });
    setIsSubmitting(false);
    clearSession();
    setStep("done");
    setStep("done");
  };

  const handleSubmitEmpty = async () => {
    if (!verifiedParticipant || !eventId) return;
    setIsSubmitting(true);

    const { data, error } = await supabase.functions.invoke('submit-selections', {
      body: { eventId, verificationCode, selections: [] }
    });

    if (error || data?.error) {
      toast({ title: t.access.error, description: data?.error || t.access.errorSaving, variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    toast({ title: t.access.selectionsSaved, description: "Tu respuesta ha sido registrada" });
    setIsSubmitting(false);
    clearSession();
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
      <Link to={`/event/${eventId}/access`} className="absolute top-6 left-6 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" />
        {t.access.back}
      </Link>

      <div className="mb-8 animate-fade-in">
        <img src={konektumLogo} alt="Konektum" className="h-10 w-auto" />
      </div>

      {step === "not_started" && eventDate && (
        <EventCountdown
          eventName={eventName}
          eventDate={eventDate}
          eventTime={eventTime}
          language={eventLang}
          checkinOpensMinutesBefore={checkinMinutes}
        />
      )}

      {step === "expired" && (
        <Card className="w-full max-w-md animate-scale-in bg-card/80 backdrop-blur-sm text-center">
          <CardContent className="pt-8 pb-8">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="font-display text-xl font-bold mb-2">{t.access.expiredTitle}</h2>
            <p className="text-muted-foreground mb-6">{t.access.expiredDesc}</p>
            <Link to={`/event/${eventId}/access`}><Button variant="outline" className="w-full">{t.access.backToHome}</Button></Link>
          </CardContent>
        </Card>
      )}

      {step === "error" && (
        <Card className="w-full max-w-md animate-scale-in bg-card/80 backdrop-blur-sm text-center">
          <CardContent className="pt-8 pb-8">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="font-display text-xl font-bold mb-2">{t.access.errorTitle}</h2>
            <p className="text-muted-foreground mb-6">{t.access.errorDesc}</p>
            <Link to={`/event/${eventId}/access`}><Button variant="outline" className="w-full">{t.access.backToHome}</Button></Link>
          </CardContent>
        </Card>
      )}

      {step === "verify_code" && (
        <Card className="w-full max-w-md animate-scale-in bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <KeyRound className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">{t.access.panelTitle}</CardTitle>
            <CardDescription>{t.access.panelDesc}</CardDescription>
            {currentRound > 0 && (
              <Badge variant="secondary" className="mx-auto mt-2">{t.access.round} {currentRound} {t.access.inProgress}</Badge>
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
              {isVerifying ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t.access.verifying}</> : t.access.access}
            </Button>
            <p className="text-xs text-center text-muted-foreground">{t.access.noCodeHint}</p>
          </CardContent>
        </Card>
      )}

      {step === "confirm_identity" && verifiedParticipant && (
        <Card className="w-full max-w-md animate-scale-in bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">{t.access.areYouThis}</CardTitle>
            <CardDescription>{t.access.confirmDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 rounded-lg bg-muted space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.access.name}</span>
                <span className="font-medium">{verifiedParticipant.name}</span>
              </div>
              {verifiedParticipant.email && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t.access.email}</span>
                  <span className="font-medium">{verifiedParticipant.email}</span>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => { setStep("verify_code"); setVerificationCode(""); setVerifiedParticipant(null); }}>
                {t.access.no}
              </Button>
              <Button variant="hero" className="flex-1" onClick={handleConfirmIdentity} disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t.access.yes}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "panel" && (
        <Card className="w-full max-w-lg animate-scale-in bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">{t.access.hello} {participantName || verifiedParticipant?.name}</CardTitle>
            <CardDescription>
              {eventStatus === 'completed' ? t.access.eventFinished : t.access.roundInProgress.replace('{round}', String(currentRound))}
            </CardDescription>
            {timeRemaining && eventStatus === 'completed' && (
              <Badge variant="secondary" className="mx-auto mt-2">
                <Clock className="w-3 h-3 mr-1" />
                {timeRemaining}
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {/* Round Timer */}
            {timerData && currentRound > 0 && eventStatus !== 'completed' && (
              <div className="mb-4">
                <ParticipantRoundTimer
                  roundDuration={timerData.roundDuration}
                  activeRound={currentRound}
                  totalRounds={totalRounds}
                  roundStartedAt={timerData.roundStartedAt}
                  roundPausedAt={timerData.roundPausedAt}
                  roundElapsedSeconds={timerData.roundElapsedSeconds}
                  completedRounds={timerData.completedRounds}
                  lang={eventLang}
                />
              </div>
            )}
            <Tabs defaultValue="tables" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="tables" className="flex items-center gap-1.5">
                  <Table2 className="w-4 h-4" />
                  {t.access.myTables}
                </TabsTrigger>
                <TabsTrigger value="selections" className="flex items-center gap-1.5">
                  <Heart className="w-4 h-4" />
                  {t.access.selections}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="tables" className="space-y-3 mt-4">
                {tableAssignments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>{t.access.noTablesYet}</p>
                    <p className="text-sm mt-2">{t.access.waitForOrganizer}</p>
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
                              {t.access.round} {assignment.round}
                            </span>
                            {currentRound === assignment.round && (
                              <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full animate-pulse">{t.access.now}</span>
                            )}
                          </div>
                          <div className={`text-2xl font-bold ${currentRound === assignment.round ? 'text-primary' : 'text-foreground'}`}>
                            {t.access.table} {assignment.table}
                          </div>
                        </div>
                        {assignment.tablemates && assignment.tablemates.length > 0 && (
                          <div className="px-4 py-2 border-t border-border/50 bg-background/50">
                            <p className="text-xs text-muted-foreground mb-1">{t.access.tablemates}</p>
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
                <p className="text-xs text-center text-muted-foreground pt-2">{t.access.findTable}</p>
              </TabsContent>

              <TabsContent value="selections" className="space-y-4 mt-4">
                {eventStatus === 'completed' && (
                  <div className="bg-green-500/10 rounded-lg p-3 text-center">
                    <p className="text-sm text-green-700 dark:text-green-300 font-medium">{t.access.eventEndedSelect}</p>
                  </div>
                )}

                {selectionsByRound.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">{t.access.noTablemates}</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[28rem] overflow-y-auto">
                    {deduplicatedSelectionsByRound.map(({ round, table, selections: roundSelections }) => {
                      if (roundSelections.length === 0) return null;
                      return (
                      <div key={round} className="space-y-2">
                        <div className="flex items-center gap-2 sticky top-0 bg-card/90 backdrop-blur-sm py-1 z-10">
                          <Badge variant="secondary" className="text-xs">{t.access.round} {round} · {t.access.table} {table}</Badge>
                          {currentRound === round && (
                            <Badge className="text-xs bg-primary text-primary-foreground animate-pulse">{t.access.now}</Badge>
                          )}
                        </div>
                        {roundSelections.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-2">{t.access.noTablematesRound}</p>
                        ) : (
                          <div className="grid gap-2">
                            {roundSelections.map((ms) => {
                              const tablemate = tableAssignments.find(a => a.round === round)?.tablemates.find(t => t.id === ms.participantId);
                              if (!tablemate) return null;

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
                                    <span className="font-medium text-sm">{tablemate.name}</span>
                                    {ms.alreadySelected && (
                                      <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs">
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        {getPreviousSelectionLabel(ms.previousSelectionType)}
                                      </Badge>
                                    )}
                                  </div>

                                  {ms.alreadySelected ? (
                                    <p className="text-xs text-muted-foreground">{t.access.alreadySelected}</p>
                                  ) : (
                                    <div className="flex gap-4">
                                      <label className="flex items-center gap-2 cursor-pointer">
                                        <Checkbox checked={ms.friendship} onCheckedChange={() => toggleSelection(ms.participantId, round, 'friendship')} />
                                        <span className="text-sm flex items-center gap-1"><Smile className="w-3.5 h-3.5" /> {t.access.friendship}</span>
                                      </label>
                                      {ms.canShowDating && (
                                        <label className="flex items-center gap-2 cursor-pointer">
                                          <Checkbox checked={ms.dating} onCheckedChange={() => toggleSelection(ms.participantId, round, 'dating')} />
                                          <span className="text-sm flex items-center gap-1"><Heart className="w-3.5 h-3.5" /> {t.access.dating}</span>
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
                      );
                    })}
                  </div>
                )}

                <p className="text-sm text-center text-muted-foreground">{t.access.matchHint}</p>

                <Button variant="hero" className="w-full" onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t.access.saving}</>
                  ) : (
                    <><Heart className="w-4 h-4 mr-2" />{newSelectionsCount > 0 ? `${t.access.send} ${newSelectionsCount} ${t.access.selectionsCount}` : t.access.continueWithout}</>
                  )}
                </Button>

                {newSelectionsCount === 0 && (
                  <Button 
                    variant="outline" 
                    className="w-full mt-2" 
                    onClick={handleSubmitEmpty} 
                    disabled={isSubmitting}
                  >
                    <MinusCircle className="w-4 h-4 mr-2" />
                    No conecté con nadie
                  </Button>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {step === "done" && (
        <Card className="w-full max-w-md animate-scale-in bg-card/80 backdrop-blur-sm text-center">
          <CardContent className="pt-8 pb-8">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-10 h-10 text-primary" />
            </div>
            <h2 className="font-display text-2xl font-bold mb-2">{t.access.thanks}</h2>
            <p className="text-muted-foreground mb-6">
              {eventStatus === 'completed' ? t.access.thanksCompleted : t.access.thanksActive}
            </p>
            <Link to={`/event/${eventId}/access`}><Button variant="outline" className="w-full">{t.access.backToHome}</Button></Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ParticipantAccess;
