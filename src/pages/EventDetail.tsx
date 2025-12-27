import { useState, useRef, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, ArrowLeft, Users, QrCode, Table2, Download, Play, CheckCircle2, Plus, Upload, Trash2, FileSpreadsheet, Loader2, UserCheck, Mail, Send, Settings2, ClipboardList, UserX, Eye, Clock, X } from "lucide-react";
import EmailTemplateEditor, { EmailTemplate } from "@/components/event/EmailTemplateEditor";
import MatchesDashboard from "@/components/event/MatchesDashboard";
import SelectionProgress from "@/components/event/SelectionProgress";
import InlineEmailEditor from "@/components/event/InlineEmailEditor";
import CloseEventDialog from "@/components/event/CloseEventDialog";
import ParticipantDetailModal from "@/components/event/ParticipantDetailModal";
import EditParticipantModal from "@/components/event/EditParticipantModal";
import ScheduleEmailDialog from "@/components/event/ScheduleEmailDialog";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import RoundTimer from "@/components/event/RoundTimer";
import EventQRCode from "@/components/event/EventQRCode";
import AddParticipantModal from "@/components/event/AddParticipantModal";
import ExcelPreviewModal from "@/components/event/ExcelPreviewModal";
import { parseExcelFile, Participant } from "@/lib/excelParser";
import { exportMatchesToCSV, exportMatchesToExcel } from "@/lib/exportMatches";
import { supabase } from "@/integrations/supabase/client";
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

