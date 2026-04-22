import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Sparkles, AlertCircle, Loader2, Users, Smile, CheckCircle, Clock, Heart, KeyRound, Table2, Lock, MinusCircle, HelpCircle, Repeat2, Pencil } from "lucide-react";
import ParticipantRoundTimer from "@/components/event/ParticipantRoundTimer";
import EventCountdown from "@/components/event/EventCountdown";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import konektumLogo from "@/assets/konektum-logo.png";
import { translations, Language } from "@/i18n/translations";
import SuperLikeBanner from "@/components/ui/super-like-banner";
import SuperLikeConfirmDialog from "@/components/ui/super-like-confirm-dialog";
import { Star } from "lucide-react";
import confetti from "canvas-confetti";

interface MatchSelection {
  participantId: string;
  friendship: boolean;
  dating: boolean;
  canShowDating: boolean;
  alreadySelected: boolean;
  previousSelectionType?: string;
  superLikedByMe?: boolean;
  round: number;
  table: number;
}

interface TableAssignment {
  round: number;
  table: number;
  tablemates: { id: string; name: string; preference?: string | null; dating_preference?: string | null; gender?: string | null }[];
}

interface ExistingSelection {
  selected_id: string;
  selection_type: string;
  is_super_like?: boolean;
}

type Step = "verify_code" | "confirm_identity" | "panel" | "done" | "error" | "not_started" | "expired";

const SESSION_EXPIRY_BUFFER_MS = 60 * 60 * 1000; // 1 hour after event

/**
 * Check bilateral dating preference compatibility based on gender and orientation.
 * Both participants must match each other's search criteria.
 */
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

