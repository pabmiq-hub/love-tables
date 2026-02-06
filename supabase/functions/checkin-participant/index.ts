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

// Generate unique 6-digit verification code
async function generateUniqueCode(supabase: any): Promise<string> {
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    // Generate 6-digit code (100000 - 999999)
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Check if code already exists
    const { data: existing } = await supabase
      .from('participants')
      .select('id')
      .eq('verification_code', code)
      .maybeSingle();
    
    if (!existing) {
      return code;
    }
    
    attempts++;
  }
  
  throw new Error('Could not generate unique verification code');
}

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

    const { eventId, participantId, verificationCode, sendEmail = true, baseUrl } = await req.json();
    
    console.log(`[checkin-participant] Check-in request for event: ${eventId}, participantId: ${participantId || 'N/A'}, code: ${verificationCode ? 'provided' : 'not provided'}`);

    if (!eventId) {
      console.error('[checkin-participant] Missing eventId');
      return new Response(
        JSON.stringify({ error: 'eventId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate UUID format for eventId
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(eventId)) {
      console.error('[checkin-participant] Invalid eventId UUID format');
      return new Response(
        JSON.stringify({ error: 'Invalid request format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Must provide either participantId or verificationCode
    if (!participantId && !verificationCode) {
      console.error('[checkin-participant] Missing participantId or verificationCode');
      return new Response(
        JSON.stringify({ error: 'participantId or verificationCode is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate participantId UUID format if provided
    if (participantId && !uuidRegex.test(participantId)) {
      console.error('[checkin-participant] Invalid participantId UUID format');
      return new Response(
        JSON.stringify({ error: 'Invalid request format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate verification code format (6 digits) if provided
    if (verificationCode) {
      const codeRegex = /^\d{6}$/;
      if (!codeRegex.test(verificationCode)) {
        console.error('[checkin-participant] Invalid verification code format');
        return new Response(
          JSON.stringify({ error: 'Invalid verification code format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Create Supabase client with service role to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the event exists and is in pending status (registrations still open)
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, status, name')
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

    // Find participant - either by ID or by verification code
    let participantQuery = supabase
      .from('participants')
      .select('id, event_id, checked_in, name, email, gender, age_range, verification_code')
      .eq('event_id', eventId);

    if (verificationCode) {
      participantQuery = participantQuery.eq('verification_code', verificationCode);
    } else {
      participantQuery = participantQuery.eq('id', participantId);
    }

    const { data: participant, error: participantError } = await participantQuery.maybeSingle();

    if (participantError || !participant) {
      console.error('[checkin-participant] Participant not found:', participantError);
      // Generic error to not reveal if code/ID exists
      return new Response(
        JSON.stringify({ error: 'Participante no encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (participant.checked_in) {
      console.log('[checkin-participant] Participant already checked in');
      return new Response(
        JSON.stringify({ 
          error: 'Ya has realizado el check-in',
          participant: {
            id: participant.id,
            name: participant.name,
            verificationCode: participant.verification_code,
            alreadyCheckedIn: true
          }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate verification code if participant doesn't have one yet
    // This is the key change - code is generated at CHECK-IN time
    let newVerificationCode = participant.verification_code;
    if (!newVerificationCode) {
      newVerificationCode = await generateUniqueCode(supabase);
      console.log(`[checkin-participant] Generated new verification code for participant: ${participant.id}`);
    }

    // Update the participant's check-in status and verification code
    const { error: updateError } = await supabase
      .from('participants')
      .update({ 
        checked_in: true,
        verification_code: newVerificationCode
      })
      .eq('id', participant.id);

    if (updateError) {
      console.error('[checkin-participant] Error updating participant:', updateError);
      return new Response(
        JSON.stringify({ error: 'Error al realizar el check-in' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[checkin-participant] Check-in successful for participant:', participant.id);

    // Send check-in code email if participant has email and sendEmail is true
    let emailSent = false;
    if (sendEmail && participant.email && baseUrl) {
      try {
        const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-checkin-code`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            participantId: participant.id,
            eventId,
            baseUrl
          })
        });

        if (emailResponse.ok) {
          emailSent = true;
          console.log('[checkin-participant] Check-in code email sent successfully');
        } else {
          console.warn('[checkin-participant] Failed to send check-in code email');
        }
      } catch (emailError) {
        console.error('[checkin-participant] Error sending check-in code email:', emailError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        participant: {
          id: participant.id,
          name: participant.name,
          email: participant.email,
          gender: participant.gender,
          ageRange: participant.age_range,
          verificationCode: newVerificationCode
        },
        emailSent,
        message: emailSent 
          ? 'Check-in completado. Se ha enviado un email con el código de acceso.'
          : 'Check-in completado.'
      }),
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
