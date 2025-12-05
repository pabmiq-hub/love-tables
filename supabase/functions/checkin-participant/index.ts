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
    const { eventId, participantId } = await req.json();
    
    console.log(`[checkin-participant] Check-in request for participant: ${participantId} in event: ${eventId}`);

    if (!eventId || !participantId) {
      console.error('[checkin-participant] Missing eventId or participantId');
      return new Response(
        JSON.stringify({ error: 'eventId and participantId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the participant belongs to the event and isn't already checked in
    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .select('id, event_id, checked_in')
      .eq('id', participantId)
      .eq('event_id', eventId)
      .single();

    if (participantError || !participant) {
      console.error('[checkin-participant] Participant not found:', participantError);
      return new Response(
        JSON.stringify({ error: 'Participant not found in this event' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (participant.checked_in) {
      console.log('[checkin-participant] Participant already checked in');
      return new Response(
        JSON.stringify({ error: 'Participant already checked in' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update the participant's check-in status
    const { error: updateError } = await supabase
      .from('participants')
      .update({ checked_in: true })
      .eq('id', participantId);

    if (updateError) {
      console.error('[checkin-participant] Error updating participant:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to check in participant' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[checkin-participant] Check-in successful');
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[checkin-participant] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