const ParticipantAccess = () => {
  const { id: eventId } = useParams();
  const [step, setStep] = useState<Step>("verify_code");
  const [verificationCode, setVerificationCode] = useState("");
  const [verifiedParticipant, setVerifiedParticipant] = useState<{ id: string; name: string; email?: string; preference?: string; dating_preference?: string; gender?: string } | null>(null);
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
  const [hasReceivedSuperLike, setHasReceivedSuperLike] = useState(false);
  const [hasSentSuperLike, setHasSentSuperLike] = useState(false);
  const [superLikeTarget, setSuperLikeTarget] = useState<{ id: string; name: string; round: number } | null>(null);
  const [isSendingSuperLike, setIsSendingSuperLike] = useState(false);

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

  // Preliminary round confirmation
  const [preliminaryConfirmation, setPreliminaryConfirmation] = useState<boolean | null>(null);
  const [showPreliminaryModal, setShowPreliminaryModal] = useState(false);
  const [isConfirmingPreliminary, setIsConfirmingPreliminary] = useState(false);

  // Active tab control (for guiding user after prelim confirmation)
  const [activeTab, setActiveTab] = useState<"tables" | "selections">("tables");
  const [highlightSelectionsTab, setHighlightSelectionsTab] = useState(false);

  // Repeat request feature
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [repeatRequestUsed, setRepeatRequestUsed] = useState<{ status: string; targetId?: string } | null>(null);
  const [repeatTarget, setRepeatTarget] = useState<{ id: string; name: string; round: number } | null>(null);
  const [isSendingRepeat, setIsSendingRepeat] = useState(false);

  // Edit-existing-selection feature (key = `${participantId}-${round}`)
  const [editingKeys, setEditingKeys] = useState<Set<string>>(new Set());
  const [pendingEdits, setPendingEdits] = useState<Map<string, { friendship: boolean; dating: boolean; originalType?: string; participantId: string }>>(new Map());
  const [confirmEditSubmit, setConfirmEditSubmit] = useState(false);

  // Game mode (Modo lúdico) — dynamics per table number
  const [gameMode, setGameMode] = useState<{
    enabled: boolean;
    dynamics: { id: string; name: string; table_numbers: number[] }[];
  } | null>(null);

  const getDynamicForTable = (tableNumber: number) => {
    if (!gameMode?.enabled) return null;
    return gameMode.dynamics.find(d => d.table_numbers.includes(tableNumber)) || null;
  };

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
          .select('status, current_round, selection_deadline_hours, selection_closed_at, scheduled_email_at, language, date, name, event_time, checkin_opens_minutes_before, preliminary_round, checkin_open, repeat_request_enabled, organizer_id')
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

        // Resolve repeat-request feature: trust event-level toggle as source of truth.
        // The organizer can only enable it from the dashboard if their plan supports it,
        // and the request-repeat edge function re-validates the event flag server-side.
        setRepeatEnabled(!!(event as any).repeat_request_enabled);

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

        // Allow access if preliminary round has tables (even if event is pending)
        const prelimRound = (event as any).preliminary_round;
        const hasPrelimTables = prelimRound?.enabled && Array.isArray(prelimRound?.tables) && prelimRound.tables.length > 0;
        const isCheckinOpen = !!(event as any).checkin_open;
        
        // Allow verify_code when checkin is open OR event is active/completed
        // Only block with "not_started" when event is pending, checkin is closed, and no prelim tables
        if ((event.status === 'pending' || event.current_round === 0) && !hasPrelimTables && !isCheckinOpen) {
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
      const superLikedMap = new Map<string, boolean>();
      existingSelections.forEach(s => {
        existingMap.set(s.selected_id, s.selection_type);
        if (s.is_super_like) superLikedMap.set(s.selected_id, true);
      });

      // Read super-like flags returned by edge function
      setHasSentSuperLike(!!data.hasSentSuperLike);
      setHasReceivedSuperLike(!!data.hasReceivedSuperLike);

      // Game mode payload (no `played` map sent to clients)
      setGameMode(data.gameMode || null);

      // Handle preliminary round confirmation status
      const prelimConfirm = data.preliminaryConfirmation;
      setPreliminaryConfirmation(prelimConfirm);
      const hasRound0 = assignments.some((a: TableAssignment) => a.round === 0);
      if (hasRound0 && prelimConfirm === null) {
        // Participant hasn't answered yet - show modal
        setShowPreliminaryModal(true);
      }

      const participantPreference = data.participantPreference || verifiedParticipant.preference || '';
      const userDatingPref = data.participantDatingPreference || verifiedParticipant.dating_preference || '';
      const userGender = data.participantGender || verifiedParticipant.gender || null;
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

          // Check bilateral dating compatibility (gender/orientation)
          let datingCompatible = false;
          if (userInterestedInDating && targetInterestedInDating && userDatingPref && tm.dating_preference) {
            datingCompatible = areDatingPreferencesCompatible(
              userDatingPref, userGender,
              tm.dating_preference, tm.gender || null
            );
          }

          const existingType = existingMap.get(tm.id);

          allSelections.push({
            participantId: tm.id,
            friendship: false,
            dating: false,
            canShowDating: datingCompatible,
            alreadySelected: !!existingType,
            previousSelectionType: existingType,
            superLikedByMe: superLikedMap.get(tm.id) || false,
            round: assignment.round,
            table: assignment.table,
          });
        });
      });

      setMatchSelections(allSelections);
      setStep("panel");

      // Fetch existing repeat request for this participant (if feature enabled)
      try {
        const { data: existingRepeat } = await (supabase as any)
          .from('repeat_requests')
          .select('status, target_id')
          .eq('event_id', eventId)
          .eq('requester_id', verifiedParticipant.id)
          .maybeSingle();
        if (existingRepeat) {
          setRepeatRequestUsed({ status: existingRepeat.status, targetId: existingRepeat.target_id });
        }
      } catch (e) {
        console.warn('Could not fetch repeat request:', e);
      }

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

  const openSuperLikeDialog = (participantId: string, name: string, round: number) => {
    if (hasSentSuperLike) return;
    const ms = matchSelections.find(s => s.participantId === participantId && s.round === round);
    if (!ms || ms.alreadySelected) return;
    setSuperLikeTarget({ id: participantId, name, round });
  };

  const confirmSuperLike = () => {
    if (!superLikeTarget) return;
    setIsSendingSuperLike(true);
    // Mark as super-liked locally + force friendship as base selection
    setMatchSelections(prev =>
      prev.map(ms =>
        ms.participantId === superLikeTarget.id
          ? { ...ms, superLikedByMe: true, friendship: true }
          : ms
      )
    );
    setHasSentSuperLike(true);

    // Confetti burst (golden)
    try {
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#fbbf24', '#f59e0b', '#fcd34d', '#fde68a'],
        scalar: 1.1,
      });
    } catch {}

    toast({
      title: eventLang === 'en' ? '⭐ Super Like marked' : '⭐ Super Like marcado',
      description: eventLang === 'en'
        ? "It will be sent when you submit your selections."
        : "Se enviará cuando confirmes tus selecciones.",
    });

    setSuperLikeTarget(null);
    setIsSendingSuperLike(false);
  };


  const getPreviousSelectionLabel = (type?: string): string => {
    switch (type) {
      case 'friendship': return t.access.friendship;
      case 'dating': return t.access.dating;
      case 'both': return `${t.access.friendship} & ${t.access.dating}`;
      default: return t.access.alreadySelected;
    }
  };

  // ---- Edit existing selection helpers ----
  const editKey = (participantId: string, round: number) => `${participantId}-${round}`;

  const startEditingSelection = (participantId: string, round: number, prevType?: string) => {
    const k = editKey(participantId, round);
    setEditingKeys(prev => new Set(prev).add(k));
    setPendingEdits(prev => {
      const next = new Map(prev);
      next.set(k, {
        friendship: prevType === 'friendship' || prevType === 'both',
        dating: prevType === 'dating' || prevType === 'both',
        originalType: prevType,
        participantId,
      });
      return next;
    });
  };

  const cancelEditingSelection = (participantId: string, round: number) => {
    const k = editKey(participantId, round);
    setEditingKeys(prev => { const n = new Set(prev); n.delete(k); return n; });
    setPendingEdits(prev => { const n = new Map(prev); n.delete(k); return n; });
  };

  const toggleEditOption = (participantId: string, round: number, type: 'friendship' | 'dating') => {
    const k = editKey(participantId, round);
    setPendingEdits(prev => {
      const next = new Map(prev);
      const cur = next.get(k);
      if (!cur) return prev;
      next.set(k, { ...cur, [type]: !cur[type] });
      return next;
    });
  };

  const computePendingType = (edit: { friendship: boolean; dating: boolean }): string | null => {
    if (edit.friendship && edit.dating) return 'both';
    if (edit.dating) return 'dating';
    if (edit.friendship) return 'friendship';
    return null;
  };

  // Distinct participants with meaningful changes (deduplicated across rounds)
  const getMeaningfulEdits = (): { participantId: string; newType: string | null }[] => {
    const byParticipant = new Map<string, { newType: string | null; original: string | undefined }>();
    for (const [, edit] of pendingEdits.entries()) {
      const newType = computePendingType(edit);
      if (newType !== (edit.originalType || null)) {
        // If the same participant appears in multiple rounds, last write wins
        // (the edit form per-row pre-fills from existingType, so they stay in sync).
        byParticipant.set(edit.participantId, { newType, original: edit.originalType });
      }
    }
    return Array.from(byParticipant.entries()).map(([participantId, v]) => ({
      participantId, newType: v.newType,
    }));
  };

  const hasMeaningfulEdits = (): boolean => getMeaningfulEdits().length > 0;

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

  const performSubmit = async () => {
    if (!verifiedParticipant || !eventId) return;
    setIsSubmitting(true);

    // 1) Apply edits to previously-submitted selections
    const edits = getMeaningfulEdits();
    for (const e of edits) {
      const { data, error } = await supabase.functions.invoke('update-selection', {
        body: { eventId, verificationCode, selectedId: e.participantId, selectionType: e.newType },
      });
      if (error || data?.error) {
        toast({
          title: t.access.error,
          description: data?.error || (eventLang === 'es' ? 'No se pudo actualizar la selección' : 'Could not update the selection'),
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }
    }

    // 2) New selections
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

    const superLikedSelection = matchSelections.find(ms => !ms.alreadySelected && ms.superLikedByMe);
    const superLikeId = superLikedSelection?.participantId;

    if (selections.length > 0) {
      const { data, error } = await supabase.functions.invoke('submit-selections', {
        body: { eventId, verificationCode, selections, superLikeId }
      });

      if (error || data?.error) {
        toast({ title: t.access.error, description: data?.error || t.access.errorSaving, variant: "destructive" });
        setIsSubmitting(false);
        return;
      }

      toast({ title: t.access.selectionsSaved, description: data?.message || `${selections.length} ${t.access.selectionsCount}` });
    } else if (edits.length > 0) {
      toast({
        title: eventLang === 'es' ? 'Selecciones actualizadas' : 'Selections updated',
        description: eventLang === 'es'
          ? `${edits.length} cambio${edits.length === 1 ? '' : 's'} guardado${edits.length === 1 ? '' : 's'}`
          : `${edits.length} change${edits.length === 1 ? '' : 's'} saved`,
      });
    }

    setIsSubmitting(false);
    clearSession();
    setStep("done");
  };

  const handleSubmit = async () => {
    if (hasMeaningfulEdits()) {
      setConfirmEditSubmit(true);
      return;
    }
    await performSubmit();
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

  const handlePreliminaryConfirmation = async (confirmed: boolean) => {
    if (!eventId || !verificationCode) return;
    setIsConfirmingPreliminary(true);
    try {
      const { data, error } = await supabase.functions.invoke('confirm-preliminary', {
        body: { eventId, verificationCode, confirmed }
      });
      
      if (error || data?.error) {
        toast({ title: t.access.error, description: data?.error || 'Error', variant: "destructive" });
        setIsConfirmingPreliminary(false);
        return;
      }

      setPreliminaryConfirmation(confirmed);
      setShowPreliminaryModal(false);

      if (!confirmed) {
        // Remove round 0 assignments from state
        setTableAssignments(prev => prev.filter(a => a.round !== 0));
        setMatchSelections(prev => prev.filter(ms => ms.round !== 0));
      } else {
        // User confirmed they were at the prelim → guide them to the Selecciones tab
        // so they can rate their tablemates from the welcome round.
        setActiveTab("selections");
        setHighlightSelectionsTab(true);
        toast({
          title: eventLang === 'es' ? '¡Genial! 🎉' : 'Awesome! 🎉',
          description: eventLang === 'es'
            ? 'Ya puedes seleccionar a tus compañeros de la mesa de bienvenida.'
            : 'You can now rate your tablemates from the welcome round.',
        });
        // Stop the highlight after a few seconds
        setTimeout(() => setHighlightSelectionsTab(false), 6000);
      }
    } catch (err) {
      console.error('Error confirming preliminary:', err);
      toast({ title: t.access.error, description: t.access.errorSaving, variant: "destructive" });
    } finally {
      setIsConfirmingPreliminary(false);
    }
  };

  // ===== Repeat request handlers (1 per event) =====
  const openRepeatDialog = (participantId: string, name: string, round: number) => {
    if (repeatRequestUsed) return;
    const ms = matchSelections.find(s => s.participantId === participantId && s.round === round);
    if (!ms || ms.alreadySelected) return;
    setRepeatTarget({ id: participantId, name, round });
  };

  const confirmRepeat = async () => {
    if (!repeatTarget || !verifiedParticipant || !eventId) return;
    setIsSendingRepeat(true);
    try {
      const { data, error } = await supabase.functions.invoke('request-repeat', {
        body: {
          event_id: eventId,
          requester_id: verifiedParticipant.id,
          target_id: repeatTarget.id,
        },
      });
      if (error || data?.error) {
        toast({
          title: t.access.error,
          description: data?.error || (eventLang === 'es' ? 'No se pudo enviar la solicitud' : 'Could not send the request'),
          variant: 'destructive',
        });
        return;
      }
      setRepeatRequestUsed({ status: 'pending', targetId: repeatTarget.id });
      toast({
        title: eventLang === 'es' ? '🔁 Solicitud enviada' : '🔁 Request sent',
        description: eventLang === 'es'
          ? 'La otra persona recibirá un email para aceptar o rechazar tu solicitud.'
          : 'The other person will receive an email to accept or decline your request.',
      });
      setRepeatTarget(null);
    } catch (err) {
      console.error('Error sending repeat request:', err);
      toast({ title: t.access.error, description: String(err), variant: 'destructive' });
    } finally {
      setIsSendingRepeat(false);
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
      {/* Preliminary Round Confirmation Modal */}
      <Dialog open={showPreliminaryModal} onOpenChange={setShowPreliminaryModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-2">
              <HelpCircle className="w-7 h-7 text-amber-600 dark:text-amber-400" />
            </div>
            <DialogTitle className="text-center">{t.access.preliminaryQuestion}</DialogTitle>
            <DialogDescription className="text-center">
              {t.access.preliminaryQuestionDesc}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              className="flex-1" 
              onClick={() => handlePreliminaryConfirmation(false)}
              disabled={isConfirmingPreliminary}
            >
              {t.access.preliminaryNo}
            </Button>
            <Button 
              variant="hero" 
              className="flex-1" 
              onClick={() => handlePreliminaryConfirmation(true)}
              disabled={isConfirmingPreliminary}
            >
              {isConfirmingPreliminary ? <Loader2 className="w-4 h-4 animate-spin" /> : t.access.preliminaryYes}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <button onClick={() => { clearSession(); setStep("verify_code"); setVerificationCode(""); setVerifiedParticipant(null); }} className="absolute top-6 left-6 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" />
        {t.access.back}
      </button>

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
            <Button variant="outline" className="w-full" onClick={() => { clearSession(); setStep("verify_code"); setVerificationCode(""); setVerifiedParticipant(null); }}>{t.access.backToHome}</Button>
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
            <Button variant="outline" className="w-full" onClick={() => { clearSession(); setStep("verify_code"); setVerificationCode(""); setVerifiedParticipant(null); }}>{t.access.backToHome}</Button>
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
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "tables" | "selections")} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="tables" className="flex items-center gap-1.5">
                  <Table2 className="w-4 h-4" />
                  {t.access.myTables}
                </TabsTrigger>
                <TabsTrigger
                  value="selections"
                  className={`flex items-center gap-1.5 transition-all ${
                    highlightSelectionsTab ? "ring-2 ring-primary ring-offset-2 animate-pulse" : ""
                  }`}
                >
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
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className={`text-sm font-medium ${currentRound === assignment.round ? 'text-primary' : 'text-muted-foreground'}`}>
                              {assignment.round === 0 ? (eventLang === 'es' ? 'Ronda de bienvenida' : 'Welcome round') : `${t.access.round} ${assignment.round}`}
                            </span>
                            {currentRound === assignment.round && (
                              <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full animate-pulse">{t.access.now}</span>
                            )}
                            {(() => {
                              const dyn = getDynamicForTable(assignment.table);
                              return dyn ? (
                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-xs">
                                  🎲 {dyn.name}
                                </Badge>
                              ) : null;
                            })()}
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
                {preliminaryConfirmation === true && tableAssignments.some(a => a.round === 0) && (
                  <div className="rounded-lg border-2 border-primary/40 bg-primary/5 p-3 text-center animate-fade-in">
                    <p className="text-sm font-semibold text-primary">
                      {eventLang === 'es' ? '🎉 ¡Empieza por aquí!' : '🎉 Start here!'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {eventLang === 'es'
                        ? 'Selecciona con quién has conectado en la mesa de bienvenida y, después, en cada ronda.'
                        : 'Select who you connected with at the welcome table, then for each round.'}
                    </p>
                  </div>
                )}
                {hasReceivedSuperLike && (
                  <SuperLikeBanner language={eventLang} variant="received" />
                )}
                {hasSentSuperLike && (
                  <div className="flex items-center justify-center gap-2 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-md py-2 px-3">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    {eventLang === 'en' ? 'You have used your Super Like ⭐' : 'Has usado tu Super Like ⭐'}
                  </div>
                )}
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
                                  className={`p-3 rounded-lg transition-all ${ms.superLikedByMe
                                    ? 'bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border-2 border-amber-400 shadow-md'
                                    : ms.alreadySelected
                                      ? 'bg-green-50 dark:bg-green-950/20 border-2 border-green-500/50'
                                      : (ms.friendship || ms.dating)
                                        ? 'bg-primary/10 border-2 border-primary shadow-soft'
                                        : 'bg-muted hover:bg-muted/80 border-2 border-transparent'
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-1 gap-2">
                                    <span className="font-medium text-sm flex items-center gap-1.5">
                                      {tablemate.name}
                                      {ms.superLikedByMe && (
                                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                                      )}
                                    </span>
                                    {ms.alreadySelected && (
                                      <div className="flex items-center gap-1.5">
                                        <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs">
                                          <CheckCircle className="w-3 h-3 mr-1" />
                                          {getPreviousSelectionLabel(ms.previousSelectionType)}
                                        </Badge>
                                        {!editingKeys.has(editKey(ms.participantId, round)) && (
                                          <button
                                            type="button"
                                            onClick={() => startEditingSelection(ms.participantId, round, ms.previousSelectionType)}
                                            aria-label={eventLang === 'es' ? 'Modificar selección' : 'Modify selection'}
                                            title={eventLang === 'es' ? 'Modificar' : 'Modify'}
                                            className="p-0.5 rounded text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-colors"
                                          >
                                            <Pencil className="w-3 h-3" />
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {ms.alreadySelected && !editingKeys.has(editKey(ms.participantId, round)) ? (
                                    <p className="text-xs text-muted-foreground">{t.access.alreadySelected}</p>
                                  ) : ms.alreadySelected && editingKeys.has(editKey(ms.participantId, round)) ? (
                                    <div className="space-y-2">
                                      <div className="flex gap-4 flex-wrap">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                          <Checkbox
                                            checked={pendingEdits.get(editKey(ms.participantId, round))?.friendship || false}
                                            onCheckedChange={() => toggleEditOption(ms.participantId, round, 'friendship')}
                                          />
                                          <span className="text-sm flex items-center gap-1"><Smile className="w-3.5 h-3.5" /> {t.access.friendship}</span>
                                        </label>
                                        {ms.canShowDating && (
                                          <label className="flex items-center gap-2 cursor-pointer">
                                            <Checkbox
                                              checked={pendingEdits.get(editKey(ms.participantId, round))?.dating || false}
                                              onCheckedChange={() => toggleEditOption(ms.participantId, round, 'dating')}
                                            />
                                            <span className="text-sm flex items-center gap-1"><Heart className="w-3.5 h-3.5" /> {t.access.dating}</span>
                                          </label>
                                        )}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => cancelEditingSelection(ms.participantId, round)}
                                        className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                                      >
                                        {eventLang === 'es' ? 'Descartar cambios' : 'Discard changes'}
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="space-y-2">
                                      <div className="flex gap-4 flex-wrap">
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
                                      {!hasSentSuperLike && !ms.superLikedByMe && (
                                        <button
                                          type="button"
                                          onClick={() => openSuperLikeDialog(ms.participantId, tablemate.name, round)}
                                          className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 px-3 rounded-md border border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-950/40 text-amber-700 dark:text-amber-300 hover:from-amber-100 hover:to-yellow-100 transition-all"
                                        >
                                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                                          {eventLang === 'en' ? 'Give Super Like' : 'Dar Super Like'}
                                        </button>
                                      )}
                                      {ms.superLikedByMe && (
                                        <div className="text-xs font-semibold text-amber-700 dark:text-amber-300 inline-flex items-center gap-1">
                                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                                          {eventLang === 'en' ? 'Super Like ready to send' : 'Super Like listo para enviar'}
                                        </div>
                                      )}
                                      {repeatEnabled && (() => {
                                        const isThisRepeat = repeatRequestUsed?.targetId === ms.participantId;
                                        const repeatDisabled = !!repeatRequestUsed && !isThisRepeat;
                                        if (isThisRepeat) {
                                          return (
                                            <div className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-md bg-violet-50 dark:bg-violet-950/30 border border-violet-300 text-violet-800 dark:text-violet-200 text-xs font-semibold">
                                              <Repeat2 className="w-3.5 h-3.5" />
                                              {eventLang === 'es'
                                                ? (repeatRequestUsed?.status === 'accepted'
                                                    ? 'Repetición aceptada ✓'
                                                    : repeatRequestUsed?.status === 'declined'
                                                      ? 'Repetición rechazada'
                                                      : repeatRequestUsed?.status === 'expired'
                                                        ? 'Repetición caducada'
                                                        : 'Repetición pendiente')
                                                : (repeatRequestUsed?.status === 'accepted'
                                                    ? 'Repeat accepted ✓'
                                                    : repeatRequestUsed?.status === 'declined'
                                                      ? 'Repeat declined'
                                                      : repeatRequestUsed?.status === 'expired'
                                                        ? 'Repeat expired'
                                                        : 'Repeat pending')}
                                            </div>
                                          );
                                        }
                                        return (
                                          <button
                                            type="button"
                                            disabled={repeatDisabled}
                                            onClick={() => openRepeatDialog(ms.participantId, tablemate.name, round)}
                                            className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 px-3 rounded-md border border-violet-300 bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/20 dark:border-violet-700/40 text-violet-700 dark:text-violet-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                          >
                                            <Repeat2 className="w-3.5 h-3.5" />
                                            {eventLang === 'en' ? '🔁 Repeat with this person' : '🔁 Repetir con esta persona'}
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
                      </div>
                      );
                    })}
                  </div>
                )}

                <p className="text-sm text-center text-muted-foreground">{t.access.matchHint}</p>

                <Button variant="hero" className="w-full" onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t.access.saving}</>
                  ) : hasMeaningfulEdits() && newSelectionsCount === 0 ? (
                    <><Heart className="w-4 h-4 mr-2" />{eventLang === 'es' ? 'Guardar cambios' : 'Save changes'}</>
                  ) : (
                    <><Heart className="w-4 h-4 mr-2" />{newSelectionsCount > 0 ? `${t.access.send} ${newSelectionsCount} ${t.access.selectionsCount}` : t.access.continueWithout}</>
                  )}
                </Button>

                {newSelectionsCount === 0 && !hasMeaningfulEdits() && (
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
            <Button variant="outline" className="w-full" onClick={() => { clearSession(); setStep("verify_code"); setVerificationCode(""); setVerifiedParticipant(null); }}>{t.access.backToHome}</Button>
          </CardContent>
        </Card>
      )}

      {/* Super Like Confirmation Dialog */}
      {superLikeTarget && (
        <SuperLikeConfirmDialog
          open={!!superLikeTarget}
          onClose={() => !isSendingSuperLike && setSuperLikeTarget(null)}
          onConfirm={confirmSuperLike}
          recipientName={superLikeTarget.name}
          language={eventLang}
        />
      )}

      {/* Repeat Request Confirmation Dialog */}
      <Dialog open={!!repeatTarget} onOpenChange={(open) => { if (!open && !isSendingRepeat) setRepeatTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="w-14 h-14 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mx-auto mb-2">
              <Repeat2 className="w-7 h-7 text-violet-600 dark:text-violet-400" />
            </div>
            <DialogTitle className="text-center">
              {eventLang === 'es' ? `¿Solicitar repetir con ${repeatTarget?.name || ''}?` : `Request a repeat with ${repeatTarget?.name || ''}?`}
            </DialogTitle>
            <DialogDescription className="text-center">
              {eventLang === 'es'
                ? 'Solo puedes solicitar repetir con UNA persona en todo el evento. La otra persona recibirá un email para aceptar o rechazar la solicitud.'
                : 'You can only request a repeat with ONE person per event. The other person will receive an email to accept or decline the request.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setRepeatTarget(null)} disabled={isSendingRepeat}>
              {eventLang === 'es' ? 'Cancelar' : 'Cancel'}
            </Button>
            <Button variant="hero" className="flex-1" onClick={confirmRepeat} disabled={isSendingRepeat}>
              {isSendingRepeat ? <Loader2 className="w-4 h-4 animate-spin" /> : (eventLang === 'es' ? 'Enviar' : 'Send')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ParticipantAccess;
