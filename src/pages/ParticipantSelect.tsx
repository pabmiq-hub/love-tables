import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Sparkles, AlertCircle, Loader2, Users, Smile, CheckCircle, Clock, Heart, KeyRound, Star, Repeat2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { formatAnonymousName } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { BrandedLogo } from "@/components/BrandedHeader";
import { useEventBranding } from "@/hooks/useEventBranding";
import { translations, Language } from "@/i18n/translations";
import confetti from "canvas-confetti";
import SuperLikeOnboarding from "@/components/ui/super-like-onboarding";
import SuperLikeBanner from "@/components/ui/super-like-banner";
import SuperLikeConfirmDialog from "@/components/ui/super-like-confirm-dialog";

interface Participant {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  preference?: string;
  dating_preference?: string;
  gender?: string;
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

const areDatingPreferencesCompatible = (pref1: string, gender1: string | null, pref2: string, gender2: string | null): boolean => {
  const openPrefs = ["Estoy abierto a todo", "Estoy abierta a todo", "Estoy abierto/a a todo", "No binario", "I'm open to all", "I am open to all", "Non-binary"];
  if (openPrefs.some(o => pref1.includes(o)) || openPrefs.some(o => pref2.includes(o))) return true;

  const p1LookingForWoman = pref1.includes("busco una mujer") || pref1.includes("looking for a woman");
  const p1LookingForMan = pref1.includes("busco un hombre") || pref1.includes("looking for a man");
  const p2LookingForWoman = pref2.includes("busco una mujer") || pref2.includes("looking for a woman");
  const p2LookingForMan = pref2.includes("busco un hombre") || pref2.includes("looking for a man");

  const p1IsWoman = gender1 === "Mujer" || gender1 === "Woman" || pref1.includes("Soy una mujer") || pref1.includes("I'm a woman") || pref1.includes("I am a woman");
  const p1IsMan = gender1 === "Hombre" || gender1 === "Man" || pref1.includes("Soy un hombre") || pref1.includes("I'm a man") || pref1.includes("I am a man");
  const p2IsWoman = gender2 === "Mujer" || gender2 === "Woman" || pref2.includes("Soy una mujer") || pref2.includes("I'm a woman") || pref2.includes("I am a woman");
  const p2IsMan = gender2 === "Hombre" || gender2 === "Man" || pref2.includes("Soy un hombre") || pref2.includes("I'm a man") || pref2.includes("I am a man");

  // Hetero: man→woman & woman→man
  if (p1IsMan && p1LookingForWoman && p2IsWoman && p2LookingForMan) return true;
  if (p1IsWoman && p1LookingForMan && p2IsMan && p2LookingForWoman) return true;
  // Gay: man→man & man→man
  if (p1IsMan && p1LookingForMan && p2IsMan && p2LookingForMan) return true;
  // Lesbian: woman→woman & woman→woman
  if (p1IsWoman && p1LookingForWoman && p2IsWoman && p2LookingForWoman) return true;

  return false;
};

const ParticipantSelect = () => {
  const { id: eventId } = useParams();
  const eb = useEventBranding(eventId);
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
  const [superLikeEnabled, setSuperLikeEnabled] = useState(false);
  const [superLikeId, setSuperLikeId] = useState<string | null>(null);
  const [existingSuperLike, setExistingSuperLike] = useState(false);
  const [hasReceivedSuperLike, setHasReceivedSuperLike] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [confirmSuperLikeFor, setConfirmSuperLikeFor] = useState<{ id: string; name: string } | null>(null);
  const [repeatRequestUsed, setRepeatRequestUsed] = useState<{ status: string; targetId?: string } | null>(null);
  const [confirmRepeatFor, setConfirmRepeatFor] = useState<{ id: string; name: string } | null>(null);
  const [isSendingRepeat, setIsSendingRepeat] = useState(false);
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const { toast } = useToast();

  const [eventLang, setEventLang] = useState<Language>("es");
  const t = translations[eventLang];

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
          .select('status, current_round, language, super_like_enabled, organizer_id')
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
        setSuperLikeEnabled((event as any).super_like_enabled || false);

        // "Repetir" — trust event-level toggle as source of truth.
        // Plan-level enforcement happens at toggle time in the dashboard,
        // and the request-repeat edge function re-validates server-side.
        setRepeatEnabled(!!(event as any).repeat_request_enabled);

        if (event.status === 'completed') {
          setStep("completed");
        } else if (event.status === 'pending' || event.current_round === 0) {
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

  // Verify the code and get participant info
  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      toast({
        title: t.select.incompleteCode,
        description: t.select.incompleteCodeDesc,
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
          title: t.select.invalidCode,
          description: t.select.invalidCodeDesc,
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
        description: "Error",
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

      // Check if participant already used their super like + received any
      if (superLikeEnabled && verifiedParticipant) {
        const [sentRes, receivedRes] = await Promise.all([
          supabase
            .from('participant_selections')
            .select('id')
            .eq('event_id', eventId)
            .eq('selector_id', verifiedParticipant.id)
            .eq('is_super_like', true)
            .limit(1),
          supabase
            .from('participant_selections')
            .select('id')
            .eq('event_id', eventId)
            .eq('selected_id', verifiedParticipant.id)
            .eq('is_super_like', true)
            .limit(1),
        ]);
        if (sentRes.data && sentRes.data.length > 0) setExistingSuperLike(true);
        if (receivedRes.data && receivedRes.data.length > 0) setHasReceivedSuperLike(true);

        // Show onboarding once per event
        const onboardingKey = `superlike_onboarded_${eventId}`;
        if (!localStorage.getItem(onboardingKey)) {
          setShowOnboarding(true);
          localStorage.setItem(onboardingKey, "1");
        }
      }

      // Check existing repeat request for this participant
      if (verifiedParticipant) {
        const { data: existingRepeat } = await (supabase as any)
          .from('repeat_requests')
          .select('status, target_id')
          .eq('event_id', eventId)
          .eq('requester_id', verifiedParticipant.id)
          .maybeSingle();
        if (existingRepeat) {
          setRepeatRequestUsed({ status: existingRepeat.status, targetId: existingRepeat.target_id });
        }
      }

      const userPreference = verifiedParticipant.preference || null;
      setCurrentUserPreference(userPreference);

      const tablemates = getTablemates(verifiedParticipant.id, tables, participantsData);
      const userExistingSelections = getUserExistingSelections(verifiedParticipant.id, allExistingSelections);

      const userInterestedInDating = userPreference?.toLowerCase().includes('sentimental') ||
        userPreference?.toLowerCase().includes('pareja') ||
        userPreference?.toLowerCase().includes('ligue');

      const userDatingPref = verifiedParticipant.dating_preference || '';
      const userGender = (verifiedParticipant as any).gender || null;

      setMatchSelections(tablemates.map(p => {
        const targetPreference = p.preference?.toLowerCase() || '';
        const targetInterestedInDating = targetPreference.includes('sentimental') ||
          targetPreference.includes('pareja') ||
          targetPreference.includes('ligue');

        // Check dating preference compatibility (gender/orientation match)
        let datingCompatible = false;
        if (userInterestedInDating && targetInterestedInDating && userDatingPref && p.dating_preference) {
          datingCompatible = areDatingPreferencesCompatible(
            userDatingPref, userGender,
            p.dating_preference, p.gender || null
          );
        }

        const existingSelection = userExistingSelections.get(p.id);
        const alreadySelected = !!existingSelection;

        return {
          participantId: p.id,
          friendship: false,
          dating: false,
          canShowDating: userInterestedInDating && targetInterestedInDating && datingCompatible,
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
            if (p.id !== participantId) tablematesIds.add(p.id);
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
    selections.filter(s => s.selector_id === participantId).forEach(s => {
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
      participantId, friendship: false, dating: false, canShowDating: false, alreadySelected: false
    };
  };

  const hasAnySelection = (participantId: string) => {
    const state = getSelectionState(participantId);
    return state.friendship || state.dating || state.alreadySelected;
  };

  const requestSuperLike = (participantId: string, name: string) => {
    if (existingSuperLike || superLikeId) {
      toast({
        title: eventLang === "es" ? "Super Like ya asignado" : "Super Like already assigned",
        description: eventLang === "es" ? "Solo puedes dar 1 Super Like por evento" : "You can only give 1 Super Like per event",
        variant: "destructive",
      });
      return;
    }
    setConfirmSuperLikeFor({ id: participantId, name: formatAnonymousName(name) });
  };

  const confirmSuperLike = () => {
    if (!confirmSuperLikeFor) return;
    setSuperLikeId(confirmSuperLikeFor.id);
    // Confetti burst
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#fbbf24", "#f59e0b", "#fde68a", "#ffffff"],
    });
    toast({
      title: eventLang === "es" ? "⭐ Super Like asignado" : "⭐ Super Like assigned",
      description: eventLang === "es"
        ? "Se enviará al confirmar tus selecciones"
        : "It will be sent when you confirm your selections",
    });
    setConfirmSuperLikeFor(null);
  };

  const requestRepeat = (participantId: string, name: string) => {
    if (repeatRequestUsed) {
      toast({
        title: eventLang === "es" ? "Ya has usado tu repetición" : "You already used your repeat",
        description: eventLang === "es"
          ? "Solo puedes solicitar repetir con una persona por evento"
          : "You can only request to repeat with one person per event",
        variant: "destructive",
      });
      return;
    }
    setConfirmRepeatFor({ id: participantId, name: formatAnonymousName(name) });
  };

  const confirmRepeat = async () => {
    if (!confirmRepeatFor || !verifiedParticipant || !eventId) return;
    setIsSendingRepeat(true);
    try {
      const { data, error } = await supabase.functions.invoke('request-repeat', {
        body: {
          event_id: eventId,
          requester_id: verifiedParticipant.id,
          target_id: confirmRepeatFor.id,
        },
      });
      if (error || data?.error) {
        toast({
          title: "Error",
          description: data?.error || (eventLang === "es" ? "No se pudo enviar la solicitud" : "Could not send the request"),
          variant: "destructive",
        });
        return;
      }
      setRepeatRequestUsed({ status: "pending", targetId: confirmRepeatFor.id });
      toast({
        title: eventLang === "es" ? "🔁 Solicitud enviada" : "🔁 Request sent",
        description: eventLang === "es"
          ? "La otra persona recibirá un email para aceptar o rechazar tu solicitud"
          : "The other person will receive an email to accept or decline your request",
      });
      setConfirmRepeatFor(null);
    } catch (err) {
      console.error('Error sending repeat request:', err);
      toast({ title: "Error", description: String(err), variant: "destructive" });
    } finally {
      setIsSendingRepeat(false);
    }
  };

  const getPreviousSelectionLabel = (type?: string): string => {
    switch (type) {
      case 'friendship': return t.select.friendship;
      case 'dating': return t.select.dating;
      case 'both': return `${t.select.friendship} & ${t.select.dating}`;
      default: return t.select.alreadySelected;
    }
  };

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
        title: t.select.noTablemates,
        description: t.select.continueWithout,
      });
      setIsSubmitting(false);
      setStep("done");
      return;
    }

    const selections = activeSelections.map(ms => {
      let selectionType = 'friendship';
      if (ms.friendship && ms.dating) selectionType = 'both';
      else if (ms.dating) selectionType = 'dating';
      return { selected_id: ms.participantId, selection_type: selectionType };
    });

    const { data, error } = await supabase.functions.invoke('submit-selections', {
      body: { eventId, verificationCode, selections, superLikeId }
    });

    if (error || data?.error) {
      console.error('Error saving selections:', error || data?.error);
      toast({
        title: "Error",
        description: data?.error || t.select.noTablemates,
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    toast({
      title: t.access.selectionsSaved,
      description: data?.message || `${selections.length} ${t.select.selections}`,
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
      <SuperLikeOnboarding open={showOnboarding} onClose={() => setShowOnboarding(false)} language={eventLang} />
      <SuperLikeConfirmDialog
        open={!!confirmSuperLikeFor}
        onClose={() => setConfirmSuperLikeFor(null)}
        onConfirm={confirmSuperLike}
        recipientName={confirmSuperLikeFor?.name || ""}
        language={eventLang}
      />
      <Link to={`/event/${eventId}/access`} className="absolute top-6 left-6 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" />
        {t.access.back}
      </Link>

      <div className="mb-8 animate-fade-in">
        <BrandedLogo logoUrl={eb.logoUrl} companyName={eb.companyName} isWhiteLabel={eb.isWhiteLabel} />
      </div>

      {step === "select" && hasReceivedSuperLike && (
        <div className="w-full max-w-md mb-4">
          <SuperLikeBanner language={eventLang} variant="received" />
        </div>
      )}

      {step === "completed" && (
        <Card className="w-full max-w-md animate-scale-in bg-card/80 backdrop-blur-sm text-center">
          <CardContent className="pt-8 pb-8">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="font-display text-xl font-bold mb-2">{t.select.eventCompleted}</h2>
            <p className="text-muted-foreground">{t.select.eventCompletedDesc}</p>
          </CardContent>
        </Card>
      )}

      {step === "not_started" && (
        <Card className="w-full max-w-md animate-scale-in bg-card/80 backdrop-blur-sm text-center">
          <CardContent className="pt-8 pb-8">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-amber-500" />
            </div>
            <h2 className="font-display text-xl font-bold mb-2">{t.select.notStarted}</h2>
            <p className="text-muted-foreground mb-6">{t.select.notStartedDesc}</p>
            <Link to={`/event/${eventId}/access`}><Button variant="outline" className="w-full">{t.select.backToHome}</Button></Link>
          </CardContent>
        </Card>
      )}

      {step === "error" && (
        <Card className="w-full max-w-md animate-scale-in bg-card/80 backdrop-blur-sm text-center">
          <CardContent className="pt-8 pb-8">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="font-display text-xl font-bold mb-2">{t.select.eventNotAvailable}</h2>
            <p className="text-muted-foreground mb-6">{t.select.eventNotAvailableDesc}</p>
            <Link to={`/event/${eventId}/access`}><Button variant="outline" className="w-full">{t.select.backToHome}</Button></Link>
          </CardContent>
        </Card>
      )}

      {step === "verify_code" && (
        <Card className="w-full max-w-md animate-scale-in bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <KeyRound className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">{t.select.enterCode}</CardTitle>
            <CardDescription>{t.select.enterCodeDesc}</CardDescription>
            {currentRound > 0 && (
              <Badge variant="secondary" className="mx-auto mt-2">{t.select.round} {currentRound} {t.select.inProgress}</Badge>
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
              {isVerifying ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t.select.verifying}</> : t.select.verify}
            </Button>
            <p className="text-xs text-center text-muted-foreground">{t.select.noCodeHint}</p>
          </CardContent>
        </Card>
      )}

      {step === "confirm_identity" && verifiedParticipant && (
        <Card className="w-full max-w-md animate-scale-in bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">{t.select.areYouThis}</CardTitle>
            <CardDescription>{t.select.confirmBeforeContinuing}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 rounded-lg bg-muted space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.select.name}</span>
                <span className="font-medium">{verifiedParticipant.name}</span>
              </div>
              {verifiedParticipant.email && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t.select.email}</span>
                  <span className="font-medium">{verifiedParticipant.email}</span>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => { setStep("verify_code"); setVerificationCode(""); setVerifiedParticipant(null); }}>
                {t.select.no}
              </Button>
              <Button variant="hero" className="flex-1" onClick={handleConfirmIdentity} disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t.select.yes}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "select" && (
        <Card className="w-full max-w-md animate-scale-in bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{t.select.whoDidYouConnect}</CardTitle>
            <CardDescription>{t.select.selectPeople}</CardDescription>
            {alreadySelectedCount > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                {t.select.previousSelections} {alreadySelectedCount} {t.select.previousSelectionsSuffix}
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {tablematesForSelection.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">{t.select.noTablemates}</p>
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
                        <p className="text-xs text-muted-foreground">{t.select.alreadySelected}</p>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex gap-4 items-center flex-wrap">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <Checkbox checked={selectionState.friendship} onCheckedChange={() => toggleSelection(person.id, 'friendship')} />
                              <span className="text-sm flex items-center gap-1"><Smile className="w-4 h-4" /> {t.select.friendship}</span>
                            </label>
                            {selectionState.canShowDating && (
                              <label className="flex items-center gap-2 cursor-pointer">
                                <Checkbox checked={selectionState.dating} onCheckedChange={() => toggleSelection(person.id, 'dating')} />
                                <span className="text-sm flex items-center gap-1"><Heart className="w-4 h-4" /> {t.select.dating}</span>
                              </label>
                            )}
                          </div>
                          {superLikeEnabled && (
                            superLikeId === person.id ? (
                              <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-950/40 dark:to-yellow-950/40 border-2 border-amber-400 text-amber-900 dark:text-amber-100 text-sm font-semibold">
                                <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                                {eventLang === "es" ? "Super Like asignado" : "Super Like assigned"}
                              </div>
                            ) : (!existingSuperLike && !superLikeId) ? (
                              <button
                                type="button"
                                onClick={() => requestSuperLike(person.id, person.name)}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 border-amber-300 hover:border-amber-500 bg-amber-50 hover:bg-gradient-to-r hover:from-amber-100 hover:to-yellow-100 dark:bg-amber-950/20 dark:border-amber-700/40 text-amber-700 dark:text-amber-300 text-sm font-semibold transition-all hover:scale-[1.02] hover:shadow-md"
                              >
                                <Star className="w-4 h-4" />
                                {eventLang === "es" ? "⭐ Dar Super Like" : "⭐ Give Super Like"}
                              </button>
                            ) : null
                          )}
                          {repeatEnabled && (() => {
                            const isThisRepeat = repeatRequestUsed?.targetId === person.id;
                            const repeatDisabled = !!repeatRequestUsed && !isThisRepeat;
                            return isThisRepeat ? (
                              <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-violet-50 dark:bg-violet-950/30 border-2 border-violet-300 text-violet-800 dark:text-violet-200 text-sm font-semibold">
                                <Repeat2 className="w-4 h-4" />
                                {eventLang === "es"
                                  ? (repeatRequestUsed?.status === "accepted"
                                      ? "Repetición aceptada ✓"
                                      : repeatRequestUsed?.status === "declined"
                                        ? "Repetición rechazada"
                                        : repeatRequestUsed?.status === "expired"
                                          ? "Repetición caducada"
                                          : "Repetición pendiente")
                                  : (repeatRequestUsed?.status === "accepted"
                                      ? "Repeat accepted ✓"
                                      : repeatRequestUsed?.status === "declined"
                                        ? "Repeat declined"
                                        : repeatRequestUsed?.status === "expired"
                                          ? "Repeat expired"
                                          : "Repeat pending")}
                              </div>
                            ) : (
                              <button
                                type="button"
                                disabled={repeatDisabled}
                                onClick={() => requestRepeat(person.id, person.name)}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 border-violet-300 hover:border-violet-500 bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/20 dark:border-violet-700/40 text-violet-700 dark:text-violet-300 text-sm font-semibold transition-all hover:scale-[1.02] hover:shadow-md disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed"
                              >
                                <Repeat2 className="w-4 h-4" />
                                {eventLang === "es" ? "🔁 Repetir con esta persona" : "🔁 Repeat with this person"}
                              </button>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <p className="text-sm text-center text-muted-foreground">{t.select.matchHint}</p>
            {repeatEnabled && (
              <div className="text-xs text-center text-violet-700 dark:text-violet-400 flex items-center justify-center gap-1.5 font-medium">
                <Repeat2 className="w-3.5 h-3.5" />
                {repeatRequestUsed
                  ? (eventLang === "es" ? "Repetición usada 🔁" : "Repeat used 🔁")
                  : (eventLang === "es" ? "Te queda 1 Repetición 🔁 — solicita volver a coincidir con alguien" : "1 Repeat remaining 🔁 — request to meet someone again")}
              </div>
            )}
            {superLikeEnabled && (
              <div className="text-xs text-center text-amber-700 dark:text-amber-400 flex items-center justify-center gap-1.5 font-medium">
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                {existingSuperLike || superLikeId
                  ? (eventLang === "es" ? "Super Like usado ✓" : "Super Like used ✓")
                  : (eventLang === "es" ? "Te queda 1 Super Like ⭐ — anónimo, único por evento" : "1 Super Like remaining ⭐ — anonymous, one per event")}
              </div>
            )}
            <Button variant="hero" className="w-full" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t.select.saving}</>
              ) : (
                <><Heart className="w-4 h-4 mr-2" />{newSelectionsCount > 0 ? `${t.select.submit} ${newSelectionsCount} ${t.select.selections}` : t.select.continueWithout}</>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "done" && (
        <Card className="w-full max-w-md animate-scale-in bg-card/80 backdrop-blur-sm text-center">
          <CardContent className="pt-8 pb-8">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-10 h-10 text-primary" />
            </div>
            <h2 className="font-display text-2xl font-bold mb-2">{t.select.thanks}</h2>
            <p className="text-muted-foreground mb-6">
              {eventStatus === 'completed' ? t.select.thanksCompleted : t.select.thanksActive}
            </p>
            <Link to={`/event/${eventId}/access`}><Button variant="outline" className="w-full">{t.select.backToHome}</Button></Link>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!confirmRepeatFor} onOpenChange={(open) => !open && setConfirmRepeatFor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Repeat2 className="w-5 h-5 text-violet-600" />
              {eventLang === "es" ? "¿Solicitar repetir con esta persona?" : "Request to repeat with this person?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {eventLang === "es"
                ? `Enviaremos un email anónimo a ${confirmRepeatFor?.name} para que decida si quiere volver a coincidir contigo en una próxima ronda. Solo puedes usar esta opción una vez por evento.`
                : `We'll send an anonymous email to ${confirmRepeatFor?.name} so they can decide whether to meet you again in an upcoming round. You can only use this option once per event.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSendingRepeat}>{eventLang === "es" ? "Cancelar" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRepeat} disabled={isSendingRepeat} className="bg-violet-600 hover:bg-violet-700 text-white">
              {isSendingRepeat ? <Loader2 className="w-4 h-4 animate-spin" /> : (eventLang === "es" ? "Enviar solicitud" : "Send request")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ParticipantSelect;
