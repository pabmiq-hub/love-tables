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

export function useCRM() {
  const { user } = useAuth();
  const { organizer } = useOrganizer();
  const { toast } = useToast();
  const [users, setUsers] = useState<CRMUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);

  const organizerId = user?.id;

  const loadUsers = useCallback(async (filters?: {
    status?: string;
    eventId?: string;
    search?: string;
  }) => {
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

      // Filter by event if specified
      if (filters?.eventId) {
        const { data: eventParticipants } = await supabase
          .from('participants')
          .select('global_participant_id')
          .eq('event_id', filters.eventId)
          .not('global_participant_id', 'is', null);
        const gpIds = new Set(eventParticipants?.map(p => p.global_participant_id) || []);
        results = results.filter(u => gpIds.has(u.id));
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
      // Get global participant
      const { data: gp, error: gpError } = await supabase
        .from('global_participants')
        .select('*')
        .eq('id', globalParticipantId)
        .single();
      if (gpError || !gp) return null;

      // Get all event participations
      const { data: participations } = await supabase
        .from('participants')
        .select('id, event_id, checked_in, selection_submitted_at')
        .eq('global_participant_id', globalParticipantId);

      const eventIds = [...new Set(participations?.map(p => p.event_id) || [])];
      
      // Get event details
      const { data: events } = eventIds.length > 0
        ? await supabase.from('events').select('id, name, date, module').in('id', eventIds)
        : { data: [] };

      const eventsMap = new Map((events || []).map(e => [e.id, e]));

      // Get selections for all participations
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

      // Build event history
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
    // First unlink all participants
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
        // Avoid duplicating groups already found by email
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
    // Move all participant references to primary
    const { error: updateError } = await supabase
      .from('participants')
      .update({ global_participant_id: primaryId })
      .eq('global_participant_id', duplicateId);

    if (updateError) {
      toast({ title: 'Error', description: 'No se pudieron fusionar los usuarios', variant: 'destructive' });
      return false;
    }

    // Update encounters
    await supabase
      .from('participant_encounters')
      .update({ global_participant_1_id: primaryId })
      .eq('global_participant_1_id', duplicateId);
    await supabase
      .from('participant_encounters')
      .update({ global_participant_2_id: primaryId })
      .eq('global_participant_2_id', duplicateId);

    // Recalculate events_attended for primary
    const { data: eventRows } = await supabase
      .from('participants')
      .select('event_id')
      .eq('global_participant_id', primaryId);
    const distinctEvents = new Set(eventRows?.map(r => r.event_id) || []).size;
    await supabase
      .from('global_participants')
      .update({ events_attended: distinctEvents })
      .eq('id', primaryId);

    // Delete duplicate
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
    loadUsers,
    getUserDetail,
    updateUser,
    deleteUser,
    findDuplicates,
    mergeUsers,
    getOrganizerEvents,
  };
}
