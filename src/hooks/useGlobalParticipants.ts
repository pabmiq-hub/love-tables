import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface GlobalParticipant {
  id: string;
  organizer_id: string;
  email: string | null;
  phone: string | null;
  display_name: string;
  events_attended: number;
  created_at: string;
  updated_at: string;
}

interface ParticipantEncounter {
  id: string;
  global_participant_1_id: string;
  global_participant_2_id: string;
  event_id: string;
  round_number: number;
  table_number: number;
  encountered_at: string;
}

export function useGlobalParticipants() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Find or create a global participant based on email or phone
  const findOrCreateGlobalParticipant = useCallback(async (
    email: string | null,
    phone: string | null,
    displayName: string
  ): Promise<string | null> => {
    if (!user?.id) return null;
    if (!email && !phone) return null;

    try {
      // First, try to find existing participant
      let query = supabase
        .from('global_participants')
        .select('id')
        .eq('organizer_id', user.id);

      if (email) {
        query = query.eq('email', email.toLowerCase().trim());
      } else if (phone) {
        query = query.eq('phone', phone.trim());
      }

      const { data: existing, error: findError } = await query.maybeSingle();

      if (findError) {
        console.error('Error finding global participant:', findError);
        return null;
      }

      if (existing) {
        // Update events_attended counter
        await supabase
          .from('global_participants')
          .update({ 
            events_attended: (await supabase
              .from('global_participants')
              .select('events_attended')
              .eq('id', existing.id)
              .single()).data?.events_attended + 1 || 1,
            display_name: displayName // Update name in case it changed
          })
          .eq('id', existing.id);

        return existing.id;
      }

      // Create new global participant
      const { data: newParticipant, error: createError } = await supabase
        .from('global_participants')
        .insert({
          organizer_id: user.id,
          email: email?.toLowerCase().trim() || null,
          phone: phone?.trim() || null,
          display_name: displayName,
          events_attended: 1
        })
        .select('id')
        .single();

      if (createError) {
        console.error('Error creating global participant:', createError);
        return null;
      }

      return newParticipant.id;
    } catch (error) {
      console.error('Error in findOrCreateGlobalParticipant:', error);
      return null;
    }
  }, [user?.id]);

  // Link event participants to global participants
  const linkParticipantsToGlobal = useCallback(async (
    eventParticipants: Array<{
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
    }>
  ): Promise<Map<string, string>> => {
    const linkMap = new Map<string, string>(); // eventParticipantId -> globalParticipantId

    for (const participant of eventParticipants) {
      const globalId = await findOrCreateGlobalParticipant(
        participant.email,
        participant.phone,
        participant.name
      );

      if (globalId) {
        linkMap.set(participant.id, globalId);

        // Update the participant record with the global_participant_id
        await supabase
          .from('participants')
          .update({ global_participant_id: globalId })
          .eq('id', participant.id);
      }
    }

    return linkMap;
  }, [findOrCreateGlobalParticipant]);

  // Load previous encounters for a set of global participant IDs
  const loadPreviousEncounters = useCallback(async (
    globalParticipantIds: string[]
  ): Promise<Map<string, Set<string>>> => {
    const encountersMap = new Map<string, Set<string>>();

    if (!user?.id || globalParticipantIds.length === 0) {
      return encountersMap;
    }

    try {
      // Get all encounters where any of these participants were involved
      const { data: encounters, error } = await supabase
        .from('participant_encounters')
        .select('global_participant_1_id, global_participant_2_id')
        .eq('organizer_id', user.id)
        .or(`global_participant_1_id.in.(${globalParticipantIds.join(',')}),global_participant_2_id.in.(${globalParticipantIds.join(',')})`);

      if (error) {
        console.error('Error loading previous encounters:', error);
        return encountersMap;
      }

      // Build the encounters map
      for (const encounter of encounters || []) {
        const p1 = encounter.global_participant_1_id;
        const p2 = encounter.global_participant_2_id;

        // Only add if both participants are in our current set
        if (globalParticipantIds.includes(p1) && globalParticipantIds.includes(p2)) {
          if (!encountersMap.has(p1)) encountersMap.set(p1, new Set());
          if (!encountersMap.has(p2)) encountersMap.set(p2, new Set());
          encountersMap.get(p1)!.add(p2);
          encountersMap.get(p2)!.add(p1);
        }
      }

      return encountersMap;
    } catch (error) {
      console.error('Error in loadPreviousEncounters:', error);
      return encountersMap;
    }
  }, [user?.id]);

  // Record encounters after tables are generated
  const recordEncounters = useCallback(async (
    eventId: string,
    tables: Array<{
      round: number;
      tableNumber: number;
      participants: Array<{ id: string; global_participant_id?: string | null }>;
    }>
  ): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const encounters: Array<{
        organizer_id: string;
        global_participant_1_id: string;
        global_participant_2_id: string;
        event_id: string;
        round_number: number;
        table_number: number;
      }> = [];

      for (const table of tables) {
        const globalIds = table.participants
          .map(p => p.global_participant_id)
          .filter((id): id is string => id != null);

        // Create pairs for all participants at this table
        for (let i = 0; i < globalIds.length; i++) {
          for (let j = i + 1; j < globalIds.length; j++) {
            // Ensure ordered IDs (smaller first) to avoid duplicates
            const [id1, id2] = globalIds[i] < globalIds[j] 
              ? [globalIds[i], globalIds[j]] 
              : [globalIds[j], globalIds[i]];

            encounters.push({
              organizer_id: user.id,
              global_participant_1_id: id1,
              global_participant_2_id: id2,
              event_id: eventId,
              round_number: table.round,
              table_number: table.tableNumber
            });
          }
        }
      }

      if (encounters.length > 0) {
        const { error } = await supabase
          .from('participant_encounters')
          .insert(encounters);

        if (error) {
          console.error('Error recording encounters:', error);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error in recordEncounters:', error);
      return false;
    }
  }, [user?.id]);

  // Get all global participants for the current organizer
  const getGlobalParticipants = useCallback(async (): Promise<GlobalParticipant[]> => {
    if (!user?.id) return [];

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('global_participants')
        .select('*')
        .eq('organizer_id', user.id)
        .order('display_name');

      if (error) {
        console.error('Error fetching global participants:', error);
        return [];
      }

      return data as GlobalParticipant[];
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Get encounter history for a specific global participant
  const getParticipantHistory = useCallback(async (
    globalParticipantId: string
  ): Promise<Array<{ participant: GlobalParticipant; encounterCount: number }>> => {
    if (!user?.id) return [];

    try {
      // Get all encounters for this participant
      const { data: encounters, error: encountersError } = await supabase
        .from('participant_encounters')
        .select('global_participant_1_id, global_participant_2_id')
        .eq('organizer_id', user.id)
        .or(`global_participant_1_id.eq.${globalParticipantId},global_participant_2_id.eq.${globalParticipantId}`);

      if (encountersError) {
        console.error('Error fetching encounters:', encountersError);
        return [];
      }

      // Count encounters with each other participant
      const encounterCounts = new Map<string, number>();
      for (const enc of encounters || []) {
        const otherId = enc.global_participant_1_id === globalParticipantId
          ? enc.global_participant_2_id
          : enc.global_participant_1_id;
        encounterCounts.set(otherId, (encounterCounts.get(otherId) || 0) + 1);
      }

      // Get participant details
      const otherIds = Array.from(encounterCounts.keys());
      if (otherIds.length === 0) return [];

      const { data: participants, error: participantsError } = await supabase
        .from('global_participants')
        .select('*')
        .in('id', otherIds);

      if (participantsError) {
        console.error('Error fetching participants:', participantsError);
        return [];
      }

      return (participants as GlobalParticipant[]).map(p => ({
        participant: p,
        encounterCount: encounterCounts.get(p.id) || 0
      })).sort((a, b) => b.encounterCount - a.encounterCount);
    } catch (error) {
      console.error('Error in getParticipantHistory:', error);
      return [];
    }
  }, [user?.id]);

  return {
    loading,
    findOrCreateGlobalParticipant,
    linkParticipantsToGlobal,
    loadPreviousEncounters,
    recordEncounters,
    getGlobalParticipants,
    getParticipantHistory
  };
}
