import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Users, QrCode, Table2, Download, Play, CheckCircle2, Plus, Upload, Trash2, FileSpreadsheet, Loader2, UserCheck, Mail, Send, Settings2, ClipboardList, UserX, Eye, Clock, X, Check, Lock, Handshake, BarChart3, Filter, Heart, ArrowUpAZ, ArrowDownZA, RotateCcw, Ban, Search, UserMinus, History, Sparkles, Copy, MoreVertical, ChevronDown, DoorOpen, DoorClosed, ListOrdered } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import TableAssignmentModal from "@/components/event/TableAssignmentModal";
import TableEditorModal from "@/components/event/TableEditorModal";
import EventAnalytics from "@/components/event/EventAnalytics";
import EventSettingsTabs from "@/components/event/EventSettingsTabs";
import { BrandedHeader } from "@/components/BrandedHeader";
import { useOrganizer } from "@/hooks/useOrganizer";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import EmailTemplateEditor, { EmailTemplate } from "@/components/event/EmailTemplateEditor";
import MatchesDashboard from "@/components/event/MatchesDashboard";
import SelectionProgress from "@/components/event/SelectionProgress";
import SelectionsViewer from "@/components/event/SelectionsViewer";
import EmailManagement from "@/components/event/EmailManagement";
import InlineEmailEditor from "@/components/event/InlineEmailEditor";
import ParticipantCard from "@/components/event/ParticipantCard";
import CloseEventDialog from "@/components/event/CloseEventDialog";
import ParticipantDetailModal from "@/components/event/ParticipantDetailModal";
import EditParticipantModal from "@/components/event/EditParticipantModal";
import ScheduleEmailDialog from "@/components/event/ScheduleEmailDialog";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import RoundTimer from "@/components/event/RoundTimer";
import EventQRCode from "@/components/event/EventQRCode";
import AddParticipantModal from "@/components/event/AddParticipantModal";
import AddProfessionalParticipantModal, { type ProfessionalParticipant as ModalProfessionalParticipant } from "@/components/event/AddProfessionalParticipantModal";
import ExcelPreviewModal from "@/components/event/ExcelPreviewModal";
import ExclusionsManager from "@/components/event/ExclusionsManager";
import { parseExcelFile, Participant } from "@/lib/excelParser";
import { exportMatchesToCSV, exportMatchesToExcel } from "@/lib/exportMatches";
import { exportTableAssignmentsToExcel } from "@/lib/exportTableAssignments";
import { supabase } from "@/integrations/supabase/client";
import { useGlobalParticipants } from "@/hooks/useGlobalParticipants";
import { useFeatures } from "@/hooks/useFeatures";
import { FeatureGate } from "@/components/FeatureGate";
import { generateB2BTables, b2bToStandardTableFormat, validateB2BParticipants, type ProfessionalParticipant as B2BParticipant } from "@/lib/b2bTableGenerator";

interface ParticipantExclusion {
  id: string;
  participant_1_id: string;
  participant_2_id: string;
  reason: string | null;
}
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ProfessionalConfig {
  rotation_type: "client_fixed" | "provider_fixed";
  sectors?: string[];
  predefined_needs?: string[];
  predefined_solutions?: string[];
}

interface EventData {
  id: string;
  name: string;
  date: string;
  rounds: number;
  table_size: number;
  round_duration: number;
  participants_count: number;
  original_participants_count: number | null;
  status: string;
  tables: any;
  rotation_mode: "fixed_host" | "all_rotate";
  gender_parity: boolean;
  avoid_previous_encounters: boolean;
  avoid_encounters_mode: "preference" | "strict";
  email_template: EmailTemplate | null;
  emails_sent_at: string | null;
  scheduled_email_at: string | null;
  custom_age_ranges: string[] | null;
  custom_genders: string[] | null;
  custom_preferences: string[] | null;
  custom_dating_preferences: string[] | null;
  round_started_at: string | null;
  round_paused_at: string | null;
  round_elapsed_seconds: number;
  module: "social" | "professional";
  language: string;
  registration_subtitle: string | null;
  registration_description: string | null;
  event_time: string | null;
  event_location: string | null;
  professional_config: ProfessionalConfig | null;
  group_rounds: Array<{ round: number; table_size: number; allow_repeats?: boolean }> | null;
  checkin_opens_minutes_before: number;
  checkin_open: boolean;
  super_like_enabled: boolean;
  code_send_mode: string;
  registration_open: boolean;
  waitlist_enabled: boolean;
  preliminary_round: { enabled: boolean; tables: any[][]; started_at: string | null; closed_at?: string | null; confirmations?: Record<string, boolean>; dismissed_tables?: number[] } | null;
  reminder_mode: string;
  reminder_scheduled_at: string | null;
}

interface DbParticipant {
  id: string;
  name: string;
  email: string | null;
  age: number | null;
  age_range: string | null;
  preferred_age_range: string | null;
  preference: string | null;
  dating_preference: string | null;
  gender: string | null;
  phone: string | null;
  checked_in: boolean;
  verification_code: string | null;
  selection_submitted_at?: string | null;
  global_participant_id?: string | null;
  created_at?: string;
  // Professional fields
  company_name?: string | null;
  entity_type?: string | null;
  sector?: string | null;
  company_size?: string | null;
  needs?: string[] | null;
  solutions?: string[] | null;
  business_interests?: string[] | null;
}

interface Match {
  participant1: DbParticipant;
  participant2: DbParticipant;
  matchTypes: {
    friendship: boolean;
    dating: boolean;
  };
}

interface Selection {
  selector_id: string;
  selected_id: string;
  selection_type: string | null;
}

