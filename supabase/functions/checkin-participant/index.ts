import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple in-memory rate limiter (per IP, max 5 check-ins per minute)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  
  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }
  
  entry.count++;
  return false;
}

// Clean up old entries periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}, 300000);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get client IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || req.headers.get('x-real-ip') 
      || 'unknown';
    
    console.log(`[checkin-participant] Request from IP: ${clientIP}`);
    
    // Check rate limit
    if (isRateLimited(clientIP)) {
      console.warn(`[checkin-participant] Rate limit exceeded for IP: ${clientIP}`);
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please wait a minute before trying again.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { eventId, participantId } = await req.json();
    
    console.log(`[checkin-participant] Check-in request for participant: ${participantId} in event: ${eventId}`);

    if (!eventId || !participantId) {
      console.error('[checkin-participant] Missing eventId or participantId');
      return new Response(
        JSON.stringify({ error: 'eventId and participantId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate UUID format to prevent injection
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(eventId) || !uuidRegex.test(participantId)) {
      console.error('[checkin-participant] Invalid UUID format');
      return new Response(
        JSON.stringify({ error: 'Invalid request format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the event exists and is in pending status (registrations still open)
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, status')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      console.error('[checkin-participant] Event not found:', eventError);
      return new Response(
        JSON.stringify({ error: 'Event not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (event.status !== 'pending') {
      console.log('[checkin-participant] Event registrations are closed');
      return new Response(
        JSON.stringify({ error: 'Event registrations are closed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
