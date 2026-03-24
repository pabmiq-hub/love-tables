import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useOrganizer } from './useOrganizer';
import { useToast } from './use-toast';

export interface CRMUser {
  id: string;
  organizer_id: string;
  email: string | null;
  phone: string | null;
  display_name: string;
  events_attended: number;
  status: string;
  source_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CRMUserDetail extends CRMUser {
  eventHistory: EventParticipation[];
}

export interface EventParticipation {
  event_id: string;
  event_name: string;
  event_date: string;
  event_module: string | null;
  checked_in: boolean | null;
  selection_submitted_at: string | null;
  selections_sent: number;
  selections_received: number;
  mutual_matches: number;
  participant_id: string;
}

export interface DuplicateGroup {
  key: string;
  type: 'email' | 'phone';
  value: string;
  participants: CRMUser[];
}

export interface CRMFilters {
  status?: string;
  eventId?: string;
  search?: string;
  moduleType?: string;
  gender?: string;
  preference?: string;
  datingPreference?: string;
  ageRange?: string;
}

export interface FilterOptions {
  genders: string[];
  preferences: string[];
  datingPreferences: string[];
  ageRanges: string[];
}

export function useCRM() {
  const { user } = useAuth();
  const { organizer } = useOrganizer();
  const { toast } = useToast();
  const [users, setUsers] = useState<CRMUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    genders: [],
    preferences: [],
    datingPreferences: [],
    ageRanges: [],
  });

  const organizerId = user?.id;

  const loadFilterOptions = useCallback(async () => {
    if (!organizerId) return;
    try {
      // Get all events for this organizer that are social
      const { data: events } = await supabase
        .from('events')
        .select('id')
        .eq('organizer_id', organizerId)
        .eq('module', 'social');

      if (!events || events.length === 0) return;
      const eventIds = events.map(e => e.id);

      // Get distinct values from participants of social events
      const { data: participants } = await supabase
        .from('participants')
        .select('gender, preference, dating_preference, age_range')
        .in('event_id', eventIds)
        .not('global_participant_id', 'is', null);

      if (!participants) return;

      const genders = new Set<string>();
      const preferences = new Set<string>();
      const datingPreferences = new Set<string>();
      const ageRanges = new Set<string>();

      for (const p of participants) {
        if (p.gender) genders.add(p.gender);
        if (p.preference) preferences.add(p.preference);
        if (p.dating_preference) datingPreferences.add(p.dating_preference);
        if (p.age_range) ageRanges.add(p.age_range);
      }

      setFilterOptions({
        genders: [...genders].sort(),
        preferences: [...preferences].sort(),
        datingPreferences: [...datingPreferences].sort(),
        ageRanges: [...ageRanges].sort(),
      });
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  }, [organizerId]);

  const loadUsers = useCallback(async (filters?: CRMFilters) => {
    if (!organizerId) return;
    setLoading(true);
    try {
      let query = supabase
        .from('global_participants')
        .select('*')
        .eq('organizer_id', organizerId)
        .order('display_name');

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters?.search) {
        query = query.or(`display_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      let results = (data || []) as CRMUser[];

      // Apply event filter
      if (filters?.eventId) {
        const { data: eventParticipants } = await supabase
          .from('participants')
          .select('global_participant_id')
          .eq('event_id', filters.eventId)
          .not('global_participant_id', 'is', null);
        const gpIds = new Set(eventParticipants?.map(p => p.global_participant_id) || []);
        results = results.filter(u => gpIds.has(u.id));
      }

      // Apply module type and demographic filters
      const hasAdvancedFilters = filters?.moduleType || filters?.gender || filters?.preference || filters?.datingPreference || filters?.ageRange;
      if (hasAdvancedFilters) {
        // Get events by module type
        let eventQuery = supabase
          .from('events')
          .select('id')
          .eq('organizer_id', organizerId);

        if (filters?.moduleType && filters.moduleType !== 'all') {
          eventQuery = eventQuery.eq('module', filters.moduleType);
        }

        const { data: moduleEvents } = await eventQuery;
        if (!moduleEvents || moduleEvents.length === 0) {
          results = [];
        } else {
          const moduleEventIds = moduleEvents.map(e => e.id);

          // Get participants matching demographic filters in those events
          let participantQuery = supabase
            .from('participants')
            .select('global_participant_id')
            .in('event_id', moduleEventIds)
            .not('global_participant_id', 'is', null);

          if (filters?.gender && filters.gender !== 'all') {
            participantQuery = participantQuery.eq('gender', filters.gender);
          }
          if (filters?.preference && filters.preference !== 'all') {
            participantQuery = participantQuery.eq('preference', filters.preference);
          }
          if (filters?.datingPreference && filters.datingPreference !== 'all') {
            participantQuery = participantQuery.eq('dating_preference', filters.datingPreference);
          }
          if (filters?.ageRange && filters.ageRange !== 'all') {
            participantQuery = participantQuery.eq('age_range', filters.ageRange);
          }

          const { data: filteredParticipants } = await participantQuery;
          const filteredGpIds = new Set(filteredParticipants?.map(p => p.global_participant_id) || []);
          results = results.filter(u => filteredGpIds.has(u.id));
        }
      }

      setUsers(results);
    } catch (error) {
      console.error('Error loading CRM users:', error);
    } finally {
      setLoading(false);
    }
  }, [organizerId]);

  const getUserDetail = useCallback(async (globalParticipantId: string): Promise<CRMUserDetail | null> => {
    if (!organizerId) return null;
    try {
      const { data: gp, error: gpError } = await supabase
        .from('global_participants')
        .select('*')
        .eq('id', globalParticipantId)
        .single();
      if (gpError || !gp) return null;

      const { data: participations } = await supabase
        .from('participants')
        .select('id, event_id, checked_in, selection_submitted_at')
        .eq('global_participant_id', globalParticipantId);

      const eventIds = [...new Set(participations?.map(p => p.event_id) || [])];
      
      const { data: events } = eventIds.length > 0
        ? await supabase.from('events').select('id, name, date, module').in('id', eventIds)
        : { data: [] };

      const eventsMap = new Map((events || []).map(e => [e.id, e]));

      const participantIds = participations?.map(p => p.id) || [];
      let selectionsSent: any[] = [];
      let selectionsReceived: any[] = [];
      
      if (participantIds.length > 0) {
        const { data: sent } = await supabase
          .from('participant_selections')
          .select('selector_id, selected_id, event_id')
          .in('selector_id', participantIds);
        selectionsSent = sent || [];

        const { data: received } = await supabase
          .from('participant_selections')
          .select('selector_id, selected_id, event_id')
          .in('selected_id', participantIds);
        selectionsReceived = received || [];
      }

      const eventHistory: EventParticipation[] = (participations || []).map(p => {
        const event = eventsMap.get(p.event_id);
        const sent = selectionsSent.filter(s => s.selector_id === p.id);
        const received = selectionsReceived.filter(s => s.selected_id === p.id);
        const sentIds = new Set(sent.map(s => s.selected_id));
        const receivedSelectorIds = new Set(received.map(s => s.selector_id));
        const mutuals = [...sentIds].filter(id => receivedSelectorIds.has(id)).length;

        return {
          event_id: p.event_id,
          event_name: event?.name || 'Evento desconocido',
          event_date: event?.date || '',
          event_module: event?.module || null,
          checked_in: p.checked_in,
          selection_submitted_at: p.selection_submitted_at,
          selections_sent: sent.length,
          selections_received: received.length,
          mutual_matches: mutuals,
          participant_id: p.id,
        };
      }).sort((a, b) => b.event_date.localeCompare(a.event_date));

      return { ...(gp as CRMUser), eventHistory };
    } catch (error) {
      console.error('Error loading user detail:', error);
      return null;
    }
  }, [organizerId]);

  const updateUser = useCallback(async (id: string, updates: Partial<Pick<CRMUser, 'display_name' | 'email' | 'phone' | 'status' | 'source_notes'>>) => {
    const { error } = await supabase
      .from('global_participants')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      toast({ title: 'Error', description: 'No se pudo actualizar el usuario', variant: 'destructive' });
      return false;
    }
    toast({ title: 'Usuario actualizado' });
    return true;
  }, [toast]);

  const deleteUser = useCallback(async (id: string) => {
    await supabase
      .from('participants')
      .update({ global_participant_id: null })
      .eq('global_participant_id', id);
    
    const { error } = await supabase
      .from('global_participants')
      .delete()
      .eq('id', id);
    if (error) {
      toast({ title: 'Error', description: 'No se pudo eliminar el usuario', variant: 'destructive' });
      return false;
    }
    setUsers(prev => prev.filter(u => u.id !== id));
    toast({ title: 'Usuario eliminado' });
    return true;
  }, [toast]);

  const findDuplicates = useCallback(async () => {
    if (!organizerId) return;
    const { data } = await supabase
      .from('global_participants')
      .select('*')
      .eq('organizer_id', organizerId);
    if (!data) return;

    const groups: DuplicateGroup[] = [];
    const emailMap = new Map<string, CRMUser[]>();
    const phoneMap = new Map<string, CRMUser[]>();

    for (const p of data as CRMUser[]) {
      if (p.email) {
        const key = p.email.toLowerCase().trim();
        if (!emailMap.has(key)) emailMap.set(key, []);
        emailMap.get(key)!.push(p);
      }
      if (p.phone) {
        const key = p.phone.trim();
        if (!phoneMap.has(key)) phoneMap.set(key, []);
        phoneMap.get(key)!.push(p);
      }
    }

    emailMap.forEach((participants, email) => {
      if (participants.length > 1) {
        groups.push({ key: `email:${email}`, type: 'email', value: email, participants });
      }
    });
    phoneMap.forEach((participants, phone) => {
      if (participants.length > 1) {
        const ids = new Set(participants.map(p => p.id));
        const alreadyCovered = groups.some(g => 
          g.participants.every(p => ids.has(p.id)) && g.participants.length === participants.length
        );
        if (!alreadyCovered) {
          groups.push({ key: `phone:${phone}`, type: 'phone', value: phone, participants });
        }
      }
    });

    setDuplicates(groups);
  }, [organizerId]);

  const mergeUsers = useCallback(async (primaryId: string, duplicateId: string) => {
    const { error: updateError } = await supabase
      .from('participants')
      .update({ global_participant_id: primaryId })
      .eq('global_participant_id', duplicateId);

    if (updateError) {
      toast({ title: 'Error', description: 'No se pudieron fusionar los usuarios', variant: 'destructive' });
      return false;
    }

    await supabase
      .from('participant_encounters')
      .update({ global_participant_1_id: primaryId })
      .eq('global_participant_1_id', duplicateId);
    await supabase
      .from('participant_encounters')
      .update({ global_participant_2_id: primaryId })
      .eq('global_participant_2_id', duplicateId);

    const { data: eventRows } = await supabase
      .from('participants')
      .select('event_id')
      .eq('global_participant_id', primaryId);
    const distinctEvents = new Set(eventRows?.map(r => r.event_id) || []).size;
    await supabase
      .from('global_participants')
      .update({ events_attended: distinctEvents })
      .eq('id', primaryId);

    await supabase.from('global_participants').delete().eq('id', duplicateId);

    setUsers(prev => prev.filter(u => u.id !== duplicateId));
    toast({ title: 'Usuarios fusionados correctamente' });
    return true;
  }, [toast]);

  const getOrganizerEvents = useCallback(async () => {
    if (!user?.id) return [];
    const { data } = await supabase
      .from('events')
      .select('id, name, date, status, module')
      .eq('organizer_id', user.id)
      .order('date', { ascending: false });
    return data || [];
  }, [user?.id]);

  return {
    users,
    loading,
    duplicates,
    filterOptions,
    loadUsers,
    loadFilterOptions,
    getUserDetail,
    updateUser,
    deleteUser,
    findDuplicates,
    mergeUsers,
    getOrganizerEvents,
  };
}