interface TableGenerationResult {
  tables: any[];
  hasIncomplete: boolean;
  incompleteInfo: string;
}

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { linkParticipantsToGlobal, loadPreviousEncounters, recordEncounters } = useGlobalParticipants();
  const { hasFeature, isSuperAdmin } = useFeatures();
  const { branding } = useOrganizer();
  
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [participants, setParticipants] = useState<DbParticipant[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selections, setSelections] = useState<Selection[]>([]);
  const [showQR, setShowQR] = useState(false);
  const [showJoinQR, setShowJoinQR] = useState(false);
  const [showCheckinQR, setShowCheckinQR] = useState(false);
  const [showTablesQR, setShowTablesQR] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentRound, setCurrentRound] = useState(1);
  const [viewingRound, setViewingRound] = useState(1); // For viewing table distribution
  const [eventStatus, setEventStatus] = useState<"pending" | "active" | "completed">("pending");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingExcel, setIsLoadingExcel] = useState(false);
  const [excelPreview, setExcelPreview] = useState<{participants: Participant[], errors: string[]} | null>(null);
  const [pendingTableGeneration, setPendingTableGeneration] = useState<TableGenerationResult | null>(null);
  const [showTableConfirmDialog, setShowTableConfirmDialog] = useState(false);
  const [showEmailEditor, setShowEmailEditor] = useState(false);
  const [isSendingEmails, setIsSendingEmails] = useState(false);
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [showCloseEventDialog, setShowCloseEventDialog] = useState(false);
  const [isClosingEvent, setIsClosingEvent] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<DbParticipant | null>(null);
  const [editingParticipant, setEditingParticipant] = useState<DbParticipant | null>(null);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [completedRounds, setCompletedRounds] = useState<number[]>([]);
  const [showExclusionsManager, setShowExclusionsManager] = useState(false);
  const [exclusions, setExclusions] = useState<ParticipantExclusion[]>([]);
  const [previousEncounters, setPreviousEncounters] = useState<Map<string, Set<string>>>(new Map());
  const [showCopyEventDialog, setShowCopyEventDialog] = useState(false);
  const [isCopyingEvent, setIsCopyingEvent] = useState(false);
  const [showTableAssignmentModal, setShowTableAssignmentModal] = useState(false);
  const [pendingNewParticipant, setPendingNewParticipant] = useState<DbParticipant | null>(null);
  const [waitlistEntries, setWaitlistEntries] = useState<any[]>([]);
  const [showTableEditor, setShowTableEditor] = useState(false);
  const [editingRoundData, setEditingRoundData] = useState<any>(null);
  
  
  // Participant filters - Social
  const [filterGender, setFilterGender] = useState<string>("all");
  const [filterAgeRange, setFilterAgeRange] = useState<string>("all");
  const [filterPreferredAgeRange, setFilterPreferredAgeRange] = useState<string>("all");
  const [filterPreference, setFilterPreference] = useState<string>("all");
  const [filterCheckin, setFilterCheckin] = useState<"all" | "confirmed" | "pending">("all");
  const [sortOrder, setSortOrder] = useState<"none" | "asc" | "desc">("none");
  const [sortByDate, setSortByDate] = useState<"none" | "newest" | "oldest">("none");
  const [sortByCheckin, setSortByCheckin] = useState<"none" | "confirmed-first" | "pending-first">("none");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [showFilters, setShowFilters] = useState<boolean>(false);
  
  // Participant filters - Professional
  const [filterEntityType, setFilterEntityType] = useState<string>("all");
  const [filterSector, setFilterSector] = useState<string>("all");
  
  // Helper to determine if this is a professional event
  const isProfessionalEvent = eventData?.module === "professional";

  useEffect(() => {
    loadEventData();
  }, [id]);

  // Auto-refresh participants every 3 seconds, especially useful during check-in
  useEffect(() => {
    if (!id || isLoading) return;

    const refreshParticipants = async () => {
      const { data: participantsData } = await supabase
        .from("participants")
        .select("*")
        .eq("event_id", id);

      if (participantsData) {
        setParticipants(participantsData);
      }
    };

    const interval = setInterval(refreshParticipants, 3000);
    return () => clearInterval(interval);
  }, [id, isLoading]);

  const loadEventData = async () => {
    if (!id) return;

    // Load event
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .single();

    if (eventError || !event) {
      setIsLoading(false);
      return;
    }

    setEventData({
      ...event,
      rotation_mode: (event.rotation_mode as "fixed_host" | "all_rotate") || "fixed_host",
      gender_parity: event.gender_parity || false,
      avoid_previous_encounters: event.avoid_previous_encounters || false,
      avoid_encounters_mode: (event.avoid_encounters_mode as "preference" | "strict") || "preference",
      email_template: event.email_template as unknown as EmailTemplate | null,
      emails_sent_at: event.emails_sent_at,
      scheduled_email_at: event.scheduled_email_at,
      custom_age_ranges: event.custom_age_ranges as string[] | null,
      custom_genders: event.custom_genders as string[] | null,
      custom_preferences: event.custom_preferences as string[] | null,
      custom_dating_preferences: event.custom_dating_preferences as string[] | null,
      round_started_at: event.round_started_at || null,
      round_paused_at: event.round_paused_at || null,
      round_elapsed_seconds: event.round_elapsed_seconds || 0,
      module: (event.module as "social" | "professional") || "social",
      language: event.language || "es",
      professional_config: event.professional_config as unknown as ProfessionalConfig | null,
      group_rounds: event.group_rounds as unknown as Array<{ round: number; table_size: number; allow_repeats?: boolean }> | null,
      checkin_opens_minutes_before: (event as any).checkin_opens_minutes_before ?? 60,
      checkin_open: (event as any).checkin_open ?? false,
      super_like_enabled: event.super_like_enabled ?? false,
      code_send_mode: (event as any).code_send_mode ?? 'on_registration',
      registration_open: (event as any).registration_open ?? true,
      waitlist_enabled: (event as any).waitlist_enabled ?? false,
      preliminary_round: (event as any).preliminary_round as EventData['preliminary_round'] ?? null,
      reminder_mode: (event as any).reminder_mode ?? 'manual',
      reminder_scheduled_at: (event as any).reminder_scheduled_at ?? null,
    });
    setEventStatus(event.status as "pending" | "active" | "completed");
    // Load current_round and completed_rounds from database
    const loadedRound = event.current_round || 1;
    setCurrentRound(loadedRound);
    setViewingRound(loadedRound);
    setCompletedRounds(event.completed_rounds || []);

    // Load participants
    const { data: participantsData } = await supabase
      .from("participants")
      .select("*")
      .eq("event_id", id);

    if (participantsData) {
      setParticipants(participantsData);
    }

    // Load matches (mutual selections) with selection types
    const { data: selectionsData } = await supabase
      .from("participant_selections")
      .select("selector_id, selected_id, selection_type")
      .eq("event_id", id);

    if (selectionsData && participantsData) {
      // Build set of participant IDs in dismissed preliminary tables
      const prelimRound = (event as any).preliminary_round;
      const dismissedPrelimParticipantIds = new Set<string>();
      if (prelimRound?.enabled && Array.isArray(prelimRound.tables) && Array.isArray(prelimRound.dismissed_tables)) {
        for (const dismissedIdx of prelimRound.dismissed_tables) {
          const table = prelimRound.tables[dismissedIdx];
          if (Array.isArray(table)) {
            table.forEach((p: any) => dismissedPrelimParticipantIds.add(p.id));
          }
        }
      }

      // Filter out selections where both parties are from dismissed preliminary tables
      const filteredSelections = selectionsData.filter(sel => {
        if (dismissedPrelimParticipantIds.has(sel.selector_id) && dismissedPrelimParticipantIds.has(sel.selected_id)) {
          return false;
        }
        return true;
      });

      // Store raw selections
      setSelections(filteredSelections);
      
      const mutualMatches: Match[] = [];
      const processed = new Set<string>();

      filteredSelections.forEach(sel => {
        const key = [sel.selector_id, sel.selected_id].sort().join('-');
        if (processed.has(key)) return;

        const reverse = filteredSelections.find(
          s => s.selector_id === sel.selected_id && s.selected_id === sel.selector_id
        );

        if (reverse) {
          const p1 = participantsData.find(p => p.id === sel.selector_id);
          const p2 = participantsData.find(p => p.id === sel.selected_id);
          if (p1 && p2) {
            // Determine match types based on both selections
            const sel1Type = sel.selection_type || 'friendship';
            const sel2Type = reverse.selection_type || 'friendship';
            
            // Check if each type matches - 'both' counts for both friendship and dating
            const sel1HasFriendship = sel1Type === 'friendship' || sel1Type === 'both';
            const sel2HasFriendship = sel2Type === 'friendship' || sel2Type === 'both';
            const sel1HasDating = sel1Type === 'dating' || sel1Type === 'both';
            const sel2HasDating = sel2Type === 'dating' || sel2Type === 'both';
            
            const matchTypes = {
              friendship: sel1HasFriendship && sel2HasFriendship,
              dating: sel1HasDating && sel2HasDating,
            };
            
            mutualMatches.push({ participant1: p1, participant2: p2, matchTypes });
          }
          processed.add(key);
        }
      });

      setMatches(mutualMatches);
    }

    // Load exclusions
    const { data: exclusionsData } = await supabase
      .from("participant_exclusions")
      .select("*")
      .eq("event_id", id);

    if (exclusionsData) {
      setExclusions(exclusionsData);
    }

    // Load waitlist
    const { data: waitlistData } = await supabase
      .from("event_waitlist" as any)
      .select("*")
      .eq("event_id", id)
      .order("position", { ascending: true });

    if (waitlistData) {
      setWaitlistEntries(waitlistData as any[]);
    }

    setIsLoading(false);
  };

  // Generate tables based on participants (stored or new)
  const generateTables = () => {
    // Use stored tables if available
    if (eventData?.tables && Array.isArray(eventData.tables) && eventData.tables.length > 0) {
      return eventData.tables;
    }
    
    if (participants.length < 2) return [];
    
    const tables = [];
    const numRounds = Math.min(eventData?.rounds || 5, participants.length - 1);
    
    for (let round = 1; round <= numRounds; round++) {
      const roundTables = [];
      const shuffled = [...participants].sort(() => Math.random() - 0.5);
      
      for (let i = 0; i < shuffled.length; i += 2) {
        if (i + 1 < shuffled.length) {
          roundTables.push([shuffled[i], shuffled[i + 1]]);
        }
      }
      
      tables.push({ round, tables: roundTables });
    }
    
    return tables;
  };

  const initiateTableGeneration = async () => {
    // Filter only checked-in participants
    const checkedInParticipants = participants.filter(p => p.checked_in);
    
    if (checkedInParticipants.length < 2) {
      toast({
        title: "Error",
        description: "Necesitas al menos 2 participantes con check-in para iniciar el evento",
        variant: "destructive",
      });
      return;
    }

    // Link participants to global participants and load previous encounters if enabled
    let encountersMap = new Map<string, Set<string>>();
    
    if (eventData?.avoid_previous_encounters) {
      toast({
        title: "Preparando...",
        description: "Vinculando participantes y cargando historial de encuentros",
      });
      
      // Link all checked-in participants to global participants
      const linkMap = await linkParticipantsToGlobal(
        checkedInParticipants.map(p => ({
          id: p.id,
          name: p.name,
          email: p.email,
          phone: p.phone
        }))
      );
      
      // Update local participants with global_participant_id
      const updatedParticipants = checkedInParticipants.map(p => ({
        ...p,
        global_participant_id: linkMap.get(p.id) || null
      }));
      
      // Load previous encounters for the global participant IDs
      const globalIds = Array.from(linkMap.values()).filter(Boolean);
      if (globalIds.length > 0) {
        const globalEncounters = await loadPreviousEncounters(globalIds);
        
        // Convert global encounters to event participant encounters
        // We need to map global IDs back to event participant IDs
        const globalToEventMap = new Map<string, string>();
        linkMap.forEach((globalId, eventId) => {
          if (globalId) globalToEventMap.set(globalId, eventId);
        });
        
        // Build encounters map using event participant IDs
        globalEncounters.forEach((partners, globalId) => {
          const eventId = globalToEventMap.get(globalId);
          if (eventId) {
            const eventPartners = new Set<string>();
            partners.forEach(partnerGlobalId => {
              const partnerEventId = globalToEventMap.get(partnerGlobalId);
              if (partnerEventId) eventPartners.add(partnerEventId);
            });
            if (eventPartners.size > 0) {
              encountersMap.set(eventId, eventPartners);
            }
          }
        });
        
        setPreviousEncounters(encountersMap);
        
        if (encountersMap.size > 0) {
          const totalPairs = Array.from(encountersMap.values()).reduce((sum, set) => sum + set.size, 0) / 2;
          toast({
            title: "Historial cargado",
            description: `Se encontraron ${Math.round(totalPairs)} pares de participantes que ya coincidieron`,
          });
        }
      }
      
      // Update checked-in participants with global IDs
      setParticipants(prev => prev.map(p => ({
        ...p,
        global_participant_id: linkMap.get(p.id) || p.global_participant_id
      })));
    }

    // Check if this is a professional event - use B2B generator
    if (isProfessionalEvent) {
      // Validate B2B participants
      const b2bParticipants: B2BParticipant[] = checkedInParticipants.map(p => ({
        id: p.id,
        name: p.name,
        email: p.email,
        phone: p.phone,
        company_name: p.company_name,
        entity_type: p.entity_type as "client" | "provider" | null,
        sector: p.sector,
        company_size: p.company_size,
        needs: p.needs,
        solutions: p.solutions,
        business_interests: p.business_interests,
        checked_in: p.checked_in,
        global_participant_id: p.global_participant_id,
      }));

      const validation = validateB2BParticipants(b2bParticipants);
      if (!validation.valid) {
        toast({
          title: "Validación B2B fallida",
          description: validation.warnings.join(". "),
          variant: "destructive",
        });
        return;
      }

      const rotationType = eventData?.professional_config?.rotation_type || "client_fixed";
      const b2bResult = generateB2BTables(
        b2bParticipants,
        eventData?.rounds || 5,
        rotationType,
        eventData?.avoid_previous_encounters ? encountersMap : undefined
      );

      if (b2bResult.warnings.length > 0) {
        toast({
          title: "Advertencias en generación",
          description: b2bResult.warnings.slice(0, 3).join(". "),
        });
      }

      const standardTables = b2bToStandardTableFormat(b2bResult);
      await finalizeTableGeneration(standardTables, checkedInParticipants);
      return;
    }

    // Generate smart tables based on preferences, passing previous encounters (Social mode)
    const result = generateSmartTables(
      checkedInParticipants, 
      eventData?.rounds || 5, 
      eventData?.table_size || 2, 
      false, 
      eventData?.gender_parity || false,
      eventData?.avoid_previous_encounters ? encountersMap : undefined,
      eventData?.avoid_encounters_mode || "preference",
      eventData?.group_rounds || undefined
    );
    
    if (result.hasIncomplete) {
      // Show confirmation dialog asking what to do
      setPendingTableGeneration(result);
      setShowTableConfirmDialog(true);
    } else {
      // No issues, proceed directly
      await finalizeTableGeneration(result.tables, checkedInParticipants);
    }
  };

  const finalizeTableGeneration = async (generatedTables: any[], checkedInParticipants: DbParticipant[]) => {
    // Store original participants count BEFORE filtering
    const originalCount = participants.length;
    
    // Keep non-checked-in participants as bench (don't delete them)
    // Mark them as no-show in global_participants for CRM tracking
    const nonCheckedInParticipants = participants.filter(p => !p.checked_in);
    const noShowGlobalIds = nonCheckedInParticipants
      .filter(p => p.global_participant_id)
      .map(p => p.global_participant_id as string);
    
    if (noShowGlobalIds.length > 0) {
      await supabase
        .from("global_participants")
        .update({ status: "no_show", updated_at: new Date().toISOString() })
        .in("id", noShowGlobalIds);
    }

    // Save tables and update status, set current_round to 1 to start
    // Also save original_participants_count for no-show analytics
    // Close preliminary round if active
    const updatePayload: any = { 
      tables: generatedTables,
      status: "active",
      participants_count: checkedInParticipants.length,
      original_participants_count: originalCount,
      current_round: 1
    };
    
    if (eventData?.preliminary_round?.enabled && (eventData.preliminary_round.tables || []).length > 0) {
      updatePayload.preliminary_round = {
        ...eventData.preliminary_round,
        closed_at: new Date().toISOString(),
      };
    }
    
    await supabase
      .from("events")
      .update(updatePayload)
      .eq("id", id);
    
    // Record encounters for intelligent exclusions in future events
    if (eventData?.avoid_previous_encounters && id) {
      // Build table data with global participant IDs for recording
      const tableDataForRecording: Array<{
        round: number;
        tableNumber: number;
        participants: Array<{ id: string; global_participant_id?: string | null }>;
      }> = [];
      
      for (const roundData of generatedTables) {
        for (let tableIdx = 0; tableIdx < roundData.tables.length; tableIdx++) {
          const tableParticipants = roundData.tables[tableIdx].map((p: { id: string }) => {
            const fullParticipant = checkedInParticipants.find(cp => cp.id === p.id);
            return {
              id: p.id,
              global_participant_id: fullParticipant?.global_participant_id || null
            };
          });
          
          tableDataForRecording.push({
            round: roundData.round,
            tableNumber: tableIdx + 1,
            participants: tableParticipants
          });
        }
      }
      
      const recordSuccess = await recordEncounters(id, tableDataForRecording);
      if (recordSuccess) {
        console.log("Encounters recorded successfully for future events");
      }
    }
    
    setCurrentRound(1);

    // Keep all participants in state (bench + active)
    setParticipants(participants);
    setEventData(prev => prev ? { 
      ...prev, 
      tables: generatedTables, 
      participants_count: checkedInParticipants.length,
      original_participants_count: originalCount 
    } : prev);
    setEventStatus("active");
    setPendingTableGeneration(null);
    setShowTableConfirmDialog(false);
    toast({
      title: "Evento iniciado",
      description: `${nonCheckedInParticipants.length > 0 ? `${nonCheckedInParticipants.length} participantes sin check-in en el banco. ` : ""}Las mesas han sido generadas.`,
    });
  };

  const handleConfirmWithRelax = async () => {
    if (!pendingTableGeneration) return;
    
    const checkedInParticipants = participants.filter(p => p.checked_in);
    // Generate tables with relaxed constraints (fill with similar preferences)
    // Pass previous encounters if enabled
    const result = generateSmartTables(
      checkedInParticipants, 
      eventData?.rounds || 5, 
      eventData?.table_size || 2, 
      true, 
      eventData?.gender_parity || false,
      eventData?.avoid_previous_encounters ? previousEncounters : undefined,
      eventData?.avoid_encounters_mode || "preference",
      eventData?.group_rounds || undefined
    );
    await finalizeTableGeneration(result.tables, checkedInParticipants);
  };

  const handleConfirmWithIncomplete = async () => {
    if (!pendingTableGeneration) return;
    
    const checkedInParticipants = participants.filter(p => p.checked_in);
    await finalizeTableGeneration(pendingTableGeneration.tables, checkedInParticipants);
  };

  // Age range order for adjacency calculation - normalized format
  // Include custom age ranges from event if available
  const getAgeRangeOrder = (): string[] => {
    const defaultOrder = ["18-24", "25-32", "33-40", "41-50", "50+"];
    if (eventData?.custom_age_ranges && eventData.custom_age_ranges.length > 0) {
      // Normalize custom ranges to match format
      return eventData.custom_age_ranges.map(r => 
        r.replace(/–/g, "-").replace(/\+ ?(\d+)/g, "$1+").trim()
      );
    }
    return defaultOrder;
  };

  // Normalize age range for consistent grouping
  const normalizeAgeRangeForGrouping = (ageRange: string | null): string => {
    if (!ageRange) return "Sin especificar";
    const normalized = ageRange
      .replace(/–/g, "-")
      .replace(/\+ ?(\d+)/g, "$1+")
      .trim();
    const order = getAgeRangeOrder();
    return order.find(r => normalized === r || normalized.includes(r.replace("+", "")) && r.includes("+")) || normalized;
  };

  const getAgeRangeIndex = (ageRange: string | null): number => {
    if (!ageRange) return -1;
    const normalized = normalizeAgeRangeForGrouping(ageRange);
    const order = getAgeRangeOrder();
    const idx = order.indexOf(normalized);
    // If not found, try to find by partial match
    if (idx === -1) {
      for (let i = 0; i < order.length; i++) {
        if (normalized.includes(order[i].replace("+", "")) || order[i].includes(normalized.replace("+", ""))) {
          return i;
        }
      }
    }
    return idx;
  };

  const getAgeRangeDistance = (age1: string | null, age2: string | null): number => {
    const idx1 = getAgeRangeIndex(age1);
    const idx2 = getAgeRangeIndex(age2);
    if (idx1 === -1 || idx2 === -1) return 0; // Unknown = treat as same
    return Math.abs(idx1 - idx2);
  };

  // Check if two participants are compatible based on age preferences
  // STRICT: Only allow if they are in the same/adjacent age range OR explicitly selected as preference
  const areAgeCompatible = (p1: DbParticipant, p2: DbParticipant): boolean => {
    const age1 = normalizeAgeRangeForGrouping(p1.age_range);
    const age2 = normalizeAgeRangeForGrouping(p2.age_range);
    
    // Same age range = always compatible
    if (age1 === age2) return true;
    
    // Check if distance is only 1 (adjacent ranges)
    const distance = getAgeRangeDistance(p1.age_range, p2.age_range);
    if (distance <= 1) return true;
    
    // Check if p1 explicitly prefers p2's age range
    const p1PrefersP2 = p1.preferred_age_range?.includes("Cualquier") || 
                        p1.preferred_age_range?.includes(age2) ||
                        p1.preferred_age_range?.toLowerCase().includes("any");
    
    // Check if p2 explicitly prefers p1's age range
    const p2PrefersP1 = p2.preferred_age_range?.includes("Cualquier") || 
                        p2.preferred_age_range?.includes(age1) ||
                        p2.preferred_age_range?.toLowerCase().includes("any");
    
    // Both must have explicitly selected each other's age range for large gaps
    return p1PrefersP2 && p2PrefersP1;
  };

  // Check if two participants are excluded from being at the same table
  const areExcluded = (p1Id: string, p2Id: string): boolean => {
    return exclusions.some(
      (e) =>
        (e.participant_1_id === p1Id && e.participant_2_id === p2Id) ||
        (e.participant_1_id === p2Id && e.participant_2_id === p1Id)
    );
  };

  // Smart table generation algorithm based on preferences
  // Supports two modes: fixed_host (one stays) or all_rotate (everyone moves)
  const generateSmartTables = (
    participantsList: DbParticipant[], 
    numRounds: number, 
    tableSize: number,
    relaxConstraints: boolean = false,
    genderParity: boolean = false,
    previousEncountersMap?: Map<string, Set<string>>,
    avoidEncountersMode: "preference" | "strict" = "preference",
    groupRoundsConfig?: Array<{ round: number; table_size: number }>
  ): TableGenerationResult => {
    const rotationMode = eventData?.rotation_mode || "fixed_host";
    
    if (rotationMode === "all_rotate") {
      return generateAllRotateTables(participantsList, numRounds, tableSize, relaxConstraints, genderParity, previousEncountersMap, avoidEncountersMode, groupRoundsConfig);
    } else {
      return generateFixedHostTables(participantsList, numRounds, tableSize, relaxConstraints, genderParity, previousEncountersMap, avoidEncountersMode, groupRoundsConfig);
    }
  };

  // Helper function to count genders in a table
  const countTableGenders = (tableMembers: { id: string; name: string }[], participantsList: DbParticipant[]) => {
    let men = 0;
    let women = 0;
    let other = 0;
    
    for (const member of tableMembers) {
      const participant = participantsList.find(p => p.id === member.id);
      if (participant?.gender === "Hombre") men++;
      else if (participant?.gender === "Mujer") women++;
      else other++;
    }
    
    return { men, women, other };
  };

  // Helper function to check if adding a participant would maintain gender balance
  const wouldMaintainGenderBalance = (
    participant: DbParticipant, 
    tableMembers: { id: string; name: string }[], 
    participantsList: DbParticipant[],
    targetSize: number,
    menAvailable: number,
    womenAvailable: number
  ): boolean => {
    const { men, women } = countTableGenders(tableMembers, participantsList);
    const targetPerGender = Math.floor(targetSize / 2);
    
    // If minority gender, always allow
    const participantGender = participant.gender;
    
    if (participantGender === "Hombre") {
      // Check if we still need men
      if (men < targetPerGender) return true;
      // If we have enough men, only add if we can't find women
      if (womenAvailable === 0 && women >= targetPerGender) return true;
      return false;
    } else if (participantGender === "Mujer") {
      // Check if we still need women
      if (women < targetPerGender) return true;
      // If we have enough women, only add if we can't find men
      if (menAvailable === 0 && men >= targetPerGender) return true;
      return false;
    }
    
    // Non-binary or unknown - always allow
    return true;
  };

  // Calculate optimal table distribution to avoid tables with only 2 people
  const calculateOptimalTableDistribution = (
    numParticipants: number,
    maxTableSize: number,
    minTableSize: number = 3
  ): { numTables: number; sizes: number[] } => {
    if (numParticipants <= maxTableSize) {
      return { numTables: 1, sizes: [numParticipants] };
    }

    // Calculate initial distribution
    let numTables = Math.ceil(numParticipants / maxTableSize);
    let lastTableSize = numParticipants - (numTables - 1) * maxTableSize;

    // If last table would have fewer than minTableSize, redistribute
    while (lastTableSize < minTableSize && lastTableSize > 0 && numTables > 1) {
      numTables++;
      lastTableSize = numParticipants - (numTables - 1) * Math.floor(numParticipants / numTables);
    }

    // Calculate balanced sizes
    const baseSize = Math.floor(numParticipants / numTables);
    const remainder = numParticipants % numTables;

    const sizes = Array(numTables).fill(baseSize);
    for (let i = 0; i < remainder; i++) {
      sizes[i]++;
    }

    return { numTables, sizes };
  };

  // Group participants by age range first for better table assignment
  const groupParticipantsByAgeRange = (participantsList: DbParticipant[]): Map<string, DbParticipant[]> => {
    const groups = new Map<string, DbParticipant[]>();
    const ageRangeOrder = getAgeRangeOrder();
    
    // Initialize groups in order
    ageRangeOrder.forEach(range => groups.set(range, []));
    groups.set("Sin especificar", []);
    
    participantsList.forEach(p => {
      const ageRange = normalizeAgeRangeForGrouping(p.age_range);
      if (groups.has(ageRange)) {
        groups.get(ageRange)!.push(p);
      } else {
        groups.get("Sin especificar")!.push(p);
      }
    });
    
    return groups;
  };

  // Merge small age groups with the CLOSEST age group (not just previous)
  const mergeSmallAgeGroups = (groups: Map<string, DbParticipant[]>, minSize: number): DbParticipant[][] => {
    const orderedGroups: { range: string; participants: DbParticipant[] }[] = [];
    
    const ageRangeOrder = getAgeRangeOrder();
    ageRangeOrder.forEach(range => {
      const group = groups.get(range) || [];
      if (group.length > 0) {
        orderedGroups.push({ range, participants: [...group] });
      }
    });
    
    // Add unspecified at the end
    const unspecified = groups.get("Sin especificar") || [];
    if (unspecified.length > 0) {
      orderedGroups.push({ range: "Sin especificar", participants: [...unspecified] });
    }
    
    // Merge small groups with closest neighbor
    for (let i = 0; i < orderedGroups.length; i++) {
      if (orderedGroups[i].participants.length < minSize && orderedGroups[i].participants.length > 0) {
        let bestMergeIdx = -1;
        let bestDistance = Infinity;
        
        for (let j = 0; j < orderedGroups.length; j++) {
          if (i !== j && orderedGroups[j].participants.length > 0) {
            const distance = Math.abs(i - j);
            if (distance < bestDistance) {
              bestDistance = distance;
              bestMergeIdx = j;
            }
          }
        }
        
        if (bestMergeIdx !== -1) {
          orderedGroups[bestMergeIdx].participants.push(...orderedGroups[i].participants);
          orderedGroups[i].participants = [];
        }
      }
    }
    
    return orderedGroups
      .filter(g => g.participants.length > 0)
      .map(g => g.participants);
  };

  // All rotate mode: everyone changes tables each round
  const generateAllRotateTables = (
    participantsList: DbParticipant[], 
    numRounds: number, 
    tableSize: number,
    relaxConstraints: boolean = false,
    genderParity: boolean = false,
    previousEncountersMap?: Map<string, Set<string>>,
    avoidEncountersMode: "preference" | "strict" = "preference",
    groupRoundsConfig?: Array<{ round: number; table_size: number }>
  ): TableGenerationResult => {
    const tables = [];
    const numParticipants = participantsList.length;
    
    // Group by age range first, then create tables within groups
    const ageGroups = groupParticipantsByAgeRange(participantsList);
    const mergedGroups = mergeSmallAgeGroups(ageGroups, tableSize);
    
    // Flatten while maintaining age ordering
    const sortedParticipants = mergedGroups.flat();
    
    // Use optimal distribution to avoid tables with only 2 people
    const distribution = calculateOptimalTableDistribution(numParticipants, tableSize, 3);
    const numTables = distribution.numTables;
    const tableSizes = distribution.sizes;
    
    // Track who has been paired with whom across all rounds
    // Pre-populate with previous encounters if available
    const pairedHistory = new Map<string, Set<string>>();
    participantsList.forEach(p => {
      const prevEncounters = previousEncountersMap?.get(p.id);
      pairedHistory.set(p.id, prevEncounters ? new Set(prevEncounters) : new Set());
    });
    
    let hasIncomplete = false;
    
    for (let round = 1; round <= numRounds; round++) {
      // Check if this is a group round
      const groupRoundConfig = groupRoundsConfig?.find(g => g.round === round);
      const isGroupRound = !!groupRoundConfig;
      const effectiveTableSize = isGroupRound ? groupRoundConfig.table_size : tableSize;
      const effectiveDistribution = isGroupRound 
        ? calculateOptimalTableDistribution(numParticipants, effectiveTableSize, 3)
        : distribution;
      const effectiveNumTables = effectiveDistribution.numTables;
      const effectiveTableSizes = effectiveDistribution.sizes;

      const roundTables: { id: string; name: string }[][] = [];
      const usedParticipants = new Set<string>();
      
      // Create tables for this round
      for (let tableIdx = 0; tableIdx < effectiveNumTables; tableIdx++) {
        const table: { id: string; name: string }[] = [];
        const targetSize = effectiveTableSizes[tableIdx] || Math.min(effectiveTableSize, numParticipants - usedParticipants.size);
        
        // Find best participants for this table
        const availableParticipants = sortedParticipants.filter(p => !usedParticipants.has(p.id));
        
        // Count available genders for parity
        const menAvailable = availableParticipants.filter(p => p.gender === "Hombre").length;
        const womenAvailable = availableParticipants.filter(p => p.gender === "Mujer").length;
        
        for (const participant of availableParticipants) {
          if (table.length >= targetSize) break;
          
          // Check gender parity if enabled
          if (genderParity && table.length > 0) {
            const remainingMen = availableParticipants.filter(p => !usedParticipants.has(p.id) && p.gender === "Hombre").length;
            const remainingWomen = availableParticipants.filter(p => !usedParticipants.has(p.id) && p.gender === "Mujer").length;
            
            if (!wouldMaintainGenderBalance(participant, table, participantsList, targetSize, remainingMen, remainingWomen)) {
              continue;
            }
          }
          
          // Check compatibility with existing table members
          let canJoin = true;
          
          // Check exclusions first - these are absolute restrictions
          for (const member of table) {
            if (areExcluded(participant.id, member.id)) {
              canJoin = false;
              break;
            }
          }
          
           // STRICT AGE CHECK: Must be compatible with all existing table members
          // Skip repetition check for group rounds (allow repetitions)
          if (canJoin && !relaxConstraints && !isGroupRound && table.length > 0) {
            for (const member of table) {
              const memberParticipant = participantsList.find(p => p.id === member.id);
              if (memberParticipant && !areAgeCompatible(participant, memberParticipant)) {
                canJoin = false;
                break;
              }
              if (pairedHistory.get(participant.id)?.has(member.id)) {
                canJoin = false;
                break;
              }
            }
          }
          
          if (canJoin || table.length === 0) {
            table.push({ id: participant.id, name: participant.name });
            usedParticipants.add(participant.id);
          }
        }
        
        // Fill remaining if relaxed - but still try to maintain age compatibility and respect exclusions
        if ((relaxConstraints || genderParity) && table.length < targetSize) {
          // Sort by age compatibility first, prefer non-repeats
          const remainingParticipants = availableParticipants
            .filter(p => {
              if (usedParticipants.has(p.id)) return false;
              // Always respect exclusions even in relaxed mode
              for (const member of table) {
                if (areExcluded(p.id, member.id)) return false;
              }
              return true;
            })
            .sort((a, b) => {
              // Prefer participants who haven't been paired with table members
              const aRepeats = table.some(m => pairedHistory.get(m.id)?.has(a.id));
              const bRepeats = table.some(m => pairedHistory.get(m.id)?.has(b.id));
              if (!aRepeats && bRepeats) return -1;
              if (aRepeats && !bRepeats) return 1;
              // Then prefer participants closer in age to existing table members
              let aScore = 0, bScore = 0;
              for (const member of table) {
                const memberP = participantsList.find(p => p.id === member.id);
                if (memberP) {
                  aScore += areAgeCompatible(a, memberP) ? 10 : 0;
                  bScore += areAgeCompatible(b, memberP) ? 10 : 0;
                  aScore -= getAgeRangeDistance(a.age_range, memberP.age_range);
                  bScore -= getAgeRangeDistance(b.age_range, memberP.age_range);
                }
              }
              return bScore - aScore;
            });
          
          for (const participant of remainingParticipants) {
            if (table.length >= targetSize) break;
            table.push({ id: participant.id, name: participant.name });
            usedParticipants.add(participant.id);
          }
        }
        
        if (table.length < Math.min(2, targetSize)) {
          hasIncomplete = true;
        }
        
        // Record pairings
        for (let i = 0; i < table.length; i++) {
          for (let j = i + 1; j < table.length; j++) {
            pairedHistory.get(table[i].id)?.add(table[j].id);
            pairedHistory.get(table[j].id)?.add(table[i].id);
          }
        }
        
        if (table.length > 0) {
          roundTables.push(table);
        }
      }
      
      // Shuffle for next round
      const first = sortedParticipants.shift()!;
      sortedParticipants.push(first);
      
      tables.push({ round, tables: roundTables });
    }
    
    return {
      tables,
      hasIncomplete,
      incompleteInfo: hasIncomplete ? "Algunas mesas no pudieron completarse evitando repeticiones." : "",
    };
  };

  // Fixed host mode: one person stays at each table, others rotate
  const generateFixedHostTables = (
    participantsList: DbParticipant[], 
    numRounds: number, 
    tableSize: number,
    relaxConstraints: boolean = false,
    genderParity: boolean = false,
    previousEncountersMap?: Map<string, Set<string>>,
    avoidEncountersMode: "preference" | "strict" = "preference",
    groupRoundsConfig?: Array<{ round: number; table_size: number }>
  ): TableGenerationResult => {
    const tables = [];
    const numParticipants = participantsList.length;
    
    // Use optimal distribution to avoid tables with only 2 people
    const distribution = calculateOptimalTableDistribution(numParticipants, tableSize, 3);
    const numTables = distribution.numTables;
    const tableSizes = distribution.sizes;
    
    // Track who has been paired with whom across all rounds
    // Pre-populate with previous encounters if available
    const pairedHistory = new Map<string, Set<string>>();
    participantsList.forEach(p => {
      const prevEncounters = previousEncountersMap?.get(p.id);
      pairedHistory.set(p.id, prevEncounters ? new Set(prevEncounters) : new Set());
    });
    
    // Group by age range first for better host selection
    const ageGroups = groupParticipantsByAgeRange(participantsList);
    const mergedGroups = mergeSmallAgeGroups(ageGroups, tableSize);
    const sortedParticipants = mergedGroups.flat();
    
    // Select hosts evenly from each age group
    const hosts: DbParticipant[] = [];
    const hostIndices = new Set<number>();
    
    // Try to pick one host from each merged group
    for (const group of mergedGroups) {
      if (hosts.length >= numTables) break;
      // Pick from middle of group for better distribution
      const pickIdx = Math.floor(group.length / 2);
      const host = group[pickIdx];
      hosts.push(host);
      hostIndices.add(sortedParticipants.indexOf(host));
    }
    
    // Fill remaining hosts from sorted list
    for (let i = 0; hosts.length < numTables && i < sortedParticipants.length; i++) {
      if (!hostIndices.has(i)) {
        hosts.push(sortedParticipants[i]);
        hostIndices.add(i);
      }
    }
    
    const rotators = sortedParticipants.filter((_, idx) => !hostIndices.has(idx));
    
    let hasIncomplete = false;
    
    const actualRounds = Math.min(numRounds, rotators.length > 0 ? rotators.length : 1);
    
    for (let round = 1; round <= actualRounds; round++) {
      // Check if this is a group round
      const groupRoundConfig = groupRoundsConfig?.find(g => g.round === round);
      const isGroupRound = !!groupRoundConfig;
      const effectiveTableSize = isGroupRound ? groupRoundConfig.table_size : tableSize;
      const effectiveDistribution = isGroupRound 
        ? calculateOptimalTableDistribution(numParticipants, effectiveTableSize, 3)
        : distribution;
      const effectiveTableSizes = effectiveDistribution.sizes;

      const roundTables: { id: string; name: string }[][] = [];
      const usedRotators = new Set<string>();
      
      // For group rounds, use all participants (no host separation)
      if (isGroupRound) {
        const usedParticipants = new Set<string>();
        const effectiveNumTables = effectiveDistribution.numTables;
        const shuffled = [...participantsList].sort(() => Math.random() - 0.5);
        
        for (let tableIdx = 0; tableIdx < effectiveNumTables; tableIdx++) {
          const table: { id: string; name: string }[] = [];
          const targetSize = effectiveTableSizes[tableIdx] || effectiveTableSize;
          
          for (const p of shuffled) {
            if (table.length >= targetSize) break;
            if (usedParticipants.has(p.id)) continue;
            // Only check exclusions, allow repetitions
            let excluded = false;
            for (const member of table) {
              if (areExcluded(p.id, member.id)) { excluded = true; break; }
            }
            if (!excluded) {
              table.push({ id: p.id, name: p.name });
              usedParticipants.add(p.id);
            }
          }
          
          // Record pairings even for group rounds
          for (let i = 0; i < table.length; i++) {
            for (let j = i + 1; j < table.length; j++) {
              pairedHistory.get(table[i].id)?.add(table[j].id);
              pairedHistory.get(table[j].id)?.add(table[i].id);
            }
          }
          
          if (table.length > 0) roundTables.push(table);
        }
        
        tables.push({ round, tables: roundTables });
        continue;
      }
      
      for (let tableIdx = 0; tableIdx < hosts.length; tableIdx++) {
        const host = hosts[tableIdx];
        const table: { id: string; name: string }[] = [{ id: host.id, name: host.name }];
        
        const targetSize = effectiveTableSizes[tableIdx] || effectiveTableSize;
        const seatsNeeded = targetSize - 1;
        
        const availableRotators = rotators.filter(r => !usedRotators.has(r.id));
        
        // Count available genders for parity
        const menAvailable = availableRotators.filter(r => r.gender === "Hombre").length;
        const womenAvailable = availableRotators.filter(r => r.gender === "Mujer").length;

        // Filter out excluded rotators first
        const validRotators = availableRotators.filter(rotator => {
          // Check exclusion with host
          if (areExcluded(host.id, rotator.id)) return false;
          // Check exclusion with other table members
          for (const member of table) {
            if (areExcluded(rotator.id, member.id)) return false;
          }
          return true;
        });

        const scoredRotators = validRotators.map(rotator => {
          let score = calculateCompatibilityScore(host, rotator);
          
          // STRICT AGE CHECK: Use areAgeCompatible function
          const isAgeCompatible = areAgeCompatible(host, rotator);
          
          if (isAgeCompatible) {
            score += 100; // Large bonus for age compatibility
          } else if (!relaxConstraints) {
            score -= 200; // Large penalty if not compatible and not relaxed
          }
          
          // Additional bonus for same age range
          const hostAgeIdx = getAgeRangeIndex(host.age_range);
          const rotatorAgeIdx = getAgeRangeIndex(rotator.age_range);
          const ageDist = Math.abs(hostAgeIdx - rotatorAgeIdx);
          
          if (ageDist === 0) score += 50;      // Same age range: highest bonus
          else if (ageDist === 1) score += 25; // Adjacent: good bonus
          else if (ageDist >= 3) score -= 50;  // Very different: bigger penalty
          
          // Check compatibility with other table members
          table.forEach(member => {
            const memberParticipant = participantsList.find(p => p.id === member.id);
            if (memberParticipant) {
              const isMemberAgeCompatible = areAgeCompatible(rotator, memberParticipant);
              if (isMemberAgeCompatible) {
                score += 30;
              } else if (!relaxConstraints) {
                score -= 50;
              }
            }
          });
          
          // Penalty for repetition
          if (pairedHistory.get(host.id)?.has(rotator.id)) {
            score -= 80;
          }
          
          table.forEach(member => {
            if (pairedHistory.get(member.id)?.has(rotator.id)) {
              score -= 40;
            }
          });
          
          // Add gender parity bonus/penalty
          if (genderParity) {
            const { men, women } = countTableGenders(table, participantsList);
            const targetPerGender = Math.floor(targetSize / 2);
            
            if (rotator.gender === "Hombre" && men < targetPerGender) {
              score += 10;
            } else if (rotator.gender === "Mujer" && women < targetPerGender) {
              score += 10;
            } else if (rotator.gender === "Hombre" && men >= targetPerGender && womenAvailable > 0) {
              score -= 20;
            } else if (rotator.gender === "Mujer" && women >= targetPerGender && menAvailable > 0) {
              score -= 20;
            }
          }
          
          return { rotator, score, isAgeCompatible };
        }).sort((a, b) => b.score - a.score);
        
        let filledSeats = 0;
        for (const { rotator, score, isAgeCompatible } of scoredRotators) {
          if (filledSeats >= seatsNeeded) break;
          if (usedRotators.has(rotator.id)) continue;
          
          const wouldRepeat = pairedHistory.get(host.id)?.has(rotator.id) ||
                              table.some(m => pairedHistory.get(m.id)?.has(rotator.id));
          
          // STRICT: Skip if not age compatible and not relaxed mode
          if (!relaxConstraints && !isAgeCompatible) {
            continue;
          }
          
          if (wouldRepeat && !relaxConstraints) {
            continue;
          }
          
          table.push({ id: rotator.id, name: rotator.name });
          usedRotators.add(rotator.id);
          filledSeats++;
        }
        
        // Fill remaining if relaxed - prioritize by age compatibility and avoid repeats
        if ((relaxConstraints || genderParity) && filledSeats < seatsNeeded) {
          // Sort remaining: prefer non-repeats first, then age compatible
          const remainingRotators = scoredRotators
            .filter(({ rotator }) => !usedRotators.has(rotator.id))
            .sort((a, b) => {
              const aRepeats = pairedHistory.get(host.id)?.has(a.rotator.id) ||
                table.some(m => pairedHistory.get(m.id)?.has(a.rotator.id));
              const bRepeats = pairedHistory.get(host.id)?.has(b.rotator.id) ||
                table.some(m => pairedHistory.get(m.id)?.has(b.rotator.id));
              if (!aRepeats && bRepeats) return -1;
              if (aRepeats && !bRepeats) return 1;
              // Prefer age compatible first
              if (a.isAgeCompatible && !b.isAgeCompatible) return -1;
              if (!a.isAgeCompatible && b.isAgeCompatible) return 1;
              return b.score - a.score;
            });
          
          for (const { rotator } of remainingRotators) {
            if (filledSeats >= seatsNeeded) break;
            
            table.push({ id: rotator.id, name: rotator.name });
            usedRotators.add(rotator.id);
            filledSeats++;
          }
        }
        
        if (table.length < targetSize) {
          hasIncomplete = true;
        }
        
        for (let i = 0; i < table.length; i++) {
          for (let j = i + 1; j < table.length; j++) {
            pairedHistory.get(table[i].id)?.add(table[j].id);
            pairedHistory.get(table[j].id)?.add(table[i].id);
          }
        }
        
        roundTables.push(table);
      }
      
      if (rotators.length > 1) {
        const first = rotators.shift()!;
        rotators.push(first);
      }
      
      tables.push({ round, tables: roundTables });
    }
    
    return {
      tables,
      hasIncomplete,
      incompleteInfo: hasIncomplete ? "Algunas mesas no pudieron completarse con las preferencias óptimas." : "",
    };
  };

  // Calculate compatibility score between two participants
  const calculateCompatibilityScore = (p1: DbParticipant, p2: DbParticipant): number => {
    let score = 0;
    
    // PRIORITY 1: Same age range (highest priority)
    const ageDistance = getAgeRangeDistance(p1.age_range, p2.age_range);
    if (ageDistance === 0) {
      score += 10; // Same age range - highest bonus
    } else if (ageDistance === 1) {
      score += 5; // Adjacent age range - good bonus
    } else if (ageDistance === 2) {
      score += 2; // Two ranges apart - small bonus
    }
    // More than 2 ranges apart = no bonus
    
    // PRIORITY 2: Age range preferences (secondary)
    const p1AgeInP2Pref = checkAgeRangeMatch(p1.age_range, p2.preferred_age_range);
    const p2AgeInP1Pref = checkAgeRangeMatch(p2.age_range, p1.preferred_age_range);
    if (p1AgeInP2Pref && p2AgeInP1Pref) score += 3;
    else if (p1AgeInP2Pref || p2AgeInP1Pref) score += 1;
    
    // Preference compatibility (both friendship, both dating, or mixed)
    const bothFriendship = p1.preference === "Sólo amistad" && p2.preference === "Sólo amistad";
    const bothDating = p1.preference === "Amistad y ligue" && p2.preference === "Amistad y ligue";
    if (bothFriendship || bothDating) score += 2;
    
    // Dating preference compatibility (if both are looking for dating)
    if (bothDating && p1.dating_preference && p2.dating_preference) {
      if (areDatingPreferencesCompatible(p1.dating_preference, p1.gender, p2.dating_preference, p2.gender)) {
        score += 3;
      }
    }
    
    return score;
  };

  const checkAgeRangeMatch = (personAge: string | null, preferredRange: string | null): boolean => {
    if (!personAge || !preferredRange) return true; // No preference = accept all
    if (preferredRange.includes("Cualquier rango")) return true;
    return preferredRange.includes(personAge);
  };

  const areDatingPreferencesCompatible = (pref1: string, gender1: string | null, pref2: string, gender2: string | null): boolean => {
    const openPrefs = ["Estoy abierto a todo", "No binario"];
    if (openPrefs.includes(pref1) || openPrefs.includes(pref2)) return true;
    
    // Check specific preferences
    const p1LookingForWoman = pref1.includes("busco una mujer");
    const p1LookingForMan = pref1.includes("busco un hombre");
    const p2LookingForWoman = pref2.includes("busco una mujer");
    const p2LookingForMan = pref2.includes("busco un hombre");
    
    const p1IsWoman = gender1 === "Mujer" || pref1.includes("Soy una mujer");
    const p1IsMan = gender1 === "Hombre" || pref1.includes("Soy un hombre");
    const p2IsWoman = gender2 === "Mujer" || pref2.includes("Soy una mujer");
    const p2IsMan = gender2 === "Hombre" || pref2.includes("Soy un hombre");
    
    // Check mutual attraction
    if (p1LookingForWoman && p2IsWoman && p2LookingForMan && p1IsMan) return true;
    if (p1LookingForMan && p2IsMan && p2LookingForMan && p1IsMan) return true;
    if (p1LookingForWoman && p2IsWoman && p2LookingForWoman && p1IsWoman) return true;
    if (p1LookingForMan && p2IsMan && p2LookingForWoman && p1IsWoman) return true;
    
    return false;
  };

  // Helper function to normalize age range (handle both - and – characters)
  const normalizeAgeRange = (ageRange: string | null): string => {
    if (!ageRange) return "";
    // Normalize en-dash (–) to regular hyphen (-) and handle special cases
    return ageRange.replace(/–/g, "-").replace("+ 50", "50+").trim();
  };

  // Helper functions for visual display
  const getAgeRangeColor = (ageRange: string | null): string => {
    const normalized = normalizeAgeRange(ageRange);
    const colors: Record<string, string> = {
      "18-24": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
      "25-32": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
      "33-40": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
      "41-50": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
      "51-60": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
      "50+": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
      "60+": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    };
    return colors[normalized] || "bg-muted text-muted-foreground";
  };

  const getGenderIcon = (gender: string | null) => {
    if (gender === "Mujer") return <span className="text-pink-500" title="Mujer">♀</span>;
    if (gender === "Hombre") return <span className="text-blue-500" title="Hombre">♂</span>;
    if (gender === "No binario") return <span className="text-purple-500" title="No binario">⚧</span>;
    return null;
  };

  const getPreferenceIcon = (preference: string | null) => {
    if (!preference) return null;
    const pref = preference.toLowerCase();
    // Check for dating/romantic interest keywords
    if (pref.includes("pareja") || pref.includes("ligue") || pref.includes("sentimental")) {
      return <Heart className="w-3 h-3 text-pink-500" />;
    }
    // Friendship only
    if (pref.includes("amistad")) {
      return <Handshake className="w-3 h-3 text-blue-500" />;
    }
    return null;
  };

  const ageRangeColors: Record<string, string> = {
    "18-24": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    "25-32": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    "33-40": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    "41-50": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    "51-60": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
    "50+": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    "60+": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  };

  const [isSendingCode, setIsSendingCode] = useState<string | null>(null);
  const [isSendingBulkCodes, setIsSendingBulkCodes] = useState(false);
  const [bulkCodeProgress, setBulkCodeProgress] = useState<{ current: number; total: number } | null>(null);

  const handleToggleCheckin = async (participantId: string, currentStatus: boolean) => {
    if (!currentStatus) {
      // Check-in: just mark checked_in = true in DB (no email)
      const { error } = await supabase
        .from("participants")
        .update({ checked_in: true })
        .eq("id", participantId);

      if (error) {
        toast({
          title: "Error",
          description: "No se pudo realizar el check-in",
          variant: "destructive",
        });
        return;
      }

      setParticipants(participants.map(p => 
        p.id === participantId ? { ...p, checked_in: true } : p
      ));

      toast({
        title: "Check-in completado",
        description: `Check-in realizado correctamente`,
      });
    } else {
      // Undo check-in: direct UPDATE
      const { error } = await supabase
        .from("participants")
        .update({ checked_in: false })
        .eq("id", participantId);

      if (error) {
        toast({
          title: "Error",
          description: "No se pudo deshacer el check-in",
          variant: "destructive",
        });
        return;
      }

      setParticipants(participants.map(p => 
        p.id === participantId ? { ...p, checked_in: false } : p
      ));
    }
  };

  const handleSendCode = async (participantId: string) => {
    setIsSendingCode(participantId);
    try {
      const participant = participants.find(p => p.id === participantId);
      
      if (!participant?.email) {
        toast({ title: "Sin email", description: "El participante no tiene email configurado", variant: "destructive" });
        return;
      }

      // Use generate-and-send-code: generates code + sends email WITHOUT check-in
      const { data, error } = await supabase.functions.invoke('generate-and-send-code', {
        body: { eventId: id, participantId }
      });

      if (error || data?.error) {
        toast({ title: "Error", description: data?.error || "No se pudo enviar el código", variant: "destructive" });
        return;
      }

      setParticipants(prev => prev.map(p => 
        p.id === participantId ? { 
          ...p, 
          verification_code: data?.verificationCode || p.verification_code 
        } : p
      ));

      toast({
        title: data?.emailSent ? "Código enviado" : "Código generado",
        description: data?.emailSent 
          ? `Se ha enviado el código de acceso por email` 
          : "Código generado pero no se pudo enviar el email",
      });
    } finally {
      setIsSendingCode(null);
    }
  };

  const handleSendBulkCodes = async () => {
    // Send codes to all participants with email but no code (regardless of check-in status)
    const pendingParticipants = participants.filter(
      p => !p.verification_code && p.email
    );

    if (pendingParticipants.length === 0) {
      toast({
        title: "Sin códigos pendientes",
        description: "Todos los participantes con email ya tienen código",
      });
      return;
    }

    setIsSendingBulkCodes(true);
    setBulkCodeProgress({ current: 0, total: pendingParticipants.length });

    let sent = 0;
    for (const p of pendingParticipants) {
      try {
        const { data } = await supabase.functions.invoke('generate-and-send-code', {
          body: { eventId: id, participantId: p.id }
        });

        if (data?.verificationCode) {
          setParticipants(prev => prev.map(pp => 
            pp.id === p.id ? { ...pp, verification_code: data.verificationCode } : pp
          ));
        }
        sent++;
      } catch (e) {
        console.error(`Error sending code to ${p.name}:`, e);
      }
      setBulkCodeProgress({ current: sent, total: pendingParticipants.length });
      await new Promise(r => setTimeout(r, 700));
    }

    setIsSendingBulkCodes(false);
    setBulkCodeProgress(null);
    toast({
      title: "Códigos enviados",
      description: `Se enviaron ${sent} de ${pendingParticipants.length} códigos`,
    });
  };

  const tables = generateTables();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast({
        title: "Error",
        description: "Por favor, sube un archivo Excel (.xlsx o .xls)",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoadingExcel(true);
    
    try {
      const result = await parseExcelFile(file);
      setExcelPreview({
        participants: result.participants,
        errors: result.errors,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo procesar el archivo Excel",
        variant: "destructive",
      });
    } finally {
      setIsLoadingExcel(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleConfirmExcelImport = async () => {
    if (!excelPreview || !id) return;
    
    // Auto check-in if event is already active
    const autoCheckin = eventStatus === "active";
    
    const participantsToInsert = excelPreview.participants.map(p => ({
      event_id: id,
      name: p.name,
      age: p.age || null,
      age_range: p.ageRange || null,
      preferred_age_range: p.preferredAgeRange || null,
      preference: p.preference || null,
      dating_preference: p.datingPreference || null,
      gender: p.gender || null,
      phone: p.phone || null,
      email: p.email || null,
      checked_in: autoCheckin,
    }));

    const { data: newParticipants, error } = await supabase
      .from("participants")
      .insert(participantsToInsert)
      .select();

    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron añadir los participantes",
        variant: "destructive",
      });
      return;
    }

    if (newParticipants) {
      setParticipants([...participants, ...newParticipants]);
      
      // Update participant count
      await supabase
        .from("events")
        .update({ participants_count: participants.length + newParticipants.length })
        .eq("id", id);

      // Auto-send codes to participants with email
      const withEmail = newParticipants.filter((p: any) => p.email);
      if (withEmail.length > 0) {
        toast({
          title: "Participantes cargados",
          description: `Se han añadido ${excelPreview.participants.length} participantes. Enviando códigos...`,
        });
        
        // Send codes in background
        for (const p of withEmail) {
          try {
            const { data } = await supabase.functions.invoke('generate-and-send-code', {
              body: { eventId: id, participantId: p.id }
            });
            if (data?.verificationCode) {
              setParticipants(prev => prev.map(pp => 
                pp.id === p.id ? { ...pp, verification_code: data.verificationCode } : pp
              ));
            }
          } catch (e) {
            console.error(`Error sending code to ${p.name}:`, e);
          }
          await new Promise(r => setTimeout(r, 700));
        }

        toast({
          title: "Códigos enviados",
          description: `Se enviaron códigos a ${withEmail.length} participantes`,
        });
      } else {
        toast({
          title: "Participantes cargados",
          description: `Se han añadido ${excelPreview.participants.length} participantes`,
        });
      }
    }
    
    setExcelPreview(null);
  };

  const handleAddParticipant = async (participant: Participant) => {
    if (!id) return;

    // Auto check-in if event is already active
    const autoCheckin = eventStatus === "active";

    const { data: newParticipant, error } = await supabase
      .from("participants")
      .insert({
        event_id: id,
        name: participant.name,
        email: participant.email || null,
        age: participant.age || null,
        age_range: participant.ageRange || null,
        preferred_age_range: participant.preferredAgeRange || null,
        preference: participant.preference || null,
        dating_preference: participant.datingPreference || null,
        gender: participant.gender || null,
        phone: participant.phone || null,
        checked_in: autoCheckin,
        birth_date: participant.birthDate || null,
        is_returning_participant: participant.isReturningParticipant || false,
      })
      .select()
      .single();

    if (error || !newParticipant) {
      toast({
        title: "Error",
        description: "No se pudo añadir el participante",
        variant: "destructive",
      });
      return;
    }

    setParticipants([...participants, newParticipant]);
    
    // Update participant count
    await supabase
      .from("events")
      .update({ participants_count: participants.length + 1 })
      .eq("id", id);
    
    // If event is active with tables, open table assignment modal
    if (eventStatus === "active" && eventData?.tables && Array.isArray(eventData.tables) && eventData.tables.length > 0) {
      setPendingNewParticipant(newParticipant);
      setShowTableAssignmentModal(true);
    } else {
      toast({
        title: "Participante añadido",
        description: autoCheckin 
          ? `${participant.name} ha sido añadido y confirmado automáticamente (evento activo)`
          : `${participant.name} ha sido añadido al evento`,
      });
    }

    // Auto-send emails if participant has email
    if (newParticipant.email) {
      try {
        // Send registration confirmation email
        await supabase.functions.invoke('send-registration-confirmation', {
          body: { eventId: id, participantId: newParticipant.id }
        });

        // Generate and send access code
        const { data } = await supabase.functions.invoke('generate-and-send-code', {
          body: { eventId: id, participantId: newParticipant.id }
        });
        if (data?.verificationCode) {
          setParticipants(prev => prev.map(p => 
            p.id === newParticipant.id ? { ...p, verification_code: data.verificationCode } : p
          ));
          toast({
            title: "Emails enviados",
            description: `Se ha enviado la confirmación y el código de acceso a ${participant.name}`,
          });
        }
      } catch (e) {
        console.error('Error sending emails:', e);
      }
    }
  };

  const handleAddProfessionalParticipant = async (participant: ModalProfessionalParticipant) => {
    if (!id) return;

    // Auto check-in if event is already active
    const autoCheckin = eventStatus === "active";

    const { data: newParticipant, error } = await supabase
      .from("participants")
      .insert({
        event_id: id,
        name: participant.name,
        email: participant.email || null,
        phone: participant.phone || null,
        company_name: participant.companyName || null,
        entity_type: participant.entityType || null,
        sector: participant.sector || null,
        company_size: participant.companySize || null,
        needs: participant.needs || null,
        solutions: participant.solutions || null,
        business_interests: participant.businessInterests ? [participant.businessInterests] : null,
        checked_in: autoCheckin,
      })
      .select()
      .single();

    if (error || !newParticipant) {
      toast({
        title: "Error",
        description: "No se pudo añadir el participante",
        variant: "destructive",
      });
      return;
    }

    setParticipants([...participants, newParticipant]);
    
    // Update participant count
    await supabase
      .from("events")
      .update({ participants_count: participants.length + 1 })
      .eq("id", id);
    
    // If event is active with tables, open table assignment modal
    if (eventStatus === "active" && eventData?.tables && Array.isArray(eventData.tables) && eventData.tables.length > 0) {
      setPendingNewParticipant(newParticipant);
      setShowTableAssignmentModal(true);
    } else {
      toast({
        title: "Participante añadido",
        description: autoCheckin 
          ? `${participant.companyName} ha sido añadido y confirmado automáticamente (evento activo)`
          : `${participant.companyName} ha sido añadido al evento`,
      });
    }

    // Auto-send emails if participant has email
    if (newParticipant.email) {
      try {
        // Send registration confirmation email
        await supabase.functions.invoke('send-registration-confirmation', {
          body: { eventId: id, participantId: newParticipant.id }
        });

        // Generate and send access code
        const { data } = await supabase.functions.invoke('generate-and-send-code', {
          body: { eventId: id, participantId: newParticipant.id }
        });
        if (data?.verificationCode) {
          setParticipants(prev => prev.map(p => 
            p.id === newParticipant.id ? { ...p, verification_code: data.verificationCode } : p
          ));
        }
      } catch (e) {
        console.error('Error sending emails:', e);
      }
    }
  };

  const handleDeleteParticipant = async (participantId: string) => {
    // Get global_participant_id before deleting
    const deletedParticipant = participants.find(p => p.id === participantId);
    const globalId = deletedParticipant?.global_participant_id;

    const { error } = await supabase
      .from("participants")
      .delete()
      .eq("id", participantId);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el participante",
        variant: "destructive",
      });
      return;
    }

    const newParticipants = participants.filter(p => p.id !== participantId);
    setParticipants(newParticipants);
    
    // Update participant count
    await supabase
      .from("events")
      .update({ participants_count: newParticipants.length })
      .eq("id", id);

    // Update global_participant status to 'removed'
    if (globalId) {
      await supabase
        .from("global_participants")
        .update({ status: "removed", updated_at: new Date().toISOString() })
        .eq("id", globalId);
    }
    
    toast({
      title: "Participante eliminado",
      description: "El participante ha sido eliminado del evento",
    });

    // Auto-promote from waitlist if enabled (FIFO)
    if (eventData?.waitlist_enabled && waitlistEntries.some(w => w.status === 'waiting')) {
      await handleAutoPromoteWaitlist();
    }
  };

  const handleAutoPromoteWaitlist = async () => {
    const nextInLine = waitlistEntries.find(w => w.status === 'waiting');
    if (!nextInLine) return;
    await handlePromoteFromWaitlist(nextInLine);
  };

  const handlePromoteFromWaitlist = async (entry: any) => {
    if (!id) return;

    try {
      // Insert as participant via edge function to handle verification code generation
      const { data, error } = await supabase.functions.invoke('register-participant', {
        body: {
          eventId: id,
          name: entry.name,
          email: entry.email,
          phone: entry.phone || '',
          gender: entry.gender || '',
          birthDate: entry.birth_date || '',
          preference: entry.preference || '',
          datingPreference: entry.dating_preference || '',
          preferredAgeRange: entry.preferred_age_range || '',
          isReturningParticipant: entry.is_returning_participant || false,
          // B2B fields
          isProfessional: !!entry.entity_type,
          entityType: entry.entity_type,
          companyName: entry.company_name,
          sector: entry.sector,
          companySize: entry.company_size,
          needs: entry.needs,
          solutions: entry.solutions,
          fromWaitlist: true,
        }
      });

      if (error || data?.error) {
        toast({
          title: "Error",
          description: data?.error || "No se pudo inscribir al participante",
          variant: "destructive",
        });
        return;
      }

      // Update waitlist entry status
      await supabase
        .from("event_waitlist" as any)
        .update({ status: 'promoted', promoted_at: new Date().toISOString() } as any)
        .eq("id", entry.id);

      // Send notification email to promoted participant
      try {
        await supabase.functions.invoke('send-registration-confirmation', {
          body: { eventId: id, participantId: data.participantId, fromWaitlist: true }
        });
      } catch (e) {
        console.error('Error sending waitlist promotion email:', e);
      }

      // Refresh data
      setWaitlistEntries(prev => prev.map(w => w.id === entry.id ? { ...w, status: 'promoted' } : w));
      await loadEventData();

      toast({
        title: "Participante inscrito",
        description: `${entry.name} ha sido promovido de la lista de espera`,
      });
    } catch (err) {
      console.error('Error promoting from waitlist:', err);
      toast({
        title: "Error",
        description: "Error al promover participante de la lista de espera",
        variant: "destructive",
      });
    }
  };

  const handleCheckInAll = async () => {
    const { error } = await supabase
      .from("participants")
      .update({ checked_in: true })
      .eq("event_id", id);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo hacer check-in a todos",
        variant: "destructive",
      });
      return;
    }

    setParticipants(participants.map(p => ({ ...p, checked_in: true })));
    toast({
      title: "Check-in completado",
      description: `Se ha hecho check-in a ${participants.length} participantes`,
    });
  };

  const handleDeleteAllParticipants = async () => {
    // Collect global_participant_ids before deleting
    const globalIds = participants
      .map(p => p.global_participant_id)
      .filter((gid): gid is string => !!gid);

    const { error } = await supabase
      .from("participants")
      .delete()
      .eq("event_id", id);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron eliminar los participantes",
        variant: "destructive",
      });
      return;
    }

    setParticipants([]);
    
    await supabase
      .from("events")
      .update({ participants_count: 0 })
      .eq("id", id);

    // Mark all global_participants as 'removed'
    if (globalIds.length > 0) {
      await supabase
        .from("global_participants")
        .update({ status: "removed", updated_at: new Date().toISOString() })
        .in("id", globalIds);
    }

    toast({
      title: "Participantes eliminados",
      description: "Todos los participantes han sido eliminados",
    });
  };

  const handleUpdateParticipant = (updatedParticipant: Partial<DbParticipant> & { id: string }) => {
    setParticipants(participants.map(p => 
      p.id === updatedParticipant.id ? { ...p, ...updatedParticipant } : p
    ));
    setEditingParticipant(null);
    setSelectedParticipant(null);
  };

  // Get dominant age range for a table
  const getTableAgeRangeInfo = (tableMembers: { id: string; name: string }[]): { dominant: string; isMixed: boolean } => {
    const ageRanges: Record<string, number> = {};
    
    tableMembers.forEach(member => {
      const participant = participants.find(p => p.id === member.id);
      const ageRange = normalizeAgeRange(participant?.age_range) || "Desconocido";
      ageRanges[ageRange] = (ageRanges[ageRange] || 0) + 1;
    });

    const entries = Object.entries(ageRanges);
    if (entries.length === 0) return { dominant: "Desconocido", isMixed: false };
    
    const sorted = entries.sort((a, b) => b[1] - a[1]);
    const isMixed = sorted.length > 1;
    
    return { 
      dominant: sorted[0][0], 
      isMixed 
    };
  };

  const handleStartEvent = async () => {
    await initiateTableGeneration();
  };

  const handleAddEmptyTable = async () => {
    if (!eventData?.tables || !Array.isArray(eventData.tables)) return;

    // Add an empty table to all pending (non-completed) rounds
    const updatedTables = (eventData.tables as any[]).map((roundData: any) => {
      if (completedRounds.includes(roundData.round)) return roundData;
      return {
        ...roundData,
        tables: [...roundData.tables, []],
      };
    });

    const { error } = await supabase
      .from("events")
      .update({ tables: updatedTables })
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo añadir la mesa",
        variant: "destructive",
      });
      return;
    }

    await loadEventData();
    toast({
      title: "Mesa añadida",
      description: "Se ha añadido una mesa vacía a las rondas pendientes. Ahora puedes añadir participantes a ella.",
    });
  };

  const handleAddRound = async () => {
    if (!eventData?.tables || !Array.isArray(eventData.tables) || !id) return;
    const currentTables = eventData.tables as any[];
    const newRoundNumber = currentTables.length + 1;
    
    // Create new round with empty tables matching the structure of existing rounds
    const existingTableCount = currentTables[0]?.tables?.length || Math.ceil(participants.filter(p => p.checked_in).length / (eventData.table_size || 4));
    const newRound = {
      round: newRoundNumber,
      tables: Array.from({ length: Math.max(existingTableCount, 1) }, () => []),
    };

    const updatedTables = [...currentTables, newRound];
    const newRoundsCount = eventData.rounds + 1;

    const { error } = await supabase
      .from("events")
      .update({ tables: updatedTables, rounds: newRoundsCount })
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: "No se pudo añadir la ronda", variant: "destructive" });
      return;
    }

    setEventData(prev => prev ? { ...prev, tables: updatedTables, rounds: newRoundsCount } : prev);
    setViewingRound(newRoundNumber);
    toast({ title: "Ronda añadida", description: `Ronda ${newRoundNumber} creada con mesas vacías. Puedes asignar participantes desde el editor de mesas.` });
  };

  const handleDeleteRound = async (roundNumber: number) => {
    if (!eventData?.tables || !Array.isArray(eventData.tables) || !id) return;
    const currentTables = eventData.tables as any[];
    if (currentTables.length <= 1) {
      toast({ title: "No permitido", description: "Debe haber al menos una ronda", variant: "destructive" });
      return;
    }

    // Remove the round and re-number subsequent rounds
    const updatedTables = currentTables
      .filter((rd: any) => rd.round !== roundNumber)
      .map((rd: any, idx: number) => ({ ...rd, round: idx + 1 }));

    const newRoundsCount = updatedTables.length;
    const newCurrentRound = Math.min(currentRound, newRoundsCount);
    const newCompletedRounds = completedRounds
      .filter(r => r !== roundNumber)
      .map(r => {
        // Re-map completed round numbers
        const original = currentTables.findIndex((t: any) => t.round === r);
        return original >= 0 ? updatedTables[currentTables.slice(0, original + 1).filter((t: any) => t.round !== roundNumber).length - 1]?.round || r : r;
      })
      .filter(r => r <= newRoundsCount);

    // Simpler approach: recalculate completed rounds based on new numbering
    const originalOrder = currentTables.map((t: any) => t.round);
    const keptOriginalRounds = originalOrder.filter((r: number) => r !== roundNumber);
    const remappedCompleted = completedRounds
      .filter(r => r !== roundNumber)
      .map(r => keptOriginalRounds.indexOf(r) + 1)
      .filter(r => r > 0);

    const { error } = await supabase
      .from("events")
      .update({ 
        tables: updatedTables, 
        rounds: newRoundsCount, 
        current_round: newCurrentRound,
        completed_rounds: remappedCompleted,
      })
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: "No se pudo eliminar la ronda", variant: "destructive" });
      return;
    }

    setEventData(prev => prev ? { ...prev, tables: updatedTables, rounds: newRoundsCount } : prev);
    setCurrentRound(newCurrentRound);
    setCompletedRounds(remappedCompleted);
    setViewingRound(Math.min(viewingRound, newRoundsCount));
    toast({ title: "Ronda eliminada", description: `Se eliminó la ronda ${roundNumber} y se renumeraron las restantes.` });
  };

  const markNoShowParticipants = async () => {
    const noShowGlobalIds = participants
      .filter(p => !p.checked_in && p.global_participant_id)
      .map(p => p.global_participant_id as string);
    
    if (noShowGlobalIds.length > 0) {
      await supabase
        .from("global_participants")
        .update({ status: "no_show", updated_at: new Date().toISOString() })
        .in("id", noShowGlobalIds);
    }
  };

  const handleEndEvent = async () => {
    await supabase
      .from("events")
      .update({ status: "completed" })
      .eq("id", id);

    // Mark participants who didn't check in as no-show
    await markNoShowParticipants();

    setEventStatus("completed");
    setShowQR(true);
    toast({
      title: "Evento finalizado",
      description: "El código QR está disponible para los participantes",
    });
  };

  const handleSaveEmailTemplate = async (template: EmailTemplate) => {
    if (!id) return;
    
    const { error } = await supabase
      .from("events")
      .update({ email_template: JSON.parse(JSON.stringify(template)) })
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar la plantilla",
        variant: "destructive",
      });
      return;
    }

    setEventData(prev => prev ? { ...prev, email_template: template } : prev);
    toast({
      title: "Plantilla guardada",
      description: "La plantilla de email ha sido guardada correctamente",
    });
  };

  const handleSendEmails = async () => {
    if (!id) return;
    
    setIsSendingEmails(true);
    
    try {
      // Get current session for authorization
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error("No estás autenticado");
      }

      const { data, error } = await supabase.functions.invoke('send-match-emails', {
        body: { 
          event_id: id, 
          email_template: eventData?.email_template 
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      // Reload event data to get updated emails_sent_at
      await loadEventData();

      const totalSent = (data?.stats?.withMatches || 0) + (data?.stats?.withoutMatches || 0);
      const totalFailed = data?.stats?.failed || 0;
      
      toast({
        title: "Emails enviados",
        description: `Se enviaron ${totalSent} emails correctamente${totalFailed > 0 ? `. ${totalFailed} fallidos.` : "."}`,
      });
    } catch (error: any) {
      console.error("Error sending emails:", error);
      toast({
        title: "Error al enviar emails",
        description: error.message || "No se pudieron enviar los emails",
        variant: "destructive",
      });
    } finally {
      setIsSendingEmails(false);
    }
  };

  const handleSendReminder = async (participantIds: string[]) => {
    if (!id || participantIds.length === 0) return;
    
    setIsSendingReminder(true);
    
    try {
      // Get current session for authorization
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error("No estás autenticado");
      }

      const { data, error } = await supabase.functions.invoke('send-reminder-email', {
        body: { 
          event_id: id, 
          participant_ids: participantIds 
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Recordatorios enviados",
        description: `Se enviaron ${data?.stats?.sent || 0} recordatorios correctamente`,
      });
    } catch (error: any) {
      console.error("Error sending reminders:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudieron enviar los recordatorios",
        variant: "destructive",
      });
    } finally {
      setIsSendingReminder(false);
    }
  };

  const handleScheduleEmails = async (scheduledDate: Date) => {
    if (!id) return;
    
    setIsScheduling(true);
    
    try {
      const { error } = await supabase
        .from("events")
        .update({ scheduled_email_at: scheduledDate.toISOString() })
        .eq("id", id);

      if (error) throw error;

      setEventData(prev => prev ? { ...prev, scheduled_email_at: scheduledDate.toISOString() } : null);
      setShowScheduleDialog(false);
      
      toast({
        title: "Envío programado",
        description: `Los emails se enviarán el ${scheduledDate.toLocaleDateString("es-ES", {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        })}`,
      });
    } catch (error: any) {
      console.error("Error scheduling emails:", error);
      toast({
        title: "Error",
        description: "No se pudo programar el envío",
        variant: "destructive",
      });
    } finally {
      setIsScheduling(false);
    }
  };

  const handleCancelScheduledEmails = async () => {
    if (!id) return;
    
    setIsScheduling(true);
    
    try {
      const { error } = await supabase
        .from("events")
        .update({ scheduled_email_at: null })
        .eq("id", id);

      if (error) throw error;

      setEventData(prev => prev ? { ...prev, scheduled_email_at: null } : null);
      setShowScheduleDialog(false);
      
      toast({
        title: "Programación cancelada",
        description: "El envío programado ha sido cancelado",
      });
    } catch (error: any) {
      console.error("Error canceling scheduled emails:", error);
      toast({
        title: "Error",
        description: "No se pudo cancelar la programación",
        variant: "destructive",
      });
    } finally {
      setIsScheduling(false);
    }
  };

  const handleCloseAndSchedule = async (deadlineHours: number = 48) => {
    if (!id) return;
    
    setIsClosingEvent(true);
    
    try {
      const now = new Date();
      const scheduledAt = new Date(now.getTime() + deadlineHours * 60 * 60 * 1000);

      await supabase
        .from("events")
        .update({ 
          status: "completed", 
          selection_deadline_hours: deadlineHours,
          scheduled_email_at: scheduledAt.toISOString(),
        })
        .eq("id", id);

      // Mark no-show participants
      await markNoShowParticipants();

      setEventStatus("completed");
      await loadEventData();
      setShowCloseEventDialog(false);
      setShowQR(true);
      
      toast({
        title: "Evento cerrado",
        description: `Los emails de resultados se enviarán automáticamente en ${deadlineHours}h (${scheduledAt.toLocaleString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}).`,
      });
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo cerrar el evento",
        variant: "destructive",
      });
    } finally {
      setIsClosingEvent(false);
    }
  };

  const handleCloseAndSendNow = async () => {
    if (!id) return;
    
    setIsClosingEvent(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error("No estás autenticado");
      }

      await supabase
        .from("events")
        .update({ 
          status: "completed", 
          selection_closed_at: new Date().toISOString(),
        })
        .eq("id", id);

      // Mark no-show participants
      await markNoShowParticipants();

      setEventStatus("completed");
      
      const { data, error } = await supabase.functions.invoke('send-match-emails', {
        body: { 
          event_id: id, 
          email_template: eventData?.email_template 
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      await loadEventData();

      toast({
        title: "Evento cerrado y emails enviados",
        description: `Se enviaron ${data?.stats?.withMatches + data?.stats?.withoutMatches || 0} emails correctamente`,
      });
      
      setShowCloseEventDialog(false);
      setShowQR(true);
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error.message || "Ocurrió un error",
        variant: "destructive",
      });
    } finally {
      setIsClosingEvent(false);
    }
  };

  const handleUpdateParticipantEmail = (participantId: string, newEmail: string) => {
    setParticipants(participants.map(p => 
      p.id === participantId ? { ...p, email: newEmail } : p
    ));
  };

  const handleCopyEvent = async (withParticipants: boolean) => {
    if (!eventData || !id) return;
    setIsCopyingEvent(true);
    
    try {
      // Get organizer_id from current event
      const { data: currentEvent } = await supabase
        .from("events")
        .select("organizer_id")
        .eq("id", id)
        .single();

      const { data: newEvent, error: eventError } = await supabase
        .from("events")
        .insert({
          name: `${eventData.name} (copia)`,
          date: eventData.date,
          rounds: eventData.rounds,
          table_size: eventData.table_size,
          round_duration: eventData.round_duration,
          rotation_mode: eventData.rotation_mode,
          gender_parity: eventData.gender_parity,
          avoid_previous_encounters: eventData.avoid_previous_encounters,
          avoid_encounters_mode: eventData.avoid_encounters_mode,
          custom_age_ranges: eventData.custom_age_ranges as any,
          custom_genders: eventData.custom_genders as any,
          custom_preferences: eventData.custom_preferences as any,
          custom_dating_preferences: eventData.custom_dating_preferences as any,
          email_template: eventData.email_template as any,
          module: eventData.module,
          professional_config: eventData.professional_config as any,
          organizer_id: currentEvent?.organizer_id || null,
          status: "pending",
          participants_count: 0,
          current_round: 0,
          completed_rounds: [],
        })
        .select()
        .single();

      if (eventError || !newEvent) throw eventError;

      if (withParticipants) {
        const participantsToInsert = participants.map(p => ({
          event_id: newEvent.id,
          name: p.name,
          email: p.email,
          phone: p.phone,
          age: p.age,
          age_range: p.age_range,
          preferred_age_range: p.preferred_age_range,
          preference: p.preference,
          dating_preference: p.dating_preference,
          gender: p.gender,
          company_name: p.company_name,
          entity_type: p.entity_type,
          sector: p.sector,
          company_size: p.company_size,
          needs: p.needs,
          solutions: p.solutions,
          business_interests: p.business_interests,
          checked_in: false,
          verification_code: null,
          selection_submitted_at: null,
        }));

        const { error: pError } = await supabase
          .from("participants")
          .insert(participantsToInsert);

        if (pError) throw pError;

        await supabase
          .from("events")
          .update({ participants_count: participants.length })
          .eq("id", newEvent.id);
      }

      toast({
        title: "Evento copiado",
        description: withParticipants 
          ? `Se copió el evento con ${participants.length} participantes`
          : "Se copió la configuración del evento",
      });
      setShowCopyEventDialog(false);
      navigate(`/admin/events/${newEvent.id}`);
    } catch (error: any) {
      console.error("Error copying event:", error);
      toast({
        title: "Error",
        description: "No se pudo copiar el evento",
        variant: "destructive",
      });
    } finally {
      setIsCopyingEvent(false);
    }
  };

  const handleTableAssignmentConfirm = async (updatedTables: any[]) => {
    if (!id || !pendingNewParticipant) return;

    const { error } = await supabase
      .from("events")
      .update({ tables: updatedTables })
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: "No se pudieron actualizar las mesas", variant: "destructive" });
      return;
    }

    setEventData(prev => prev ? { ...prev, tables: updatedTables } : prev);
    setShowTableAssignmentModal(false);
    
    const displayName = pendingNewParticipant.company_name || pendingNewParticipant.name;
    toast({
      title: "Participante asignado a mesas",
      description: `${displayName} ha sido asignado a las mesas correctamente`,
    });
    setPendingNewParticipant(null);
  };

  const handleTableEditorSave = async (updatedRoundData: any) => {
    if (!id || !eventData?.tables) return;
    const updatedTables = (eventData.tables as any[]).map((rd: any) =>
      rd.round === updatedRoundData.round ? updatedRoundData : rd
    );
    const { error } = await supabase
      .from("events")
      .update({ tables: updatedTables })
      .eq("id", id);
    if (error) {
      toast({ title: "Error", description: "No se pudieron guardar los cambios", variant: "destructive" });
      return;
    }
    setEventData(prev => prev ? { ...prev, tables: updatedTables } : prev);
    setShowTableEditor(false);
    setEditingRoundData(null);
    toast({ title: "Mesas actualizadas", description: `Ronda ${updatedRoundData.round} actualizada correctamente` });
  };


  // Separate bench participants (not checked in during active/completed events)
  const benchParticipants = (eventStatus === "active" || eventStatus === "completed") 
    ? participants.filter(p => !p.checked_in) 
    : [];
  
  const activeParticipants = (eventStatus === "active" || eventStatus === "completed")
    ? participants.filter(p => p.checked_in)
    : participants;

  const filteredParticipants = activeParticipants
    .filter(p => {
      // Search by name or company name (for professional)
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const nameMatch = p.name.toLowerCase().includes(searchLower);
        const companyMatch = p.company_name?.toLowerCase().includes(searchLower) || false;
        if (!nameMatch && !companyMatch) return false;
      }
      // Filter by check-in status
      if (filterCheckin === "confirmed" && !p.checked_in) return false;
      if (filterCheckin === "pending" && p.checked_in) return false;
      
      // Social filters
      if (!isProfessionalEvent) {
        if (filterGender !== "all" && p.gender !== filterGender) return false;
        if (filterAgeRange !== "all" && p.age_range !== filterAgeRange) return false;
        if (filterPreferredAgeRange !== "all" && !p.preferred_age_range?.includes(filterPreferredAgeRange)) return false;
        if (filterPreference !== "all" && p.preference !== filterPreference) return false;
      } else {
        // Professional filters
        if (filterEntityType !== "all" && p.entity_type !== filterEntityType) return false;
        if (filterSector !== "all" && p.sector !== filterSector) return false;
      }
      return true;
    })
    .sort((a, b) => {
      // Sort by check-in status first
      if (sortByCheckin === "confirmed-first") {
        if (a.checked_in && !b.checked_in) return -1;
        if (!a.checked_in && b.checked_in) return 1;
      } else if (sortByCheckin === "pending-first") {
        if (!a.checked_in && b.checked_in) return -1;
        if (a.checked_in && !b.checked_in) return 1;
      }
      // Sort by registration date
      if (sortByDate !== "none") {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        if (sortByDate === "newest") return dateB - dateA;
        return dateA - dateB;
      }
      // Then alphabetical
      if (sortOrder === "none") return 0;
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      if (sortOrder === "asc") return nameA.localeCompare(nameB, 'es');
      return nameB.localeCompare(nameA, 'es');
    });

  const handleUncheckInAll = async () => {
    const { error } = await supabase
      .from("participants")
      .update({ checked_in: false })
      .eq("event_id", id);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo deshacer el check-in",
        variant: "destructive",
      });
      return;
    }

    setParticipants(participants.map(p => ({ ...p, checked_in: false })));
    toast({
      title: "Check-in deshecho",
      description: `Se ha deshecho el check-in de ${participants.filter(p => p.checked_in).length} participantes`,
    });
  };

  // Preliminary round: assign checked-in participants to ad-hoc tables
  const handleAssignPreliminaryTables = async () => {
    if (!id || !eventData) return;

    const prelimRound = eventData.preliminary_round || { enabled: true, tables: [], started_at: null };
    const existingPrelimParticipantIds = new Set<string>();
    (prelimRound.tables || []).forEach((table: any[]) => {
      table.forEach((p: any) => existingPrelimParticipantIds.add(p.id));
    });

    // Get checked-in participants not yet in preliminary tables
    const unassigned = participants.filter(p => p.checked_in && !existingPrelimParticipantIds.has(p.id));

    if (unassigned.length < 2) {
      toast({
        title: "Sin participantes",
        description: "Necesitas al menos 2 participantes con check-in sin mesa preliminar asignada",
        variant: "destructive",
      });
      return;
    }

    // Shuffle and group into tables of table_size
    const shuffled = [...unassigned].sort(() => Math.random() - 0.5);
    const tableSize = eventData.table_size || 4;
    const newTables: any[][] = [];
    for (let i = 0; i < shuffled.length; i += tableSize) {
      const group = shuffled.slice(i, i + tableSize);
      if (group.length >= 2) {
        newTables.push(group.map(p => ({ id: p.id, name: p.name })));
      } else if (newTables.length > 0) {
        // Add remainders to last table
        group.forEach(p => newTables[newTables.length - 1].push({ id: p.id, name: p.name }));
      }
    }

    const updatedPrelim = {
      enabled: true,
      tables: [...(prelimRound.tables || []), ...newTables],
      started_at: prelimRound.started_at || new Date().toISOString(),
    };

    const { error } = await supabase
      .from("events")
      .update({ preliminary_round: updatedPrelim } as any)
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: "No se pudieron crear las mesas preliminares", variant: "destructive" });
      return;
    }

    setEventData(prev => prev ? { ...prev, preliminary_round: updatedPrelim } : prev);
    toast({
      title: "Mesas preliminares creadas",
      description: `${newTables.length} mesa(s) nueva(s) con ${unassigned.length} participantes`,
    });
  };

  // Get unique values for filter options - Social
  const uniqueGenders = [...new Set(participants.map(p => p.gender).filter(Boolean))];
  const uniqueAgeRanges = [...new Set(participants.map(p => p.age_range).filter(Boolean))];
  const uniquePreferredAgeRanges = [...new Set(
    participants.flatMap(p => p.preferred_age_range?.split(', ') || []).filter(Boolean)
  )];
  const uniquePreferences = [...new Set(participants.map(p => p.preference).filter(Boolean))];
  
  // Get unique values for filter options - Professional
  const uniqueEntityTypes = [...new Set(participants.map(p => p.entity_type).filter(Boolean))];
  const uniqueSectors = [...new Set(participants.map(p => p.sector).filter(Boolean))];

  const handleExportMatches = async (format: 'csv' | 'excel') => {
    if (matches.length === 0) {
      toast({
        title: "Sin matches",
        description: "No hay matches para exportar",
        variant: "destructive",
      });
      return;
    }

    try {
      if (format === 'csv') {
        exportMatchesToCSV(matches, eventData?.name || "evento");
      } else {
        await exportMatchesToExcel(matches, eventData?.name || "evento");
      }
      
      toast({
        title: "Exportación completada",
        description: `Los matches se han exportado correctamente`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Error",
        description: "No se pudieron exportar los matches",
        variant: "destructive",
      });
    }
  };

  const getGenderBadge = (gender: string | null) => {
    if (!gender) return null;
    switch (gender) {
      case "Mujer":
        return <Badge variant="secondary" className="bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300">Mujer</Badge>;
      case "Hombre":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">Hombre</Badge>;
      default:
        return <Badge variant="secondary">{gender}</Badge>;
    }
  };

  const exportToCSV = () => {
    if (participants.length === 0) return;
    
    const headers = ["Nombre", "Email", "Teléfono", "Rango Edad", "Edad Preferida", "Preferencia", "Preferencia de Ligue", "Género"];
    const rows = participants.map(p => [p.name, p.email || "", p.phone || "", p.age_range, p.preferred_age_range, p.preference, p.dating_preference || "", p.gender]);
    
    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = `participantes-evento-${id}.csv`;
    a.click();
    
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!eventData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <h2 className="font-display text-xl font-semibold mb-2">Evento no encontrado</h2>
            <Link to="/admin/dashboard">
              <Button variant="outline" className="mt-4">Volver al dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <BrandedHeader
        logoUrl={branding.logoUrl}
        companyName={branding.companyName}
        isWhiteLabel={branding.isWhiteLabel}
        backLink="/admin/dashboard"
        backLabel={<><ArrowLeft className="w-4 h-4" /> Volver al dashboard</>}
      />

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold mb-2">{eventData.name}</h1>
            <p className="text-muted-foreground">
              {participants.length} participantes • {participants.filter(p => p.checked_in).length} check-in ✅
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <TooltipProvider>
              {/* QR codes dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <QrCode className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Códigos QR</span>
                    <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {eventStatus === "pending" && (
                    <>
                      <DropdownMenuItem onClick={() => setShowJoinQR(true)}>
                        <QrCode className="w-4 h-4 mr-2" />
                        QR Registro
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShowCheckinQR(true)}>
                        <UserCheck className="w-4 h-4 mr-2" />
                        QR Check-in
                      </DropdownMenuItem>
                    </>
                  )}
                  {(eventStatus === "active" || eventStatus === "completed") && (
                    <DropdownMenuItem onClick={() => setShowQR(true)}>
                      <QrCode className="w-4 h-4 mr-2" />
                      QR Panel participante
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Exclusions - available from event creation */}
              {eventStatus === "pending" && participants.length >= 2 && (
                (hasFeature("avoid_encounters") || isSuperAdmin) ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => setShowExclusionsManager(true)}>
                        <Ban className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">Exclusiones</span>
                        {exclusions.length > 0 && <span className="ml-1">({exclusions.length})</span>}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="sm:hidden">Exclusiones</TooltipContent>
                  </Tooltip>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" disabled className="opacity-50">
                        <Ban className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">Exclusiones</span>
                        <Lock className="w-3 h-3 ml-1" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <span>Disponible en planes superiores</span>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )
              )}

              {/* Copy event */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => setShowCopyEventDialog(true)}>
                    <Copy className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Copiar</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="sm:hidden">Copiar evento</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Primary CTA */}
            {eventStatus === "pending" && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="hero" size="sm">
                    <Play className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Iniciar evento</span>
                    <span className="sm:hidden">Iniciar</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Cerrar inscripciones e iniciar evento?</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2">
                      <span className="block">Esta acción cerrará las inscripciones. Los participantes sin check-in ({participants.filter(p => !p.checked_in).length}) pasarán al banco de reserva y se generarán las mesas automáticamente con los {participants.filter(p => p.checked_in).length} participantes confirmados.</span>
                      {eventData?.preliminary_round?.enabled && (eventData.preliminary_round.tables || []).length > 0 && (
                        <span className="block bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-3 text-amber-800 dark:text-amber-300 text-sm">
                          🎯 Hay una ronda preliminar activa con {(eventData.preliminary_round.tables || []).length} mesa(s) y {(eventData.preliminary_round.tables || []).flat().length} participantes. Al iniciar, la ronda preliminar se cerrará y se generarán las rondas oficiales.
                        </span>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleStartEvent}>
                      {eventData?.preliminary_round?.enabled && (eventData.preliminary_round.tables || []).length > 0 ? "Cerrar preliminar e iniciar" : "Confirmar e iniciar"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {eventStatus === "active" && (
              <Button variant="hero" size="sm" onClick={() => setShowCloseEventDialog(true)}>
                <CheckCircle2 className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Cerrar evento</span>
                <span className="sm:hidden">Cerrar</span>
              </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="participants" className="space-y-6">
          <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
            <TabsList className="bg-card border w-max flex-nowrap">
              <TabsTrigger value="participants" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground whitespace-nowrap">
                <Users className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Participantes</span>
              </TabsTrigger>
              {(eventData?.waitlist_enabled || waitlistEntries.some(w => w.status === 'waiting')) && (
                <TabsTrigger value="waitlist" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground whitespace-nowrap">
                  <ListOrdered className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Lista de espera</span>
                  <span className="ml-1">({waitlistEntries.filter(w => w.status === 'waiting').length})</span>
                </TabsTrigger>
              )}
              <TabsTrigger value="tables" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground whitespace-nowrap">
                <Table2 className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Mesas</span>
              </TabsTrigger>
              <TabsTrigger value="matches" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground whitespace-nowrap">
                <Heart className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Matches</span>
                <span className="ml-1">({matches.length})</span>
              </TabsTrigger>
              {(eventStatus === "active" || eventStatus === "completed") && (
                <TabsTrigger value="selections" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground whitespace-nowrap">
                  <ClipboardList className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Selecciones</span>
                </TabsTrigger>
              )}
              {(eventStatus === "active" || eventStatus === "completed") && (hasFeature("analytics") || isSuperAdmin) && (
                <TabsTrigger value="analytics" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground whitespace-nowrap">
                  <BarChart3 className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Análisis</span>
                </TabsTrigger>
              )}
              {(eventStatus === "active" || eventStatus === "completed") && !hasFeature("analytics") && !isSuperAdmin && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all opacity-50 cursor-not-allowed">
                      <BarChart3 className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Análisis</span>
                      <Lock className="w-3 h-3 ml-1 text-muted-foreground" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <span>Disponible en planes superiores</span>
                    </div>
                  </TooltipContent>
                </Tooltip>
              )}
              <TabsTrigger value="settings" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground whitespace-nowrap">
                  <Settings2 className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Ajustes</span>
                </TabsTrigger>
            </TabsList>
          </div>

          {/* Participants Tab */}
          <TabsContent value="participants">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <CardTitle>Lista de Participantes</CardTitle>
                      <CardDescription>
                        {filteredParticipants.length === activeParticipants.length 
                          ? `${activeParticipants.length} personas${benchParticipants.length > 0 ? ` (${benchParticipants.length} en banco)` : ''}`
                          : `Mostrando ${filteredParticipants.length} de ${activeParticipants.length} participantes${benchParticipants.length > 0 ? ` (${benchParticipants.length} en banco)` : ''}`
                        }
                      </CardDescription>
                    </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Add participant */}
                    <Button variant="outline" size="sm" onClick={() => setShowAddModal(true)}>
                      <Plus className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Añadir</span>
                    </Button>

                    {/* Excel import */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="excel-upload"
                    />
                    {(hasFeature("excel_import") || isSuperAdmin) ? (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isLoadingExcel}
                      >
                        <FileSpreadsheet className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">{isLoadingExcel ? "Cargando..." : "Excel"}</span>
                      </Button>
                    ) : (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" size="sm" disabled className="opacity-50">
                              <FileSpreadsheet className="w-4 h-4 sm:mr-2" />
                              <span className="hidden sm:inline">Excel</span>
                              <Lock className="w-3 h-3 ml-1" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-primary" />
                              <span>Disponible en planes superiores</span>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}

                    {/* Check-in controls dropdown */}
                    {eventStatus === "pending" && participants.length > 0 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant={eventData?.checkin_open ? "default" : "outline"} size="sm">
                            <UserCheck className="w-4 h-4 sm:mr-2" />
                            <span className="hidden sm:inline">Check-in</span>
                            <ChevronDown className="w-3 h-3 ml-1" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={async () => {
                            const newValue = !eventData?.checkin_open;
                            await supabase
                              .from("events")
                              .update({ checkin_open: newValue } as any)
                              .eq("id", id);
                            setEventData(prev => prev ? { ...prev, checkin_open: newValue } : prev);
                            toast({
                              title: newValue ? "Check-in abierto" : "Check-in cerrado",
                              description: newValue 
                                ? "Los participantes pueden hacer check-in ahora" 
                                : "El check-in está cerrado para los participantes",
                            });
                          }}>
                            {eventData?.checkin_open ? (
                              <><Lock className="w-4 h-4 mr-2" /> Cerrar check-in</>
                            ) : (
                              <><UserCheck className="w-4 h-4 mr-2" /> Abrir check-in</>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={handleCheckInAll}>
                            <Check className="w-4 h-4 mr-2" />
                            Check-in todos
                          </DropdownMenuItem>
                          {participants.some(p => p.checked_in) && (
                            <DropdownMenuItem onClick={handleUncheckInAll}>
                              <RotateCcw className="w-4 h-4 mr-2" />
                              Deshacer check-in todos
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}

                    {/* Preliminary Round - assign tables button */}
                    {eventStatus === "pending" && eventData?.preliminary_round?.enabled && !isProfessionalEvent && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAssignPreliminaryTables}
                        disabled={participants.filter(p => p.checked_in).length < 2}
                      >
                        <Table2 className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">Mesa preliminar</span>
                      </Button>
                    )}

                    {/* Registration controls dropdown */}
                    {eventStatus === "pending" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant={eventData?.registration_open ? "outline" : "secondary"} size="sm">
                            {eventData?.registration_open ? <DoorOpen className="w-4 h-4 sm:mr-2" /> : <DoorClosed className="w-4 h-4 sm:mr-2" />}
                            <span className="hidden sm:inline">{eventData?.registration_open ? "Inscripciones" : "Cerradas"}</span>
                            <ChevronDown className="w-3 h-3 ml-1" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {/* Status indicator */}
                          <div className="px-2 py-1.5 text-xs text-muted-foreground border-b mb-1">
                            {eventData?.registration_open 
                              ? "✅ Inscripciones abiertas" 
                              : eventData?.waitlist_enabled 
                                ? "⏳ Cerrado — lista de espera activa"
                                : "🔒 Inscripciones cerradas"}
                          </div>
                          <DropdownMenuItem onClick={async () => {
                            const newValue = !eventData?.registration_open;
                            await supabase
                              .from("events")
                              .update({ registration_open: newValue } as any)
                              .eq("id", id);
                            setEventData(prev => prev ? { ...prev, registration_open: newValue } : prev);
                            toast({
                              title: newValue ? "Inscripciones abiertas" : "Inscripciones cerradas",
                              description: newValue 
                                ? "Los participantes pueden registrarse en el evento" 
                                : eventData?.waitlist_enabled
                                  ? "Inscripciones cerradas. Los nuevos participantes irán a la lista de espera."
                                  : "El registro de nuevos participantes está cerrado",
                            });
                          }}>
                            {eventData?.registration_open ? (
                              <><DoorClosed className="w-4 h-4 mr-2" /> Cerrar inscripciones</>
                            ) : (
                              <><DoorOpen className="w-4 h-4 mr-2" /> Abrir inscripciones</>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={async () => {
                            const newValue = !eventData?.waitlist_enabled;
                            await supabase
                              .from("events")
                              .update({ waitlist_enabled: newValue } as any)
                              .eq("id", id);
                            setEventData(prev => prev ? { ...prev, waitlist_enabled: newValue } : prev);
                            toast({
                              title: newValue ? "Lista de espera activada" : "Lista de espera desactivada",
                              description: newValue 
                                ? eventData?.registration_open
                                  ? "Lista de espera activada. Cierra las inscripciones para que los nuevos participantes vayan a la lista de espera."
                                  : "Los nuevos participantes irán a la lista de espera"
                                : "La lista de espera ha sido desactivada",
                            });
                          }}>
                            <ListOrdered className="w-4 h-4 mr-2" />
                            {eventData?.waitlist_enabled ? "Desactivar lista de espera" : "Activar lista de espera"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <MoreVertical className="w-4 h-4 sm:mr-2" />
                          <span className="hidden sm:inline">Más</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {/* Send reminder to all */}
                        {participants.length > 0 && participants.filter(p => p.email).length > 0 && (
                          <>
                            <DropdownMenuItem
                              onClick={() => handleSendReminder(participants.filter(p => p.email).map(p => p.id))}
                              disabled={isSendingReminder}
                            >
                              <Bell className="w-4 h-4 mr-2" />
                              {isSendingReminder ? "Enviando recordatorios..." : `Recordatorio a todos (${participants.filter(p => p.email).length})`}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                const checkedIn = participants.filter(p => p.email && p.checked_in);
                                if (checkedIn.length === 0) {
                                  toast({ title: "Sin participantes", description: "No hay participantes con check-in y email", variant: "destructive" });
                                  return;
                                }
                                handleSendReminder(checkedIn.map(p => p.id));
                              }}
                              disabled={isSendingReminder}
                            >
                              <Bell className="w-4 h-4 mr-2" />
                              Recordatorio check-in ({participants.filter(p => p.email && p.checked_in).length})
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        {eventStatus === "pending" && participants.length > 0 && (
                          <>
                            <DropdownMenuItem 
                              onClick={handleSendBulkCodes}
                              disabled={isSendingBulkCodes}
                            >
                              <Send className="w-4 h-4 mr-2" />
                              {isSendingBulkCodes 
                                ? (bulkCodeProgress ? `Enviando ${bulkCodeProgress.current}/${bulkCodeProgress.total}...` : "Enviando...")
                                : `Enviar códigos (${participants.filter(p => !p.verification_code && p.email).length})`
                              }
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        <DropdownMenuItem 
                          onClick={exportToCSV}
                          disabled={participants.length === 0}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Exportar CSV
                        </DropdownMenuItem>
                        {eventStatus === "pending" && participants.length > 0 && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive"
                              onClick={handleDeleteAllParticipants}
                            >
                              <UserX className="w-4 h-4 mr-2" />
                              Eliminar todos
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  </div>
                  
                  {/* Search and Filters */}
                  {participants.length > 0 && (
                    <div className="space-y-3 pt-2 border-t">
                      {/* Search bar and mobile filter toggle */}
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <input
                            type="text"
                            placeholder="Buscar participante..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full h-9 pl-9 pr-4 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                          {searchTerm && (
                            <button
                              onClick={() => setSearchTerm("")}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        {/* Mobile filter toggle */}
                        <Button
                          variant={showFilters ? "default" : "outline"}
                          size="sm"
                          className="sm:hidden h-9"
                          onClick={() => setShowFilters(!showFilters)}
                        >
                          <Filter className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      {/* Filters row - always visible on sm+, toggle on mobile */}
                      <div className={`${showFilters ? "flex" : "hidden"} sm:flex flex-wrap items-center gap-2 sm:gap-3`}>
                        <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                          <Filter className="w-4 h-4" />
                          <span>Filtrar:</span>
                        </div>
                        
                        {/* Filters grid on mobile, flex on desktop */}
                        <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto">
                          <select
                            value={filterCheckin}
                            onChange={(e) => setFilterCheckin(e.target.value as "all" | "confirmed" | "pending")}
                            className="h-8 px-2 text-xs sm:text-sm border rounded-md bg-background"
                          >
                            <option value="all">Check-in</option>
                            <option value="confirmed">Confirmados</option>
                            <option value="pending">Pendientes</option>
                          </select>
                          
                          {/* Social filters */}
                          {!isProfessionalEvent && (
                            <>
                              <select
                                value={filterGender}
                                onChange={(e) => setFilterGender(e.target.value)}
                                className="h-8 px-2 text-xs sm:text-sm border rounded-md bg-background"
                              >
                                <option value="all">Género</option>
                                {uniqueGenders.map(g => (
                                  <option key={g} value={g!}>{g}</option>
                                ))}
                              </select>
                              
                              <select
                                value={filterAgeRange}
                                onChange={(e) => setFilterAgeRange(e.target.value)}
                                className="h-8 px-2 text-xs sm:text-sm border rounded-md bg-background"
                              >
                                <option value="all">Rango edad</option>
                                {uniqueAgeRanges.map(ar => (
                                  <option key={ar} value={ar!}>{ar}</option>
                                ))}
                              </select>
                              
                              <select
                                value={filterPreferredAgeRange}
                                onChange={(e) => setFilterPreferredAgeRange(e.target.value)}
                                className="h-8 px-2 text-xs sm:text-sm border rounded-md bg-background"
                              >
                                <option value="all">Busca rango</option>
                                {uniquePreferredAgeRanges.map(par => (
                                  <option key={par} value={par}>{par}</option>
                                ))}
                              </select>
                              
                              <select
                                value={filterPreference}
                                onChange={(e) => setFilterPreference(e.target.value)}
                                className="h-8 px-2 text-xs sm:text-sm border rounded-md bg-background col-span-2 sm:col-span-1"
                              >
                                <option value="all">Conexión</option>
                                {uniquePreferences.map(pref => (
                                  <option key={pref} value={pref!}>{pref}</option>
                                ))}
                              </select>
                            </>
                          )}
                          
                          {/* Professional filters */}
                          {isProfessionalEvent && (
                            <>
                              <select
                                value={filterEntityType}
                                onChange={(e) => setFilterEntityType(e.target.value)}
                                className="h-8 px-2 text-xs sm:text-sm border rounded-md bg-background"
                              >
                                <option value="all">Tipo</option>
                                {uniqueEntityTypes.map(et => (
                                  <option key={et} value={et!}>{et}</option>
                                ))}
                              </select>
                              
                              <select
                                value={filterSector}
                                onChange={(e) => setFilterSector(e.target.value)}
                                className="h-8 px-2 text-xs sm:text-sm border rounded-md bg-background"
                              >
                                <option value="all">Sector</option>
                                {uniqueSectors.map(s => (
                                  <option key={s} value={s!}>{s}</option>
                                ))}
                              </select>
                            </>
                          )}
                        </div>
                        
                        {/* Clear filters button - adapted for both modules */}
                        {((isProfessionalEvent && (filterEntityType !== "all" || filterSector !== "all" || filterCheckin !== "all" || searchTerm)) ||
                          (!isProfessionalEvent && (filterGender !== "all" || filterAgeRange !== "all" || filterPreferredAgeRange !== "all" || filterPreference !== "all" || filterCheckin !== "all" || searchTerm))) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setFilterGender("all");
                              setFilterAgeRange("all");
                              setFilterPreferredAgeRange("all");
                              setFilterPreference("all");
                              setFilterEntityType("all");
                              setFilterSector("all");
                              setFilterCheckin("all");
                              setSearchTerm("");
                            }}
                            className="h-8 px-2 text-xs"
                          >
                            <X className="w-3 h-3 mr-1" />
                            <span className="hidden sm:inline">Limpiar</span>
                          </Button>
                        )}
                      </div>
                      
                      {/* Sorting buttons - separate row on mobile */}
                      <div className="flex items-center gap-1 justify-end sm:justify-start">
                        <span className="text-xs text-muted-foreground mr-2 hidden sm:inline">Ordenar:</span>
                        <Button
                          variant={sortByCheckin === "confirmed-first" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSortByCheckin(sortByCheckin === "confirmed-first" ? "none" : "confirmed-first")}
                          className="h-8 px-2"
                          title="Confirmados primero"
                        >
                          <UserCheck className="w-4 h-4" />
                        </Button>
                        <Button
                          variant={sortByCheckin === "pending-first" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSortByCheckin(sortByCheckin === "pending-first" ? "none" : "pending-first")}
                          className="h-8 px-2"
                          title="Pendientes primero"
                        >
                          <UserMinus className="w-4 h-4" />
                        </Button>
                        <div className="w-px h-6 bg-border mx-1" />
                        <Button
                          variant={sortOrder === "asc" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSortOrder(sortOrder === "asc" ? "none" : "asc")}
                          className="h-8 px-2"
                          title="Ordenar A-Z"
                        >
                          <ArrowUpAZ className="w-4 h-4" />
                        </Button>
                        <Button
                          variant={sortOrder === "desc" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSortOrder(sortOrder === "desc" ? "none" : "desc")}
                          className="h-8 px-2"
                          title="Ordenar Z-A"
                        >
                          <ArrowDownZA className="w-4 h-4" />
                        </Button>
                        <div className="w-px h-6 bg-border mx-1" />
                        <Button
                          variant={sortByDate === "newest" ? "default" : "outline"}
                          size="sm"
                          onClick={() => { setSortByDate(sortByDate === "newest" ? "none" : "newest"); if (sortByDate !== "newest") setSortOrder("none"); }}
                          className="h-8 px-2"
                          title="Más recientes primero"
                        >
                          <Clock className="w-4 h-4" />
                          <ArrowDownZA className="w-3 h-3 ml-0.5" />
                        </Button>
                        <Button
                          variant={sortByDate === "oldest" ? "default" : "outline"}
                          size="sm"
                          onClick={() => { setSortByDate(sortByDate === "oldest" ? "none" : "oldest"); if (sortByDate !== "oldest") setSortOrder("none"); }}
                          className="h-8 px-2"
                          title="Más antiguos primero"
                        >
                          <Clock className="w-4 h-4" />
                          <ArrowUpAZ className="w-3 h-3 ml-0.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {participants.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                      <Users className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-display text-lg font-semibold mb-2">Sin participantes</h3>
                    <p className="text-muted-foreground mb-4">Carga un archivo Excel o añade participantes manualmente</p>
                    <div className="flex justify-center gap-3">
                      <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="w-4 h-4 mr-2" />
                        Cargar Excel
                      </Button>
                      <Button variant="hero" onClick={() => setShowAddModal(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Añadir manual
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {filteredParticipants.map((participant, index) => (
                      <ParticipantCard
                        key={participant.id}
                        participant={participant}
                        index={index}
                        isProfessional={isProfessionalEvent}
                        eventStatus={eventStatus}
                        isSendingCode={isSendingCode}
                        onView={() => setSelectedParticipant(participant)}
                        onToggleCheckin={handleToggleCheckin}
                        onSendCode={handleSendCode}
                        onDelete={handleDeleteParticipant}
                        onEmailUpdated={handleUpdateParticipantEmail}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bench section - participants who didn't check in */}
            {(eventStatus === "active" || eventStatus === "completed") && (
              <>
                {benchParticipants.length > 0 ? (
                  <Card className="mt-4 border-dashed">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <UserX className="w-4 h-4 text-muted-foreground" />
                        Banco de participantes
                      </CardTitle>
                      <CardDescription>
                        {benchParticipants.length} participantes sin check-in. Puedes incorporarlos al evento.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {benchParticipants.map((participant) => (
                          <div key={participant.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                            <div className="flex items-center gap-3">
                              <div>
                                <p className="font-medium text-sm">{participant.name}</p>
                                <p className="text-xs text-muted-foreground">{participant.email || participant.phone || 'Sin contacto'}</p>
                              </div>
                              {participant.gender && (
                                <Badge variant="secondary" className="text-xs">{participant.gender}</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {(eventStatus === "active" || eventStatus === "completed") && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={async () => {
                                    await supabase
                                      .from("participants")
                                      .update({ checked_in: true })
                                      .eq("id", participant.id);
                                    
                                    if (participant.global_participant_id) {
                                      await supabase
                                        .from("global_participants")
                                        .update({ status: "active", updated_at: new Date().toISOString() })
                                        .eq("id", participant.global_participant_id);
                                    }
                                    
                                    const updatedParticipant = { ...participant, checked_in: true };
                                    setParticipants(prev => prev.map(p => p.id === participant.id ? updatedParticipant : p));
                                    
                                    if (eventData?.tables && Array.isArray(eventData.tables) && eventData.tables.length > 0) {
                                      setPendingNewParticipant(updatedParticipant);
                                      setShowTableAssignmentModal(true);
                                    }
                                    
                                    toast({
                                      title: "Participante incorporado",
                                      description: `${participant.name} ha sido añadido al evento`,
                                    });
                                  }}
                                >
                                  <Plus className="w-4 h-4 mr-1" />
                                  Incorporar
                                </Button>
                              )}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>¿Eliminar participante del banco?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Se eliminará permanentemente a <strong>{participant.name}</strong> del evento. No podrás incorporarlo después.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteParticipant(participant.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Eliminar definitivamente
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ) : eventData?.original_participants_count && eventData.original_participants_count > (eventData?.participants_count || 0) ? (
                  <Card className="mt-4 border-dashed border-muted">
                    <CardContent className="py-4">
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <UserX className="w-4 h-4 shrink-0" />
                        <p className="text-sm">
                          Hubo <strong className="text-foreground">{eventData.original_participants_count - (eventData.participants_count || 0)}</strong> no-shows en este evento 
                          (de {eventData.original_participants_count} inscritos, {eventData.participants_count} asistieron).
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : null}
              </>
            )}
          </TabsContent>

          <TabsContent value="waitlist">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ListOrdered className="w-5 h-5" />
                  Lista de espera
                </CardTitle>
                <CardDescription>
                  {waitlistEntries.filter(w => w.status === 'waiting').length} personas esperando
                </CardDescription>
              </CardHeader>
              <CardContent>
                {waitlistEntries.filter(w => w.status === 'waiting').length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ListOrdered className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No hay nadie en lista de espera</p>
                    <p className="text-sm mt-1">Cuando las inscripciones estén cerradas y la lista de espera activa, los nuevos registros aparecerán aquí.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {waitlistEntries.filter(w => w.status === 'waiting').map((entry, index) => (
                      <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-xs">#{index + 1}</Badge>
                          <div>
                            <p className="font-medium text-sm">{entry.name}</p>
                            <p className="text-xs text-muted-foreground">{entry.email}</p>
                          </div>
                          {entry.gender && (
                            <Badge variant="secondary" className="text-xs">{entry.gender}</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handlePromoteFromWaitlist(entry)}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Inscribir
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={async () => {
                              const { error } = await supabase.from('event_waitlist').delete().eq('id', entry.id);
                              if (!error) {
                                setWaitlistEntries(prev => prev.filter(w => w.id !== entry.id));
                                toast({ title: "Eliminado de la lista de espera" });
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>


          <TabsContent value="tables">
            <div className="space-y-6">
              {eventStatus === "active" && tables.length > 0 && (
                <>
                  <RoundTimer
                    roundDuration={Math.floor((eventData.round_duration || 300) / 60)}
                    activeRound={currentRound}
                    completedRounds={completedRounds}
                    totalRounds={tables.length}
                    roundStartedAt={eventData.round_started_at}
                    roundPausedAt={eventData.round_paused_at}
                    roundElapsedSeconds={eventData.round_elapsed_seconds}
                    onTimerStart={async () => {
                      const now = new Date().toISOString();
                      await supabase
                        .from("events")
                        .update({ 
                          round_started_at: now,
                          round_paused_at: null,
                          round_elapsed_seconds: 0
                        })
                        .eq("id", id);
                      setEventData(prev => prev ? {
                        ...prev,
                        round_started_at: now,
                        round_paused_at: null,
                        round_elapsed_seconds: 0
                      } : null);
                    }}
                    onTimerPause={async (elapsedSeconds: number) => {
                      const now = new Date().toISOString();
                      await supabase
                        .from("events")
                        .update({ 
                          round_paused_at: now,
                          round_elapsed_seconds: elapsedSeconds
                        })
                        .eq("id", id);
                      setEventData(prev => prev ? {
                        ...prev,
                        round_paused_at: now,
                        round_elapsed_seconds: elapsedSeconds
                      } : null);
                    }}
                    onTimerResume={async () => {
                      const now = new Date().toISOString();
                      await supabase
                        .from("events")
                        .update({ 
                          round_started_at: now,
                          round_paused_at: null
                        })
                        .eq("id", id);
                      setEventData(prev => prev ? {
                        ...prev,
                        round_started_at: now,
                        round_paused_at: null
                      } : null);
                    }}
                    onCompleteRound={async (roundNumber: number) => {
                      const newCompletedRounds = [...completedRounds, roundNumber];
                      const nextRound = roundNumber + 1;
                      const isLastRound = roundNumber >= tables.length;
                      
                      // Reset timer state for next round
                      await supabase
                        .from("events")
                        .update({ 
                          completed_rounds: newCompletedRounds,
                          current_round: isLastRound ? roundNumber : nextRound,
                          round_started_at: null,
                          round_paused_at: null,
                          round_elapsed_seconds: 0
                        })
                        .eq("id", id);
                      
                      setCompletedRounds(newCompletedRounds);
                      setEventData(prev => prev ? {
                        ...prev,
                        round_started_at: null,
                        round_paused_at: null,
                        round_elapsed_seconds: 0
                      } : null);
                      
                      if (!isLastRound) {
                        setCurrentRound(nextRound);
                        setViewingRound(nextRound);
                        toast({
                          title: `Ronda ${roundNumber} completada`,
                          description: `Ronda ${nextRound} iniciada. Los participantes pueden ver sus nuevos compañeros.`,
                        });
                      } else {
                        toast({
                          title: "¡Todas las rondas completadas!",
                          description: "Los participantes pueden seguir enviando selecciones.",
                        });
                      }
                    }}
                  />
                  
                  {/* Round Controls and QR */}
                  <Card className="bg-gradient-card border-primary/20">
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <Button 
                            variant="hero" 
                            size="lg"
                            onClick={() => setShowQR(true)}
                          >
                            <QrCode className="w-5 h-5 mr-2" />
                            Mostrar QR del Participante
                          </Button>
                          
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              exportTableAssignmentsToExcel(tables, participants, eventData?.name || "evento");
                              toast({
                                title: "Excel descargado",
                                description: "Las asignaciones de mesas se han exportado correctamente.",
                              });
                            }}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Descargar Mesas
                          </Button>
                          
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">Selecciones enviadas</p>
                            <p className="text-2xl font-bold text-primary">
                              {participants.filter(p => p.selection_submitted_at).length} / {participants.length}
                            </p>
                          </div>
                        </div>
                        
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              {eventStatus === "pending" ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                      <Table2 className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-display text-lg font-semibold mb-2">Mesas no generadas</h3>
                    <p className="text-muted-foreground mb-1">
                      Las mesas se generan al iniciar el evento. Los participantes sin check-in serán eliminados.
                    </p>
                    <p className="text-sm text-muted-foreground mb-6">
                      Participantes con check-in: <strong>{participants.filter(p => p.checked_in).length}</strong> de {participants.length}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Button variant="outline" onClick={() => setShowCheckinQR(true)}>
                        <QrCode className="w-4 h-4 mr-2" />
                        Ver QR Check-in
                      </Button>
                      {participants.filter(p => p.checked_in).length >= 2 && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="hero">
                              <Play className="w-4 h-4 mr-2" />
                              Iniciar evento y generar mesas
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Cerrar inscripciones e iniciar evento?</AlertDialogTitle>
                              <AlertDialogDescription className="space-y-2">
                                <span className="block">Esta acción cerrará las inscripciones. Los participantes sin check-in ({participants.filter(p => !p.checked_in).length}) pasarán al banco de reserva y se generarán las mesas automáticamente con los {participants.filter(p => p.checked_in).length} participantes confirmados.</span>
                                {eventData?.preliminary_round?.enabled && (eventData.preliminary_round.tables || []).length > 0 && (
                                  <span className="block bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-3 text-amber-800 dark:text-amber-300 text-sm">
                                    🎯 Hay una ronda preliminar activa con {(eventData.preliminary_round.tables || []).length} mesa(s) y {(eventData.preliminary_round.tables || []).flat().length} participantes. Al iniciar, la ronda preliminar se cerrará y se generarán las rondas oficiales.
                                  </span>
                                )}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={handleStartEvent}>
                                {eventData?.preliminary_round?.enabled && (eventData.preliminary_round.tables || []).length > 0 ? "Cerrar preliminar e iniciar" : "Confirmar e iniciar"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                    
                    {/* Preliminary Round Tables - shown during pending state */}
                    {eventData?.preliminary_round?.enabled && (eventData.preliminary_round.tables || []).length > 0 && (
                      <div className="mt-8">
                        <h3 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
                          🎯 Ronda Preliminar (Ronda 0)
                          <Badge variant="secondary">
                            {(eventData.preliminary_round.tables || []).filter((_, i) => !(eventData.preliminary_round?.dismissed_tables || []).includes(i)).length} mesas activas
                          </Badge>
                          {(eventData.preliminary_round.dismissed_tables || []).length > 0 && (
                            <Badge variant="outline" className="text-muted-foreground">
                              {(eventData.preliminary_round.dismissed_tables || []).length} invalidada(s)
                            </Badge>
                          )}
                        </h3>
                        {/* Confirmation status summary */}
                        {eventData.preliminary_round.confirmations && Object.keys(eventData.preliminary_round.confirmations).length > 0 && (
                          <div className="mb-4 text-sm text-muted-foreground">
                            {Object.values(eventData.preliminary_round.confirmations).filter(v => v === true).length} confirmados · {Object.values(eventData.preliminary_round.confirmations).filter(v => v === false).length} negados · {(eventData.preliminary_round.tables || []).flat().length - Object.keys(eventData.preliminary_round.confirmations).length} pendientes
                          </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {(eventData.preliminary_round.tables || []).map((table: any[], tableIndex: number) => {
                            const isDismissed = (eventData.preliminary_round?.dismissed_tables || []).includes(tableIndex);
                            const confirmations = eventData.preliminary_round?.confirmations || {};
                            const confirmedCount = table.filter((p: any) => confirmations[p.id] === true).length;
                            const deniedCount = table.filter((p: any) => confirmations[p.id] === false).length;
                            
                            return (
                            <Card key={tableIndex} className={`border-l-4 ${isDismissed ? 'border-l-muted opacity-60' : 'border-l-amber-400'}`}>
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <Table2 className={`w-4 h-4 ${isDismissed ? 'text-muted-foreground' : 'text-amber-500'}`} />
                                    <span className={`font-medium ${isDismissed ? 'line-through text-muted-foreground' : ''}`}>Mesa {tableIndex + 1}</span>
                                    <span className="text-xs text-muted-foreground">({table.length})</span>
                                  </div>
                                  {isDismissed ? (
                                    <Badge variant="destructive" className="text-xs">Invalidada</Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">
                                      {confirmedCount > 0 ? `${confirmedCount}/${table.length} ✓` : 'Preliminar'}
                                    </Badge>
                                  )}
                                </div>
                                <div className="space-y-1.5">
                                  {table.map((p: any) => {
                                    const status = confirmations[p.id];
                                    return (
                                    <div key={p.id} className={`flex items-center gap-2 p-2 rounded-md ${isDismissed ? 'bg-muted/30' : 'bg-background/50'}`}>
                                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                                        status === true ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                                        status === false ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                                        'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                                      }`}>
                                        {p.name.charAt(0)}
                                      </div>
                                      <span className={`text-sm truncate ${isDismissed ? 'text-muted-foreground' : ''}`}>{p.name}</span>
                                      {status === true && <CheckCircle2 className="w-3 h-3 text-green-500 ml-auto shrink-0" />}
                                      {status === false && <X className="w-3 h-3 text-red-500 ml-auto shrink-0" />}
                                    </div>
                                    );
                                  })}
                                </div>
                                {isDismissed && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full mt-3"
                                    onClick={async () => {
                                      if (!id || !eventData?.preliminary_round) return;
                                      const newDismissed = (eventData.preliminary_round.dismissed_tables || []).filter(i => i !== tableIndex);
                                      const newConfirmations = { ...(eventData.preliminary_round.confirmations || {}) };
                                      // Reset negative confirmations for this table
                                      table.forEach((p: any) => { if (newConfirmations[p.id] === false) delete newConfirmations[p.id]; });
                                      const updated = { ...eventData.preliminary_round, dismissed_tables: newDismissed, confirmations: newConfirmations };
                                      await supabase.from("events").update({ preliminary_round: updated } as any).eq("id", id);
                                      setEventData(prev => prev ? { ...prev, preliminary_round: updated } : prev);
                                      toast({ title: "Mesa recuperada", description: `Mesa ${tableIndex + 1} ha sido restaurada` });
                                    }}
                                  >
                                    <RotateCcw className="w-3 h-3 mr-1" />
                                    Recuperar mesa
                                  </Button>
                                )}
                              </CardContent>
                            </Card>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : tables.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                      <Table2 className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-display text-lg font-semibold mb-2">Sin mesas generadas</h3>
                    <p className="text-muted-foreground">Añade al menos 2 participantes para generar las mesas</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-muted-foreground">Ver distribución:</span>
                    {tables.map((table) => {
                      const isCompleted = completedRounds.includes(table.round);
                      const isActive = table.round === currentRound && !isCompleted;
                      const isPending = table.round > currentRound;
                      
                      return (
                        <Button
                          key={table.round}
                          variant={viewingRound === table.round ? "default" : "outline"}
                          size="sm"
                          onClick={() => setViewingRound(table.round)}
                          className="relative"
                        >
                          {isCompleted && <Check className="w-3 h-3 mr-1 text-green-500" />}
                          {isActive && <span className="w-2 h-2 rounded-full bg-primary animate-pulse mr-1" />}
                          Ronda {table.round}
                          {isPending && <Lock className="w-3 h-3 ml-1 opacity-50" />}
                        </Button>
                      );
                    })}
                    {(eventStatus === "active" || eventStatus === "completed") && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleAddRound}
                          className="border-dashed"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Ronda
                        </Button>
                        {tables.length > 1 && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-dashed text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                Quitar R{viewingRound}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar Ronda {viewingRound}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Se eliminará la Ronda {viewingRound} y se renumerarán las rondas restantes.
                                  {completedRounds.includes(viewingRound) && " Esta ronda ya fue completada — los encuentros registrados no se eliminarán."}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteRound(viewingRound)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Eliminar ronda
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </>
                    )}
                  </div>

                  {/* Legend */}
                  <Card className="bg-muted/30">
                    <CardContent className="p-3">
                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        <span className="text-muted-foreground font-medium">Leyenda:</span>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(ageRangeColors).map(([range, color]) => (
                            <Badge key={range} className={`${color} text-xs`}>{range}</Badge>
                          ))}
                        </div>
                        <span className="text-muted-foreground mx-1">|</span>
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1"><span className="text-pink-500">♀</span> Mujer</span>
                          <span className="flex items-center gap-1"><span className="text-blue-500">♂</span> Hombre</span>
                          <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-pink-500" /> Ligue</span>
                          <span className="flex items-center gap-1"><Handshake className="w-3 h-3 text-blue-500" /> Amistad</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                   <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            Ronda {viewingRound}
                            {completedRounds.includes(viewingRound) && (
                              <Badge variant="secondary" className="bg-green-100 text-green-700">
                                <Check className="w-3 h-3 mr-1" />
                                Completada
                              </Badge>
                            )}
                            {viewingRound === currentRound && !completedRounds.includes(viewingRound) && (
                              <Badge variant="default">Activa</Badge>
                            )}
                          </CardTitle>
                          <CardDescription>Distribución de mesas para esta ronda</CardDescription>
                        </div>
                        {(eventStatus === "active" || eventStatus === "completed") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const rd = tables.find(t => t.round === viewingRound);
                              if (rd) {
                                setEditingRoundData(rd);
                                setShowTableEditor(true);
                              }
                            }}
                          >
                            <Settings2 className="w-4 h-4 mr-2" />
                            Editar mesas
                          </Button>
                        )}
                        {eventStatus === "active" && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Plus className="w-4 h-4 mr-2" />
                                Añadir mesa vacía
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Añadir mesa vacía?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Se añadirá una nueva mesa vacía a todas las rondas pendientes. Podrás asignar participantes tardíos a ella usando el botón "Añadir participante".
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={handleAddEmptyTable}>
                                  Confirmar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <TooltipProvider>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {tables.find(t => t.round === viewingRound)?.tables.map((table: DbParticipant[], tableIndex: number) => {
                            const ageInfo = getTableAgeRangeInfo(table);
                            const hasLigue = table.some((m: any) => {
                              const p = participants.find(pp => pp.id === m.id);
                              const pref = p?.preference?.toLowerCase() || "";
                              return pref.includes('ligue') || pref.includes('pareja') || pref.includes('sentimental');
                            });
                            
                            return (
                              <Card key={tableIndex} className="bg-gradient-card border-l-4" style={{
                                borderLeftColor: ageInfo.isMixed 
                                  ? 'hsl(var(--muted-foreground))' 
                                  : ageInfo.dominant === "25-32" ? '#3b82f6' 
                                  : ageInfo.dominant === "33-40" ? '#22c55e'
                                  : ageInfo.dominant === "18-24" ? '#a855f7'
                                  : ageInfo.dominant === "41-50" ? '#f59e0b'
                                  : ageInfo.dominant === "51-60" ? '#f97316'
                                  : '#ef4444'
                              }}>
                                <CardContent className="p-4">
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                      <Table2 className="w-4 h-4 text-primary" />
                                      <span className="font-medium">Mesa {tableIndex + 1}</span>
                                      <span className="text-xs text-muted-foreground">
                                        ({table.length})
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Badge className={getAgeRangeColor(ageInfo.dominant)}>
                                        {ageInfo.dominant || "Mixto"}
                                      </Badge>
                                      {ageInfo.isMixed && (
                                        <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">
                                          Mixta
                                        </Badge>
                                      )}
                                      {hasLigue && (
                                        <Heart className="w-3 h-3 text-pink-500 ml-1" />
                                      )}
                                    </div>
                                  </div>
                                  <div className="space-y-1.5">
                                    {table.map((participant: any) => {
                                      const fullParticipant = participants.find(p => p.id === participant.id);
                                      return (
                                        <Tooltip key={participant.id}>
                                          <TooltipTrigger asChild>
                                            <div className="flex items-center gap-2 p-2 rounded-md bg-background/50 hover:bg-background/80 transition-colors cursor-default">
                                              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-medium">
                                                {participant.name.charAt(0)}
                                              </div>
                                              <span className="text-sm flex-1 truncate">{participant.name}</span>
                                              <div className="flex items-center gap-1.5">
                                                <Badge className={`${getAgeRangeColor(fullParticipant?.age_range)} text-xs px-1.5 py-0`}>
                                                  {normalizeAgeRange(fullParticipant?.age_range) || "?"}
                                                </Badge>
                                                {getGenderIcon(fullParticipant?.gender)}
                                                {getPreferenceIcon(fullParticipant?.preference)}
                                              </div>
                                            </div>
                                          </TooltipTrigger>
                                          <TooltipContent side="right" className="max-w-xs">
                                            <div className="space-y-1">
                                              <p className="font-medium">{participant.name}</p>
                                              <p className="text-xs text-muted-foreground">
                                                {fullParticipant?.gender || "Sin especificar"} • {fullParticipant?.age_range || "Edad no especificada"}
                                              </p>
                                              <p className="text-xs">
                                                Busca: {fullParticipant?.preference || "No especificado"}
                                              </p>
                                              {fullParticipant?.dating_preference && (
                                                <p className="text-xs text-pink-500">
                                                  {fullParticipant.dating_preference}
                                                </p>
                                              )}
                                            </div>
                                          </TooltipContent>
                                        </Tooltip>
                                      );
                                    })}
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </TooltipProvider>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="matches">
            <MatchesDashboard
              matches={matches as any}
              selections={selections}
              participants={participants as any}
              eventName={eventData?.name || ""}
              eventStatus={eventStatus}
              onShowQR={() => setShowQR(true)}
              onRefresh={loadEventData}
              isProfessional={isProfessionalEvent}
            />
          </TabsContent>

          {/* Selections Tab */}
          <TabsContent value="selections">
            <div className="space-y-6">
              <SelectionProgress
                participants={participants}
                selections={selections}
                onSendReminder={handleSendReminder}
                isSendingReminder={isSendingReminder}
              />

              {/* Selections Viewer - moved from Matches tab */}
              <SelectionsViewer
                selections={selections}
                participants={participants}
                matches={matches}
              />

              {/* Export Matches Button */}
              {matches.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Download className="w-5 h-5" />
                      Exportar Matches
                    </CardTitle>
                    <CardDescription>
                      Descarga los matches en formato CSV o Excel
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={() => handleExportMatches('csv')}>
                        <Download className="w-4 h-4 mr-2" />
                        Exportar CSV
                      </Button>
                      <Button variant="outline" onClick={() => handleExportMatches('excel')}>
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Exportar Excel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>


          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <EventAnalytics
              participants={participants}
              tables={tables}
              matches={matches}
              selections={selections}
              originalParticipantsCount={eventData?.original_participants_count}
            />
          </TabsContent>

          {/* Settings Tab */}
            <TabsContent value="settings">
              <EventSettingsTabs
                eventId={id || ""}
                name={eventData.name}
                date={eventData.date}
                eventTime={eventData.event_time}
                eventLocation={eventData.event_location}
                rounds={eventData.rounds}
                tableSize={eventData.table_size}
                roundDuration={eventData.round_duration}
                rotationMode={eventData.rotation_mode}
                genderParity={eventData.gender_parity}
                language={eventData.language || "es"}
                registrationSubtitle={eventData.registration_subtitle}
                registrationDescription={eventData.registration_description}
                customAgeRanges={eventData.custom_age_ranges}
                customGenders={eventData.custom_genders}
                customPreferences={eventData.custom_preferences}
                customDatingPreferences={eventData.custom_dating_preferences}
                module={eventData.module}
                professionalConfig={eventData.professional_config}
                groupRounds={eventData.group_rounds}
                emailTemplate={eventData.email_template}
                checkinOpensMinutesBefore={eventData.checkin_opens_minutes_before}
                superLikeEnabled={eventData.super_like_enabled}
                codeSendMode={eventData.code_send_mode}
                eventStatus={eventStatus}
                preliminaryRoundEnabled={!!eventData.preliminary_round?.enabled}
                reminderMode={eventData.reminder_mode}
                reminderScheduledAt={eventData.reminder_scheduled_at}
                onUpdate={(updates) => {
                  setEventData(prev => prev ? { ...prev, ...updates } : prev);
                }}
              />
            </TabsContent>
        </Tabs>

        {/* Email Template Editor Modal */}
        {showEmailEditor && (
          <EmailTemplateEditor
            template={eventData?.email_template || null}
            professionalTemplate={(eventData as any)?.professional_email_template || null}
            eventName={eventData?.name || ""}
            isProfessional={isProfessionalEvent}
            onSave={handleSaveEmailTemplate}
            onClose={() => setShowEmailEditor(false)}
          />
        )}

        {/* Schedule Email Dialog */}
        <ScheduleEmailDialog
          open={showScheduleDialog}
          onOpenChange={setShowScheduleDialog}
          onSchedule={handleScheduleEmails}
          onCancel={handleCancelScheduledEmails}
          currentSchedule={eventData?.scheduled_email_at ? new Date(eventData.scheduled_email_at) : null}
          isLoading={isScheduling}
        />

        {/* QR Modal - Unified Access Panel (active/completed) */}
        {showQR && (
          <EventQRCode eventId={id || ""} onClose={() => setShowQR(false)} type="access" />
        )}

        {/* QR Modal - Join/Registration */}
        {showJoinQR && (
          <EventQRCode eventId={id || ""} onClose={() => setShowJoinQR(false)} type="join" />
        )}

        {/* QR Modal - Check-in */}
        {showCheckinQR && (
          <EventQRCode eventId={id || ""} onClose={() => setShowCheckinQR(false)} type="checkin" />
        )}

        {/* Add Participant Modal */}
        {showAddModal && (
          isProfessionalEvent ? (
            <AddProfessionalParticipantModal
              onClose={() => setShowAddModal(false)}
              onAdd={handleAddProfessionalParticipant}
              professionalConfig={eventData?.professional_config || undefined}
            />
          ) : (
            <AddParticipantModal
              onClose={() => setShowAddModal(false)}
              onAdd={handleAddParticipant}
              customPreferences={eventData ? {
                ageRanges: eventData.custom_age_ranges || undefined,
                genders: eventData.custom_genders || undefined,
                preferences: eventData.custom_preferences || undefined,
                datingPreferences: eventData.custom_dating_preferences || undefined,
              } : undefined}
            />
          )
        )}

        {/* Excel Preview Modal */}
        {excelPreview && (
          <ExcelPreviewModal
            participants={excelPreview.participants}
            errors={excelPreview.errors}
            onConfirm={handleConfirmExcelImport}
            onCancel={() => setExcelPreview(null)}
          />
        )}

        {/* Table Generation Confirmation Dialog */}
        <AlertDialog open={showTableConfirmDialog} onOpenChange={setShowTableConfirmDialog}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>Mesas incompletas detectadas</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  <p>
                    {pendingTableGeneration?.incompleteInfo || "Algunas mesas no pudieron completarse con las preferencias óptimas."}
                  </p>
                  <p className="font-medium">¿Qué deseas hacer?</p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex flex-col gap-2 mt-4">
              <Button
                variant="default"
                className="w-full"
                onClick={handleConfirmWithRelax}
              >
                Rellenar con preferencias similares
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleConfirmWithIncomplete}
              >
                Continuar con mesas incompletas
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setPendingTableGeneration(null);
                  setShowTableConfirmDialog(false);
                }}
              >
                Cancelar
              </Button>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* Close Event Dialog */}
        <CloseEventDialog
          open={showCloseEventDialog}
          onOpenChange={setShowCloseEventDialog}
          participants={participants}
          selections={selections}
          onCloseAndSchedule={handleCloseAndSchedule}
          onCloseAndSendNow={handleCloseAndSendNow}
          onWait={() => setShowCloseEventDialog(false)}
          isClosing={isClosingEvent}
        />

        {/* Participant Detail Modal */}
        {selectedParticipant && !editingParticipant && (
          <ParticipantDetailModal
            participant={{
              ...selectedParticipant,
              entity_type: selectedParticipant.entity_type as "client" | "provider" | null | undefined,
            }}
            tables={tables}
            selections={selections}
            participants={participants.map(p => ({
              ...p,
              entity_type: p.entity_type as "client" | "provider" | null | undefined,
            }))}
            onClose={() => setSelectedParticipant(null)}
            onEdit={() => setEditingParticipant(selectedParticipant)}
            canEdit={eventStatus === "pending"}
            isProfessional={eventData?.module === "professional"}
            eventStatus={eventStatus}
            onAssignToTables={() => {
              const participant = selectedParticipant;
              setSelectedParticipant(null);
              if (participant) {
                setPendingNewParticipant(participant);
                setShowTableAssignmentModal(true);
              }
            }}
          />
        )}

        {/* Edit Participant Modal */}
        {editingParticipant && (
          <EditParticipantModal
            participant={{
              ...editingParticipant,
              entity_type: editingParticipant.entity_type as "client" | "provider" | null | undefined,
            }}
            onClose={() => setEditingParticipant(null)}
            onSave={handleUpdateParticipant}
            customPreferences={eventData ? {
              ageRanges: eventData.custom_age_ranges || undefined,
              genders: eventData.custom_genders || undefined,
              preferences: eventData.custom_preferences || undefined,
              datingPreferences: eventData.custom_dating_preferences || undefined,
            } : undefined}
            isProfessional={eventData?.module === "professional"}
            professionalConfig={eventData?.professional_config ? {
              sectors: eventData.professional_config.sectors,
              companySizes: undefined,
              rotationType: eventData.professional_config.rotation_type,
            } : undefined}
          />
        )}

        {/* Exclusions Manager Modal */}
        <ExclusionsManager
          eventId={id || ""}
          participants={participants}
          open={showExclusionsManager}
          onOpenChange={setShowExclusionsManager}
          onExclusionsChange={setExclusions}
        />

        {/* Copy Event Dialog */}
        <AlertDialog open={showCopyEventDialog} onOpenChange={setShowCopyEventDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Copiar evento</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Qué deseas copiar del evento "{eventData.name}"?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex flex-col gap-2 mt-2">
              <Button
                variant="default"
                className="w-full"
                onClick={() => handleCopyEvent(false)}
                disabled={isCopyingEvent}
              >
                {isCopyingEvent ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Copy className="w-4 h-4 mr-2" />}
                Solo configuración
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleCopyEvent(true)}
                disabled={isCopyingEvent}
              >
                {isCopyingEvent ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Users className="w-4 h-4 mr-2" />}
                Configuración + participantes ({participants.length})
              </Button>
              <AlertDialogCancel disabled={isCopyingEvent}>Cancelar</AlertDialogCancel>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* Table Assignment Modal for active events */}
        <TableAssignmentModal
          open={showTableAssignmentModal}
          participant={pendingNewParticipant}
          tables={eventData?.tables || []}
          completedRounds={completedRounds}
          currentRound={currentRound}
          onConfirm={handleTableAssignmentConfirm}
          onClose={() => {
            setShowTableAssignmentModal(false);
            setPendingNewParticipant(null);
            toast({
              title: "Participante añadido",
              description: "El participante fue añadido pero no asignado a mesas",
            });
          }}
        />

        {/* Table Editor Modal */}
        <TableEditorModal
          open={showTableEditor}
          roundData={editingRoundData}
          allParticipants={participants}
          isCompletedRound={editingRoundData ? completedRounds.includes(editingRoundData.round) : false}
          onSave={handleTableEditorSave}
          onClose={() => { setShowTableEditor(false); setEditingRoundData(null); }}
        />
      </main>
    </div>
  );
};

export default EventDetail;
