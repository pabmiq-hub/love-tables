import { useState, useRef, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, ArrowLeft, Users, QrCode, Table2, Download, Play, CheckCircle2, Plus, Upload, Trash2, FileSpreadsheet, Loader2, UserCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import RoundTimer from "@/components/event/RoundTimer";
import EventQRCode from "@/components/event/EventQRCode";
import AddParticipantModal from "@/components/event/AddParticipantModal";
import ExcelPreviewModal from "@/components/event/ExcelPreviewModal";
import { parseExcelFile, Participant } from "@/lib/excelParser";
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
}

interface DbParticipant {
  id: string;
  name: string;
  age: number | null;
  age_range: string | null;
  preferred_age_range: string | null;
  preference: string | null;
  dating_preference: string | null;
  gender: string | null;
  phone: string | null;
  checked_in: boolean;
}

interface Match {
  participant1: DbParticipant;
  participant2: DbParticipant;
  matchTypes: {
    friendship: boolean;
    dating: boolean;
  };
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

    setEventData(event);
    setEventStatus(event.status as "pending" | "active" | "completed");

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
            const sel1Type = (sel as any).selection_type || 'friendship';
            const sel2Type = (reverse as any).selection_type || 'friendship';
            
            const matchTypes = {
              friendship: (sel1Type === 'friendship' || sel1Type === 'both') && 
                          (sel2Type === 'friendship' || sel2Type === 'both'),
              dating: (sel1Type === 'dating' || sel1Type === 'both') && 
                      (sel2Type === 'dating' || sel2Type === 'both'),
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
    const result = generateSmartTables(checkedInParticipants, eventData?.rounds || 5, eventData?.table_size || 2);
    
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

    // Save tables and update status
    await supabase
      .from("events")
      .update({ 
        tables: generatedTables,
        status: "active",
        participants_count: checkedInParticipants.length
      })
      .eq("id", id);

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
    const result = generateSmartTables(checkedInParticipants, eventData?.rounds || 5, eventData?.table_size || 2, true);
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

  // Smart table generation algorithm based on preferences with fixed-seat format
  // One person stays at each table (table "hosts") while others rotate
  const generateSmartTables = (
    participantsList: DbParticipant[], 
    numRounds: number, 
    tableSize: number,
    relaxConstraints: boolean = false
  ): TableGenerationResult => {
    const tables = [];
    const numParticipants = participantsList.length;
    
    // Calculate balanced table distribution
    // Prefer balanced sizes (e.g., two tables of 3 over one of 2 and one of 4)
    const numTables = Math.ceil(numParticipants / tableSize);
    const baseParticipantsPerTable = Math.floor(numParticipants / numTables);
    const tablesWithExtra = numParticipants % numTables;
    
    // This creates a more balanced distribution
    // e.g., 7 participants with tableSize 4: 2 tables -> 4+3 instead of trying 4+4
    // e.g., 8 participants with tableSize 5: 2 tables -> 4+4 instead of 5+3
    
    // Track who has been paired with whom across all rounds
    const pairedHistory = new Map<string, Set<string>>();
    participantsList.forEach(p => pairedHistory.set(p.id, new Set()));
    
    // Group participants by age range for better matching
    const byAgeRange = new Map<string, DbParticipant[]>();
    participantsList.forEach(p => {
      const range = p.age_range || "unknown";
      if (!byAgeRange.has(range)) byAgeRange.set(range, []);
      byAgeRange.get(range)!.push(p);
    });
    
    // Assign fixed hosts - one per table (they stay at their table all rounds)
    // Sort by age range first, then by compatibility potential
    const sortedParticipants = [...participantsList].sort((a, b) => {
      // First sort by age range to group similar ages
      const aIdx = AGE_RANGE_ORDER.findIndex(r => a.age_range?.includes(r));
      const bIdx = AGE_RANGE_ORDER.findIndex(r => b.age_range?.includes(r));
      if (aIdx !== bIdx) return aIdx - bIdx;
      
      // Then by compatibility potential
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
      // Pick hosts spread across the sorted list to represent different age ranges
      const idx = Math.floor(i * sortedParticipants.length / numTables);
      if (!hostIndices.has(idx)) {
        hosts.push(sortedParticipants[idx]);
        hostIndices.add(idx);
      }
    }
    // Fill remaining hosts if needed
    for (let i = 0; hosts.length < numTables && i < sortedParticipants.length; i++) {
      if (!hostIndices.has(i)) {
        hosts.push(sortedParticipants[i]);
        hostIndices.add(i);
      }
    }
    
    const rotators = sortedParticipants.filter((_, idx) => !hostIndices.has(idx));
    
    let hasIncomplete = false;
    const incompleteReasons: string[] = [];
    
    // Calculate target sizes for each table (balanced distribution)
    const tableSizes: number[] = [];
    for (let i = 0; i < numTables; i++) {
      tableSizes.push(baseParticipantsPerTable + (i < tablesWithExtra ? 1 : 0));
    }
    
    const actualRounds = Math.min(numRounds, rotators.length > 0 ? rotators.length : 1);
    
    for (let round = 1; round <= actualRounds; round++) {
      const roundTables: { id: string; name: string }[][] = [];
      const usedRotators = new Set<string>();
      
      // For each table (host)
      for (let tableIdx = 0; tableIdx < hosts.length; tableIdx++) {
        const host = hosts[tableIdx];
        const table: { id: string; name: string }[] = [{ id: host.id, name: host.name }];
        
        // Target size for this table (balanced distribution)
        const targetSize = tableSizes[tableIdx] || tableSize;
        const seatsNeeded = targetSize - 1;
        
        const availableRotators = rotators.filter(r => !usedRotators.has(r.id));
        
        // Score and sort available rotators by compatibility
        // Prioritize same age range, then adjacent age ranges
        const scoredRotators = availableRotators.map(rotator => {
          let score = calculateCompatibilityScore(host, rotator);
          
          // Bonus for same/similar age as other table members
          table.forEach(member => {
            const memberParticipant = participantsList.find(p => p.id === member.id);
            if (memberParticipant) {
              const dist = getAgeRangeDistance(rotator.age_range, memberParticipant.age_range);
              if (dist === 0) score += 5; // Same age range as tablemate
              else if (dist === 1) score += 2; // Adjacent age range
            }
          });
          
          // Penalty for already paired in previous rounds
          if (pairedHistory.get(host.id)?.has(rotator.id)) {
            score -= 100; // Strong penalty to avoid repeats
          }
          
          // Also check if rotator would repeat with anyone already in the table
          table.forEach(member => {
            if (pairedHistory.get(member.id)?.has(rotator.id)) {
              score -= 50;
            }
          });
          
          return { rotator, score };
        }).sort((a, b) => b.score - a.score);
        
        // Select best rotators for this table
        let filledSeats = 0;
        for (const { rotator, score } of scoredRotators) {
          if (filledSeats >= seatsNeeded) break;
          if (usedRotators.has(rotator.id)) continue;
          
          // Check if this would be a repeat (unless relaxed)
          const wouldRepeat = pairedHistory.get(host.id)?.has(rotator.id) ||
                              table.some(m => pairedHistory.get(m.id)?.has(rotator.id));
          
          if (wouldRepeat && !relaxConstraints && score < 0) {
            // Skip if not relaxing constraints and this is a repeat
            continue;
          }
          
          table.push({ id: rotator.id, name: rotator.name });
          usedRotators.add(rotator.id);
          filledSeats++;
        }
        
        // If we couldn't fill the table and relaxConstraints is true, fill with anyone
        if (relaxConstraints && filledSeats < seatsNeeded) {
          for (const { rotator } of scoredRotators) {
            if (filledSeats >= seatsNeeded) break;
            if (usedRotators.has(rotator.id)) continue;
            
            table.push({ id: rotator.id, name: rotator.name });
            usedRotators.add(rotator.id);
            filledSeats++;
          }
        }
        
        // Check if table is incomplete based on its target size
        if (table.length < targetSize) {
          hasIncomplete = true;
        }
        
        // Record pairings for this round
        for (let i = 0; i < table.length; i++) {
          for (let j = i + 1; j < table.length; j++) {
            pairedHistory.get(table[i].id)?.add(table[j].id);
            pairedHistory.get(table[j].id)?.add(table[i].id);
          }
        }
        
        roundTables.push(table);
      }
      
      // Rotate the rotators for next round
      if (rotators.length > 1) {
        const first = rotators.shift()!;
        rotators.push(first);
      }
      
      tables.push({ round, tables: roundTables });
    }
    
    if (hasIncomplete) {
      incompleteReasons.push("Algunas mesas no pudieron completarse con las preferencias óptimas.");
    }
    
    return {
      tables,
      hasIncomplete,
      incompleteInfo: incompleteReasons.join(" "),
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
      description: `Se han añadido ${excelPreview.participants.length} participantes`,
    });
    
    setExcelPreview(null);
  };

  const handleAddParticipant = async (participant: Participant) => {
    if (!id) return;

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
      description: `${participant.name} ha sido añadido al evento`,
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
            <Button variant="outline" onClick={() => setShowJoinQR(true)}>
              <QrCode className="w-4 h-4 mr-2" />
              QR Registro
            </Button>
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
              <Button variant="hero" onClick={handleEndEvent}>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Finalizar evento
              </Button>
            )}
            {eventStatus === "completed" && (
              <Button variant="outline" onClick={() => setShowQR(true)}>
                <QrCode className="w-4 h-4 mr-2" />
                QR Matches
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
                        className={`flex items-center justify-between p-4 rounded-lg animate-fade-in ${
                          participant.checked_in ? "bg-primary/10 border border-primary/20" : "bg-muted/50"
                        }`}
                        style={{ animationDelay: `${index * 0.05}s` }}
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
                        <div className="flex items-center gap-2 sm:gap-3">
                          {getGenderBadge(participant.gender)}
                          <span className="text-sm text-muted-foreground hidden sm:inline">
                            Busca: {participant.preferred_age_range || "Sin preferencia"}
                          </span>
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
                />
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
                        {tables.find(t => t.round === currentRound)?.tables.map((table: DbParticipant[], tableIndex: number) => (
                          <Card key={tableIndex} className="bg-gradient-card">
                            <CardContent className="p-4">
                              <div className="flex items-center gap-2 mb-3">
                                <Table2 className="w-4 h-4 text-primary" />
                                <span className="font-medium">Mesa {tableIndex + 1}</span>
                              </div>
                              <div className="space-y-2">
                                {table.map((participant) => (
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
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </TabsContent>

          {/* Matches Tab */}
          <TabsContent value="matches">
            <Card>
              <CardHeader>
                <CardTitle>Coincidencias ({matches.length})</CardTitle>
                <CardDescription>
                  Matches mutuos entre participantes
                </CardDescription>
              </CardHeader>
              <CardContent>
                {matches.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                      <Heart className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-display text-lg font-semibold mb-2">Sin matches todavía</h3>
                    <p className="text-muted-foreground">
                      {eventStatus === "completed" 
                        ? "Espera a que los participantes voten usando el código QR"
                        : "Finaliza el evento y comparte el código QR para que los participantes voten"
                      }
                    </p>
                    <Button variant="outline" className="mt-4" onClick={loadEventData}>
                      Actualizar matches
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {matches.map((match, index) => {
                      const matchLabels: string[] = [];
                      if (match.matchTypes.friendship) matchLabels.push("Amistad 😊");
                      if (match.matchTypes.dating) matchLabels.push("Ligue 💕");
                      const matchLabel = matchLabels.length > 0 ? matchLabels.join(" + ") : "Match";
                      
                      return (
                        <div 
                          key={index}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20 gap-3"
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex -space-x-2">
                              <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-medium border-2 border-background">
                                {match.participant1.name.charAt(0)}
                              </div>
                              <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-medium border-2 border-background">
                                {match.participant2.name.charAt(0)}
                              </div>
                            </div>
                            <div>
                              <p className="font-medium">{match.participant1.name} & {match.participant2.name}</p>
                              <p className="text-sm text-muted-foreground">¡Match mutuo! {matchLabel}</p>
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2 text-sm">
                            {match.participant1.phone && (
                              <a href={`tel:${match.participant1.phone}`} className="text-primary hover:underline">
                                📞 {match.participant1.name.split(' ')[0]}
                              </a>
                            )}
                            {match.participant2.phone && (
                              <a href={`tel:${match.participant2.phone}`} className="text-primary hover:underline">
                                📞 {match.participant2.name.split(' ')[0]}
                              </a>
                            )}
                          </div>
                          <Heart className="w-5 h-5 text-primary hidden sm:block" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

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
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Mesas incompletas detectadas</AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <p>
                  {pendingTableGeneration?.incompleteInfo || "No se pudieron completar todas las mesas siguiendo estrictamente las preferencias de los participantes."}
                </p>
                <p className="font-medium">¿Qué deseas hacer?</p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:gap-3">
              <AlertDialogCancel 
                className="order-3 sm:order-1"
                onClick={() => {
                  setPendingTableGeneration(null);
                  setShowTableConfirmDialog(false);
                }}
              >
                Cancelar
              </AlertDialogCancel>
              <Button
                variant="outline"
                className="order-2"
                onClick={handleConfirmWithIncomplete}
              >
                Continuar con mesas incompletas
              </Button>
              <Button
                variant="default"
                className="order-1 sm:order-3"
                onClick={handleConfirmWithRelax}
              >
                Rellenar con preferencias similares
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
};

export default EventDetail;
