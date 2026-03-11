import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Sparkles, AlertCircle, Loader2, Users, Smile, CheckCircle, Clock, Heart, KeyRound, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { formatAnonymousName } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { BrandedLogo } from "@/components/BrandedHeader";
import { useEventBranding } from "@/hooks/useEventBranding";
import { translations, Language } from "@/i18n/translations";

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
          .select('status, current_round, language, super_like_enabled')
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

      // Check if participant already used their super like
      if (superLikeEnabled && verifiedParticipant) {
        const { data: superLikes } = await supabase
          .from('participant_selections')
          .select('id')
          .eq('event_id', eventId)
          .eq('selector_id', verifiedParticipant.id)
          .eq('is_super_like', true)
          .limit(1);
        if (superLikes && superLikes.length > 0) {
          setExistingSuperLike(true);
        }
      }

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

  const toggleSuperLike = (participantId: string) => {
    if (existingSuperLike) {
      toast({
        title: eventLang === "es" ? "Super Like ya usado" : "Super Like already used",
        description: eventLang === "es" ? "Ya has enviado tu Super Like en este evento" : "You already used your Super Like in this event",
        variant: "destructive",
      });
      return;
    }
    if (superLikeId === participantId) {
      setSuperLikeId(null);
    } else {
      setSuperLikeId(participantId);
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
      body: { eventId, verificationCode, selections }
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
      <Link to="/" className="absolute top-6 left-6 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" />
        {t.access.back}
      </Link>

      <div className="mb-8 animate-fade-in">
        <BrandedLogo logoUrl={eb.logoUrl} companyName={eb.companyName} isWhiteLabel={eb.isWhiteLabel} />
      </div>

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
            <Link to="/"><Button variant="outline" className="w-full">{t.select.backToHome}</Button></Link>
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
            <Link to="/"><Button variant="outline" className="w-full">{t.select.backToHome}</Button></Link>
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
                        <div className="flex gap-4">
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
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <p className="text-sm text-center text-muted-foreground">{t.select.matchHint}</p>
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
            <Link to="/"><Button variant="outline" className="w-full">{t.select.backToHome}</Button></Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ParticipantSelect;
