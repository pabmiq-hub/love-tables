import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { eventId, type, verificationCode } = await req.json();
    
    console.log(`[get-event-participants] Request for event: ${eventId}, type: ${type}`);

    if (!eventId) {
      console.error('[get-event-participants] Missing eventId');
      return new Response(
        JSON.stringify({ error: 'eventId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate UUID format to prevent injection
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(eventId)) {
      console.error('[get-event-participants] Invalid UUID format for eventId');
      return new Response(
        JSON.stringify({ error: 'Invalid request format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // First verify the event exists and get tables + current_round
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, status, tables, current_round, super_like_enabled, repeat_request_enabled, crush_enabled')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      console.error('[get-event-participants] Event not found:', eventError);
      return new Response(
        JSON.stringify({ error: 'Event not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Type: verify - verify a participant by their code and return their info
    if (type === 'verify') {
      if (!verificationCode) {
        return new Response(
          JSON.stringify({ error: 'verificationCode is required for verify type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate verification code format (6 digits)
      const codeRegex = /^\d{6}$/;
      if (!codeRegex.test(verificationCode)) {
        return new Response(
          JSON.stringify({ error: 'Invalid verification code format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: participant, error: participantError } = await supabase
        .from('participants')
        .select('id, name, email, gender, age_range, checked_in, preference, dating_preference')
        .eq('event_id', eventId)
        .eq('verification_code', verificationCode)
        .maybeSingle();

      if (participantError || !participant) {
        return new Response(
          JSON.stringify({ error: 'Participant not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          participant: {
            id: participant.id,
            name: participant.name,
            email: participant.email,
            gender: participant.gender,
            ageRange: participant.age_range,
            alreadyCheckedIn: participant.checked_in,
            preference: participant.preference,
            dating_preference: participant.dating_preference
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return different data based on type
    if (type === 'checkin') {
      // For check-in: return only names, phone and IDs of participants NOT yet checked in
      const { data: participants, error } = await supabase
        .from('participants')
        .select('id, name, phone, checked_in')
        .eq('event_id', eventId)
        .eq('checked_in', false)
        .order('name');

      if (error) {
        console.error('[get-event-participants] Error fetching participants:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch participants' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[get-event-participants] Returning ${participants?.length || 0} participants for check-in`);
      return new Response(
        JSON.stringify({ participants: participants || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (type === 'select') {
      // For selection: return names, phone and IDs only, plus who has already submitted
      // Filter tables based on current_round and event status
      const { data: participants, error: participantsError } = await supabase
        .from('participants')
        .select('id, name, phone, preference, dating_preference, gender')
        .eq('event_id', eventId)
        .order('name');

      if (participantsError) {
        console.error('[get-event-participants] Error fetching participants:', participantsError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch participants' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get existing selections for the current user (for incremental selection display)
      const { data: existingSelections, error: existingSelectionsError } = await supabase
        .from('participant_selections')
        .select('selector_id, selected_id, selection_type')
        .eq('event_id', eventId);

      if (existingSelectionsError) {
        console.error('[get-event-participants] Error fetching existing selections:', existingSelectionsError);
      }

      // Filter tables based on event status and current_round
      let filteredTables: any[] = [];
      const allTables = event.tables || [];
      const currentRound = event.current_round || 0;

      if (event.status === 'completed') {
        // Event completed: show all tables from all rounds
        filteredTables = allTables;
        console.log(`[get-event-participants] Event completed - returning all ${allTables.length} rounds`);
      } else if (event.status === 'active' && currentRound > 0) {
        // Event active: only show tables from rounds 1 to current_round
        filteredTables = allTables.filter((t: { round: number }) => t.round <= currentRound);
        console.log(`[get-event-participants] Event active, round ${currentRound} - returning ${filteredTables.length} rounds`);
      } else {
        // Event pending or current_round = 0: no tables yet
        filteredTables = [];
        console.log(`[get-event-participants] Event pending or not started - returning 0 tables`);
      }

      console.log(`[get-event-participants] Returning ${participants?.length || 0} participants for selection`);
      return new Response(
        JSON.stringify({ 
          participants: participants || [],
          existingSelections: existingSelections || [],
          tables: filteredTables,
          eventStatus: event.status,
          currentRound: currentRound,
          featureFlags: {
            superLikeEnabled: !!event.super_like_enabled,
            repeatRequestEnabled: !!event.repeat_request_enabled,
            crushEnabled: !!event.crush_enabled,
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid type. Use "checkin" or "select"' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[get-event-participants] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