interface EventData {
  id: string;
  name: string;
  date: string;
  rounds: number;
  table_size: number;
  round_duration: number;
  participants_count: number;
  status: string;
  tables: any;
  rotation_mode: "fixed_host" | "all_rotate";
  gender_parity: boolean;
  email_template: EmailTemplate | null;
  emails_sent_at: string | null;
  scheduled_email_at: string | null;
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
  selection_submitted_at?: string | null;
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
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [participants, setParticipants] = useState<DbParticipant[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selections, setSelections] = useState<Selection[]>([]);
  const [showQR, setShowQR] = useState(false);
  const [showJoinQR, setShowJoinQR] = useState(false);
  const [showCheckinQR, setShowCheckinQR] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentRound, setCurrentRound] = useState(1);
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

  useEffect(() => {
    loadEventData();
  }, [id]);

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
      email_template: event.email_template as unknown as EmailTemplate | null,
      emails_sent_at: event.emails_sent_at,
      scheduled_email_at: event.scheduled_email_at
    });
    setEventStatus(event.status as "pending" | "active" | "completed");
    // Load current_round from database
    setCurrentRound(event.current_round || 1);

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
      // Store raw selections
      setSelections(selectionsData);
      
      const mutualMatches: Match[] = [];
      const processed = new Set<string>();

      selectionsData.forEach(sel => {
        const key = [sel.selector_id, sel.selected_id].sort().join('-');
        if (processed.has(key)) return;

        const reverse = selectionsData.find(
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

    // Generate smart tables based on preferences
    const result = generateSmartTables(checkedInParticipants, eventData?.rounds || 5, eventData?.table_size || 2, false, eventData?.gender_parity || false);
    
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
    // Remove non-checked-in participants from database
    const nonCheckedInIds = participants.filter(p => !p.checked_in).map(p => p.id);
    if (nonCheckedInIds.length > 0) {
      await supabase
        .from("participants")
        .delete()
        .in("id", nonCheckedInIds);
    }

    // Save tables and update status, set current_round to 1 to start
    await supabase
      .from("events")
      .update({ 
        tables: generatedTables,
        status: "active",
        participants_count: checkedInParticipants.length,
        current_round: 1
      })
      .eq("id", id);
    
    setCurrentRound(1);

    setParticipants(checkedInParticipants);
    setEventData(prev => prev ? { ...prev, tables: generatedTables, participants_count: checkedInParticipants.length } : prev);
    setEventStatus("active");
    setPendingTableGeneration(null);
    setShowTableConfirmDialog(false);
    toast({
      title: "Evento iniciado",
      description: `${nonCheckedInIds.length > 0 ? `Se eliminaron ${nonCheckedInIds.length} participantes sin check-in. ` : ""}Las mesas han sido generadas.`,
    });
  };

  const handleConfirmWithRelax = async () => {
    if (!pendingTableGeneration) return;
    
    const checkedInParticipants = participants.filter(p => p.checked_in);
    // Generate tables with relaxed constraints (fill with similar preferences)
    const result = generateSmartTables(checkedInParticipants, eventData?.rounds || 5, eventData?.table_size || 2, true, eventData?.gender_parity || false);
    await finalizeTableGeneration(result.tables, checkedInParticipants);
  };

  const handleConfirmWithIncomplete = async () => {
    if (!pendingTableGeneration) return;
    
    const checkedInParticipants = participants.filter(p => p.checked_in);
    await finalizeTableGeneration(pendingTableGeneration.tables, checkedInParticipants);
  };

  // Age range order for adjacency calculation
  const AGE_RANGE_ORDER = ["18–24", "25–32", "33–40", "41–50", "+50"];

  const getAgeRangeIndex = (ageRange: string | null): number => {
    if (!ageRange) return -1;
    return AGE_RANGE_ORDER.findIndex(range => ageRange.includes(range.replace("–", "-")) || ageRange.includes(range));
  };

  const getAgeRangeDistance = (age1: string | null, age2: string | null): number => {
    const idx1 = getAgeRangeIndex(age1);
    const idx2 = getAgeRangeIndex(age2);
    if (idx1 === -1 || idx2 === -1) return 0; // Unknown = treat as same
    return Math.abs(idx1 - idx2);
  };

  // Smart table generation algorithm based on preferences
  // Supports two modes: fixed_host (one stays) or all_rotate (everyone moves)
  const generateSmartTables = (
    participantsList: DbParticipant[], 
    numRounds: number, 
    tableSize: number,
    relaxConstraints: boolean = false,
    genderParity: boolean = false
  ): TableGenerationResult => {
    const rotationMode = eventData?.rotation_mode || "fixed_host";
    
    if (rotationMode === "all_rotate") {
      return generateAllRotateTables(participantsList, numRounds, tableSize, relaxConstraints, genderParity);
    } else {
      return generateFixedHostTables(participantsList, numRounds, tableSize, relaxConstraints, genderParity);
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

  // All rotate mode: everyone changes tables each round
  const generateAllRotateTables = (
    participantsList: DbParticipant[], 
    numRounds: number, 
    tableSize: number,
    relaxConstraints: boolean = false,
    genderParity: boolean = false
  ): TableGenerationResult => {
    const tables = [];
    const numParticipants = participantsList.length;
    const numTables = Math.ceil(numParticipants / tableSize);
    
    // Track who has been paired with whom across all rounds
    const pairedHistory = new Map<string, Set<string>>();
    participantsList.forEach(p => pairedHistory.set(p.id, new Set()));
    
    // Sort participants by age range for better initial grouping
    const sortedParticipants = [...participantsList].sort((a, b) => {
      const aIdx = AGE_RANGE_ORDER.findIndex(r => a.age_range?.includes(r));
      const bIdx = AGE_RANGE_ORDER.findIndex(r => b.age_range?.includes(r));
      return aIdx - bIdx;
    });
    
    let hasIncomplete = false;
    
    for (let round = 1; round <= numRounds; round++) {
      const roundTables: { id: string; name: string }[][] = [];
      const usedParticipants = new Set<string>();
      
      // Create tables for this round
      for (let tableIdx = 0; tableIdx < numTables; tableIdx++) {
        const table: { id: string; name: string }[] = [];
        const targetSize = Math.min(tableSize, numParticipants - usedParticipants.size);
        
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
          if (!relaxConstraints) {
            for (const member of table) {
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
        
        // Fill remaining if relaxed or if gender parity couldn't be achieved
        if ((relaxConstraints || genderParity) && table.length < targetSize) {
          for (const participant of availableParticipants) {
            if (table.length >= targetSize) break;
            if (!usedParticipants.has(participant.id)) {
              table.push({ id: participant.id, name: participant.name });
              usedParticipants.add(participant.id);
            }
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
    genderParity: boolean = false
  ): TableGenerationResult => {
    const tables = [];
    const numParticipants = participantsList.length;
    
    // Calculate balanced table distribution
    const numTables = Math.ceil(numParticipants / tableSize);
    const baseParticipantsPerTable = Math.floor(numParticipants / numTables);
    const tablesWithExtra = numParticipants % numTables;
    
    // Track who has been paired with whom across all rounds
    const pairedHistory = new Map<string, Set<string>>();
    participantsList.forEach(p => pairedHistory.set(p.id, new Set()));
    
    // Sort by age range first, then by compatibility potential
    const sortedParticipants = [...participantsList].sort((a, b) => {
      const aIdx = AGE_RANGE_ORDER.findIndex(r => a.age_range?.includes(r));
      const bIdx = AGE_RANGE_ORDER.findIndex(r => b.age_range?.includes(r));
      if (aIdx !== bIdx) return aIdx - bIdx;
      
      const aScore = (a.preferred_age_range?.includes("Cualquier") ? 2 : 0) + 
                     (a.preference === "Amistad y ligue" ? 1 : 0);
      const bScore = (b.preferred_age_range?.includes("Cualquier") ? 2 : 0) + 
                     (b.preference === "Amistad y ligue" ? 1 : 0);
      return bScore - aScore;
    });
    
    // Distribute hosts evenly across age ranges
    const hosts: DbParticipant[] = [];
    const hostIndices = new Set<number>();
    for (let i = 0; i < numTables && hosts.length < numTables; i++) {
      const idx = Math.floor(i * sortedParticipants.length / numTables);
      if (!hostIndices.has(idx)) {
        hosts.push(sortedParticipants[idx]);
        hostIndices.add(idx);
      }
    }
    for (let i = 0; hosts.length < numTables && i < sortedParticipants.length; i++) {
      if (!hostIndices.has(i)) {
        hosts.push(sortedParticipants[i]);
        hostIndices.add(i);
      }
    }
    
    const rotators = sortedParticipants.filter((_, idx) => !hostIndices.has(idx));
    
    let hasIncomplete = false;
    
    const tableSizes: number[] = [];
    for (let i = 0; i < numTables; i++) {
      tableSizes.push(baseParticipantsPerTable + (i < tablesWithExtra ? 1 : 0));
    }
    
    const actualRounds = Math.min(numRounds, rotators.length > 0 ? rotators.length : 1);
    
    for (let round = 1; round <= actualRounds; round++) {
      const roundTables: { id: string; name: string }[][] = [];
      const usedRotators = new Set<string>();
      
      for (let tableIdx = 0; tableIdx < hosts.length; tableIdx++) {
        const host = hosts[tableIdx];
        const table: { id: string; name: string }[] = [{ id: host.id, name: host.name }];
        
        const targetSize = tableSizes[tableIdx] || tableSize;
        const seatsNeeded = targetSize - 1;
        
        const availableRotators = rotators.filter(r => !usedRotators.has(r.id));
        
        // Count available genders for parity
        const menAvailable = availableRotators.filter(r => r.gender === "Hombre").length;
        const womenAvailable = availableRotators.filter(r => r.gender === "Mujer").length;

        const scoredRotators = availableRotators.map(rotator => {
          let score = calculateCompatibilityScore(host, rotator);
          
          table.forEach(member => {
            const memberParticipant = participantsList.find(p => p.id === member.id);
            if (memberParticipant) {
              const dist = getAgeRangeDistance(rotator.age_range, memberParticipant.age_range);
              if (dist === 0) score += 5;
              else if (dist === 1) score += 2;
            }
          });
          
          if (pairedHistory.get(host.id)?.has(rotator.id)) {
            score -= 100;
          }
          
          table.forEach(member => {
            if (pairedHistory.get(member.id)?.has(rotator.id)) {
              score -= 50;
            }
          });
          
          // Add gender parity bonus/penalty
          if (genderParity) {
            const { men, women } = countTableGenders(table, participantsList);
            const targetPerGender = Math.floor(targetSize / 2);
            
            if (rotator.gender === "Hombre" && men < targetPerGender) {
              score += 10; // Bonus for balancing
            } else if (rotator.gender === "Mujer" && women < targetPerGender) {
              score += 10; // Bonus for balancing
            } else if (rotator.gender === "Hombre" && men >= targetPerGender && womenAvailable > 0) {
              score -= 20; // Penalty if we have enough men but need women
            } else if (rotator.gender === "Mujer" && women >= targetPerGender && menAvailable > 0) {
              score -= 20; // Penalty if we have enough women but need men
            }
          }
          
          return { rotator, score };
        }).sort((a, b) => b.score - a.score);
        
        let filledSeats = 0;
        for (const { rotator, score } of scoredRotators) {
          if (filledSeats >= seatsNeeded) break;
          if (usedRotators.has(rotator.id)) continue;
          
          const wouldRepeat = pairedHistory.get(host.id)?.has(rotator.id) ||
                              table.some(m => pairedHistory.get(m.id)?.has(rotator.id));
          
          if (wouldRepeat && !relaxConstraints && score < 0) {
            continue;
          }
          
          table.push({ id: rotator.id, name: rotator.name });
          usedRotators.add(rotator.id);
          filledSeats++;
        }
        
        if ((relaxConstraints || genderParity) && filledSeats < seatsNeeded) {
          for (const { rotator } of scoredRotators) {
            if (filledSeats >= seatsNeeded) break;
            if (usedRotators.has(rotator.id)) continue;
            
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

  const handleToggleCheckin = async (participantId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("participants")
      .update({ checked_in: !currentStatus })
      .eq("id", participantId);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el check-in",
        variant: "destructive",
      });
      return;
    }

    setParticipants(participants.map(p => 
      p.id === participantId ? { ...p, checked_in: !currentStatus } : p
    ));
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
    }
    
    toast({
      title: "Participantes cargados",
      description: eventStatus === "active"
        ? `Se han añadido ${excelPreview.participants.length} participantes (confirmados automáticamente)`
        : `Se han añadido ${excelPreview.participants.length} participantes`,
    });
    
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
        age: participant.age || null,
        age_range: participant.ageRange || null,
        preferred_age_range: participant.preferredAgeRange || null,
        preference: participant.preference || null,
        dating_preference: participant.datingPreference || null,
        gender: participant.gender || null,
        phone: participant.phone || null,
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
    
    toast({
      title: "Participante añadido",
      description: autoCheckin 
        ? `${participant.name} ha sido añadido y confirmado automáticamente (evento activo)`
        : `${participant.name} ha sido añadido al evento`,
    });
  };

  const handleDeleteParticipant = async (participantId: string) => {
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
    
    toast({
      title: "Participante eliminado",
      description: "El participante ha sido eliminado del evento",
    });
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

    toast({
      title: "Participantes eliminados",
      description: "Todos los participantes han sido eliminados",
    });
  };

  const handleUpdateParticipant = (updatedParticipant: DbParticipant) => {
    setParticipants(participants.map(p => 
      p.id === updatedParticipant.id ? updatedParticipant : p
    ));
    setEditingParticipant(null);
    setSelectedParticipant(null);
  };

  // Get dominant age range for a table
  const getTableAgeRangeInfo = (tableMembers: { id: string; name: string }[]): { dominant: string; isMixed: boolean } => {
    const ageRanges: Record<string, number> = {};
    
    tableMembers.forEach(member => {
      const participant = participants.find(p => p.id === member.id);
      const ageRange = participant?.age_range || "Desconocido";
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

  const handleEndEvent = async () => {
    await supabase
      .from("events")
      .update({ status: "completed" })
      .eq("id", id);

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

      toast({
        title: "Emails enviados",
        description: `Se enviaron ${data?.sent || 0} emails correctamente${data?.failed > 0 ? `. ${data.failed} fallidos.` : "."}`,
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

  const handleCloseAndSendEmails = async () => {
    if (!id) return;
    
    setIsClosingEvent(true);
    
    try {
      // Get current session for authorization
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error("No estás autenticado");
      }

      // First close the event
      await supabase
        .from("events")
        .update({ status: "completed" })
        .eq("id", id);

      setEventStatus("completed");
      
      // Then send emails with authorization
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

  const handleCloseWithoutSending = async () => {
    if (!id) return;
    
    setIsClosingEvent(true);
    
    try {
      await supabase
        .from("events")
        .update({ status: "completed" })
        .eq("id", id);

      setEventStatus("completed");
      setShowCloseEventDialog(false);
      setShowQR(true);
      
      toast({
        title: "Evento cerrado",
        description: "El evento ha sido cerrado. Puedes enviar los emails más tarde.",
      });
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "No se pudo cerrar el evento",
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
    
    const headers = ["Nombre", "Teléfono", "Rango Edad", "Edad Preferida", "Preferencia", "Preferencia de Ligue", "Género"];
    const rows = participants.map(p => [p.name, p.phone || "", p.age_range, p.preferred_age_range, p.preference, p.dating_preference || "", p.gender]);
    
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
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/admin/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Volver al dashboard
          </Link>

          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Heart className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold">SpeedMatch</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold mb-2">{eventData.name}</h1>
            <p className="text-muted-foreground">
              {participants.length} participantes • {participants.filter(p => p.checked_in).length} check-in ✅
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {eventStatus === "pending" && (
              <Button variant="outline" onClick={() => setShowJoinQR(true)}>
                <QrCode className="w-4 h-4 mr-2" />
                QR Registro
              </Button>
            )}
            {eventStatus === "pending" && (
              <Button variant="outline" onClick={() => setShowCheckinQR(true)}>
                <QrCode className="w-4 h-4 mr-2" />
                QR Check-in
              </Button>
            )}
            {eventStatus === "pending" && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="hero">
                    <Play className="w-4 h-4 mr-2" />
                    Cerrar inscripciones e iniciar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Cerrar inscripciones e iniciar evento?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción cerrará las inscripciones. Los participantes sin check-in ({participants.filter(p => !p.checked_in).length}) serán eliminados y se generarán las mesas automáticamente con los {participants.filter(p => p.checked_in).length} participantes confirmados.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleStartEvent}>
                      Confirmar e iniciar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {eventStatus === "active" && (
              <>
                <Button variant="outline" onClick={() => setShowQR(true)}>
                  <QrCode className="w-4 h-4 mr-2" />
                  QR Selección
                </Button>
                <Button variant="hero" onClick={() => setShowCloseEventDialog(true)}>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Cerrar evento y enviar emails
                </Button>
              </>
            )}
            {eventStatus === "completed" && (
              <Button variant="outline" onClick={() => setShowQR(true)}>
                <QrCode className="w-4 h-4 mr-2" />
                QR Matches
              </Button>
            )}
            {eventStatus === "pending" && (
              <Button variant="outline" onClick={() => setShowEmailEditor(true)}>
                <Mail className="w-4 h-4 mr-2" />
                Personalizar email
              </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="participants" className="space-y-6">
          <TabsList className="bg-card border">
            <TabsTrigger value="participants" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users className="w-4 h-4 mr-2" />
              Participantes
            </TabsTrigger>
            <TabsTrigger value="tables" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Table2 className="w-4 h-4 mr-2" />
              Mesas
            </TabsTrigger>
            <TabsTrigger value="matches" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Heart className="w-4 h-4 mr-2" />
              Matches ({matches.length})
            </TabsTrigger>
            {(eventStatus === "active" || eventStatus === "completed") && (
              <TabsTrigger value="selections" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <ClipboardList className="w-4 h-4 mr-2" />
                Selecciones
              </TabsTrigger>
            )}
            {(eventStatus === "active" || eventStatus === "completed") && (
              <TabsTrigger value="emails" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Mail className="w-4 h-4 mr-2" />
                Emails
              </TabsTrigger>
            )}
          </TabsList>

          {/* Participants Tab */}
          <TabsContent value="participants">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                   <div>
                    <CardTitle>Lista de Participantes</CardTitle>
                    <CardDescription>{participants.length} personas registradas</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {eventStatus === "pending" && participants.length > 0 && (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleCheckInAll}
                        >
                          <UserCheck className="w-4 h-4 mr-2" />
                          Check-in todos
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                              <UserX className="w-4 h-4 mr-2" />
                              Eliminar todos
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar todos los participantes?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción eliminará a los {participants.length} participantes del evento. No se puede deshacer.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={handleDeleteAllParticipants}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Eliminar todos
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="excel-upload"
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isLoadingExcel}
                    >
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      {isLoadingExcel ? "Cargando..." : "Cargar Excel"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowAddModal(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Añadir manual
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={exportToCSV}
                      disabled={participants.length === 0}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Exportar
                    </Button>
                  </div>
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
                    {participants.map((participant, index) => (
                      <div 
                        key={participant.id}
                        className={`flex items-center justify-between p-4 rounded-lg animate-fade-in cursor-pointer hover:shadow-md transition-shadow ${
                          participant.checked_in ? "bg-primary/10 border border-primary/20" : "bg-muted/50"
                        }`}
                        style={{ animationDelay: `${index * 0.05}s` }}
                        onClick={() => setSelectedParticipant(participant)}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
                            participant.checked_in 
                              ? "bg-primary text-primary-foreground" 
                              : "bg-gradient-primary text-primary-foreground"
                          }`}>
                            {participant.checked_in ? "✓" : participant.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium flex items-center gap-2">
                              {participant.name}
                              {participant.checked_in && (
                                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">Check-in ✅</span>
                              )}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {participant.age_range || "Sin rango"} • {participant.preference}
                              {participant.dating_preference && ` • ${participant.dating_preference}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" onClick={() => setSelectedParticipant(participant)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <div className="hidden sm:block">
                            <InlineEmailEditor
                              participantId={participant.id}
                              currentEmail={participant.email}
                              onEmailUpdated={(newEmail) => handleUpdateParticipantEmail(participant.id, newEmail)}
                            />
                          </div>
                          {getGenderBadge(participant.gender)}
                          {eventStatus === "pending" && (
                            <Button
                              variant={participant.checked_in ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleToggleCheckin(participant.id, participant.checked_in)}
                              className={participant.checked_in ? "bg-primary hover:bg-primary/90" : ""}
                            >
                              <UserCheck className="w-4 h-4 mr-1" />
                              <span className="hidden sm:inline">{participant.checked_in ? "Confirmado" : "Check-in"}</span>
                            </Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar participante?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  ¿Estás seguro de que quieres eliminar a {participant.name}?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteParticipant(participant.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tables Tab */}
          <TabsContent value="tables">
            <div className="space-y-6">
              {eventStatus === "active" && tables.length > 0 && (
                <>
                  <RoundTimer
                    roundDuration={Math.floor((eventData.round_duration || 300) / 60)}
                    currentRound={currentRound}
                    totalRounds={tables.length}
                    onRoundComplete={() => {
                      toast({
                        title: "¡Ronda completada!",
                        description: "Es hora de cambiar de mesa",
                      });
                    }}
                    onAdvanceRound={async () => {
                      const newRound = currentRound + 1;
                      if (newRound <= tables.length) {
                        await supabase
                          .from("events")
                          .update({ current_round: newRound })
                          .eq("id", id);
                        setCurrentRound(newRound);
                        toast({
                          title: `Ronda ${newRound} iniciada`,
                          description: "Los participantes pueden ver sus nuevos compañeros de mesa",
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
                            Mostrar QR de Selección
                          </Button>
                          
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">Selecciones enviadas</p>
                            <p className="text-2xl font-bold text-primary">
                              {participants.filter(p => p.selection_submitted_at).length} / {participants.length}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {currentRound < tables.length && (
                            <Button 
                              variant="outline"
                              onClick={() => {
                                setCurrentRound(prev => prev + 1);
                                toast({
                                  title: `Ronda ${currentRound + 1}`,
                                  description: "Avanzando a la siguiente ronda",
                                });
                              }}
                            >
                              Siguiente Ronda →
                            </Button>
                          )}
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
                    <h3 className="font-display text-lg font-semibold mb-2">Inscripciones abiertas</h3>
                    <p className="text-muted-foreground mb-4">
                      Las mesas se generarán automáticamente cuando cierres las inscripciones e inicies el evento.
                      <br />
                      <span className="text-sm">Participantes con check-in: {participants.filter(p => p.checked_in).length} de {participants.length}</span>
                    </p>
                    <Button variant="outline" onClick={() => setShowCheckinQR(true)}>
                      <QrCode className="w-4 h-4 mr-2" />
                      Ver QR Check-in
                    </Button>
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
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Ronda:</span>
                    {tables.map((table) => (
                      <Button
                        key={table.round}
                        variant={currentRound === table.round ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentRound(table.round)}
                      >
                        {table.round}
                      </Button>
                    ))}
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Ronda {currentRound}</CardTitle>
                      <CardDescription>Distribución de mesas para esta ronda</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {tables.find(t => t.round === currentRound)?.tables.map((table: DbParticipant[], tableIndex: number) => {
                          const ageInfo = getTableAgeRangeInfo(table);
                          const isFriendshipOnly = eventData?.rotation_mode === "all_rotate" || 
                            !table.some((m: any) => {
                              const p = participants.find(pp => pp.id === m.id);
                              return p?.preference?.toLowerCase().includes('ligue');
                            });
                          
                          return (
                            <Card key={tableIndex} className="bg-gradient-card">
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <Table2 className="w-4 h-4 text-primary" />
                                    <span className="font-medium">Mesa {tableIndex + 1}</span>
                                  </div>
                                  {isFriendshipOnly && (
                                    <Badge 
                                      variant={ageInfo.isMixed ? "outline" : "secondary"}
                                      className={ageInfo.isMixed ? "text-amber-600 border-amber-300" : ""}
                                    >
                                      {ageInfo.isMixed ? `Mixto` : ageInfo.dominant}
                                    </Badge>
                                  )}
                                </div>
                                <div className="space-y-2">
                                  {table.map((participant: any) => (
                                    <div key={participant.id} className="flex items-center gap-2 p-2 rounded-md bg-background/50">
                                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium">
                                        {participant.name.charAt(0)}
                                      </div>
                                      <span className="text-sm">{participant.name}</span>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="matches">
            <MatchesDashboard
              matches={matches}
              selections={selections}
              participants={participants}
              eventName={eventData?.name || ""}
              eventStatus={eventStatus}
              onShowQR={() => setShowQR(true)}
              onRefresh={loadEventData}
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

          {/* Emails Tab */}
          <TabsContent value="emails">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Envío de Emails</CardTitle>
                    <CardDescription>
                      Notifica a los participantes sobre sus matches
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowEmailEditor(true)}
                    >
                      <Settings2 className="w-4 h-4 mr-2" />
                      Personalizar plantilla
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Statistics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-muted/50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-primary">
                      {participants.filter(p => p.email).length}
                    </div>
                    <div className="text-sm text-muted-foreground">Con email</div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-destructive">
                      {participants.filter(p => !p.email).length}
                    </div>
                    <div className="text-sm text-muted-foreground">Sin email</div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold">
                      {matches.length}
                    </div>
                    <div className="text-sm text-muted-foreground">Matches totales</div>
                  </div>
                </div>

                {/* Scheduled Email Status */}
                {eventData?.scheduled_email_at && !eventData?.emails_sent_at && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      <div>
                        <p className="font-medium text-amber-700 dark:text-amber-300">Envío programado</p>
                        <p className="text-sm text-muted-foreground">
                          Programado para el {new Date(eventData.scheduled_email_at).toLocaleDateString("es-ES", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleCancelScheduledEmails}
                      disabled={isScheduling}
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Cancelar
                    </Button>
                  </div>
                )}

                {/* Email Status */}
                {eventData?.emails_sent_at && (
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium text-primary">Emails enviados</p>
                      <p className="text-sm text-muted-foreground">
                        Enviados el {new Date(eventData.emails_sent_at).toLocaleDateString("es-ES", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </p>
                    </div>
                  </div>
                )}

                {/* Template Preview */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-2 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Plantilla actual
                  </h3>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p><span className="font-medium">Asunto (con matches):</span> {eventData?.email_template?.withMatches?.subject || "¡Tienes matches en {{evento}}! 🎉"}</p>
                    <p><span className="font-medium">Asunto (sin matches):</span> {eventData?.email_template?.withoutMatches?.subject || "Gracias por participar en {{evento}}"}</p>
                  </div>
                </div>

                {/* Send Buttons */}
                <div className="flex flex-col items-center gap-4 py-4">
                  {participants.filter(p => !p.email).length > 0 && (
                    <p className="text-sm text-amber-600 dark:text-amber-400 text-center">
                      ⚠️ {participants.filter(p => !p.email).length} participantes no tienen email registrado y no recibirán notificación.
                    </p>
                  )}
                  
                  <div className="flex flex-wrap justify-center gap-3">
                    {/* Immediate Send Button */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="hero" 
                          size="lg"
                          disabled={isSendingEmails || participants.filter(p => p.email).length === 0}
                        >
                          {isSendingEmails ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Enviando...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-2" />
                              {eventData?.emails_sent_at ? "Reenviar emails" : "Enviar ahora"}
                            </>
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            {eventData?.emails_sent_at ? "¿Reenviar emails?" : "¿Enviar emails?"}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {eventData?.emails_sent_at 
                              ? `Los emails ya fueron enviados previamente. ¿Quieres reenviarlos a los ${participants.filter(p => p.email).length} participantes con email?`
                              : `Se enviarán emails a ${participants.filter(p => p.email).length} participantes con sus matches (o un mensaje de agradecimiento si no tienen matches).`
                            }
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={handleSendEmails}>
                            Confirmar envío
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    {/* Schedule Button */}
                    {!eventData?.emails_sent_at && (
                      <Button 
                        variant="outline" 
                        size="lg"
                        onClick={() => setShowScheduleDialog(true)}
                        disabled={participants.filter(p => p.email).length === 0}
                      >
                        <Clock className="w-4 h-4 mr-2" />
                        {eventData?.scheduled_email_at ? "Modificar programación" : "Programar envío"}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Email Template Editor Modal */}
        {showEmailEditor && (
          <EmailTemplateEditor
            template={eventData?.email_template || null}
            eventName={eventData?.name || ""}
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

        {/* QR Modal - Matches */}
        {showQR && (
          <EventQRCode eventId={id || ""} onClose={() => setShowQR(false)} type="select" />
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
          <AddParticipantModal
            onClose={() => setShowAddModal(false)}
            onAdd={handleAddParticipant}
          />
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
          onCloseAndSend={handleCloseAndSendEmails}
          onCloseWithoutSending={handleCloseWithoutSending}
          onWait={() => setShowCloseEventDialog(false)}
          isClosing={isClosingEvent}
        />

        {/* Participant Detail Modal */}
        {selectedParticipant && !editingParticipant && (
          <ParticipantDetailModal
            participant={selectedParticipant}
            tables={tables}
            selections={selections}
            participants={participants}
            onClose={() => setSelectedParticipant(null)}
            onEdit={() => setEditingParticipant(selectedParticipant)}
            canEdit={eventStatus === "pending"}
          />
        )}

        {/* Edit Participant Modal */}
        {editingParticipant && (
          <EditParticipantModal
            participant={editingParticipant}
            onClose={() => setEditingParticipant(null)}
            onSave={handleUpdateParticipant}
          />
        )}
      </main>
    </div>
  );
};

export default EventDetail;
