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
    const { eventId, type } = await req.json();
    
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

    // First verify the event exists and get tables
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, status, tables')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      console.error('[get-event-participants] Event not found:', eventError);
      return new Response(
        JSON.stringify({ error: 'Event not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return different data based on type
    if (type === 'checkin') {
      // For check-in: return only names and IDs of participants NOT yet checked in
      const { data: participants, error } = await supabase
        .from('participants')
        .select('id, name, checked_in')
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
      // For selection: return names and IDs only, plus who has already submitted
      // Also include tables data so the frontend can filter by tablemates
      const { data: participants, error: participantsError } = await supabase
        .from('participants')
        .select('id, name, preference')
        .eq('event_id', eventId);

      if (participantsError) {
        console.error('[get-event-participants] Error fetching participants:', participantsError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch participants' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get list of participants who have already submitted selections
      const { data: selections, error: selectionsError } = await supabase
        .from('participant_selections')
        .select('selector_id')
        .eq('event_id', eventId);

      if (selectionsError) {
        console.error('[get-event-participants] Error fetching selections:', selectionsError);
      }

      const submittedIds = [...new Set(selections?.map(s => s.selector_id) || [])];

      console.log(`[get-event-participants] Returning ${participants?.length || 0} participants for selection`);
      return new Response(
        JSON.stringify({ 
          participants: participants || [],
          submittedIds,
          tables: event.tables || []
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
