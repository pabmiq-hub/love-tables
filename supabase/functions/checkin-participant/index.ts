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

    if (event.status !== 'pending' && event.status !== 'active') {
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
      
      let code = participant.verification_code;
      
      // If checked in but no code (e.g. bulk check-in), generate one now
      if (!code) {
        code = await generateUniqueCode(supabase);
        console.log(`[checkin-participant] Generated missing code for already checked-in participant: ${participant.id}`);
        
        const { error: updateError } = await supabase
          .from('participants')
          .update({ verification_code: code })
          .eq('id', participant.id);
        
        if (updateError) {
          console.error('[checkin-participant] Error updating verification code:', updateError);
          return new Response(
            JSON.stringify({ error: 'Error al generar el código de verificación' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Send email if requested
        let emailSent = false;
        if (sendEmail && participant.email && baseUrl) {
          try {
            const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-checkin-code`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({ participantId: participant.id, eventId, baseUrl })
            });
            emailSent = emailResponse.ok;
          } catch (e) {
            console.error('[checkin-participant] Error sending email:', e);
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            alreadyCheckedIn: true,
            participant: {
              id: participant.id,
              name: participant.name,
              email: participant.email,
              verificationCode: code,
            },
            emailSent,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Already checked in AND already has a code
      return new Response(
        JSON.stringify({
          success: true,
          alreadyCheckedIn: true,
          participant: {
            id: participant.id,
            name: participant.name,
            email: participant.email,
            verificationCode: code,
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    // Auto-assign to a preliminary round table if enabled (Social events only)
    try {
      const { data: eventConfig } = await supabase
        .from('events')
        .select('preliminary_round, table_size, module, game_mode')
        .eq('id', eventId)
        .maybeSingle();

      const prelim = (eventConfig as any)?.preliminary_round;
      const isSocial = !(eventConfig as any)?.module || (eventConfig as any).module === 'social';

      if (isSocial && prelim?.enabled) {
        const tableSize = (eventConfig as any)?.table_size || 4;
        const tables: any[][] = Array.isArray(prelim.tables) ? prelim.tables.map((t: any[]) => [...t]) : [];
        const dismissed: number[] = Array.isArray(prelim.dismissed_tables) ? prelim.dismissed_tables : [];

        // ----- Modo Lúdico (Game Mode) -----
        const rawGM = (eventConfig as any)?.game_mode;
        const gmEnabled = !!(rawGM && rawGM.enabled);
        const dynamics: Array<{ id: string; table_numbers: number[] }> =
          gmEnabled && Array.isArray(rawGM.dynamics) ? rawGM.dynamics : [];
        const played: Record<string, string[]> =
          gmEnabled && rawGM.played && typeof rawGM.played === 'object' ? { ...rawGM.played } : {};
        const dynForTable = (n: number): string | null => {
          if (!gmEnabled) return null;
          for (const d of dynamics) {
            if (Array.isArray(d.table_numbers) && d.table_numbers.includes(n)) return d.id;
          }
          return null;
        };
        const hasPlayed = (pid: string, dynId: string) =>
          Array.isArray(played[pid]) && played[pid].includes(dynId);

        // Avoid duplicates: check if participant already in any preliminary table
        const alreadyAssigned = tables.some(t => t.some((p: any) => p.id === participant.id));

        if (!alreadyAssigned) {
          // Find last non-dismissed table with free seat AND no dynamic conflict
          let placed = false;
          for (let i = tables.length - 1; i >= 0; i--) {
            if (dismissed.includes(i)) continue;
            if (tables[i].length >= tableSize) continue;
            const dynId = dynForTable(i + 1);
            if (dynId && hasPlayed(participant.id, dynId)) continue;
            tables[i].push({ id: participant.id, name: participant.name });
            if (dynId) {
              played[participant.id] = [...(played[participant.id] || []), dynId];
            }
            placed = true;
            break;
          }

          // Otherwise create a new table (new tables don't have a dynamic by default)
          if (!placed) {
            tables.push([{ id: participant.id, name: participant.name }]);
            const newTableNumber = tables.length;
            const dynId = dynForTable(newTableNumber);
            if (dynId) {
              played[participant.id] = [...(played[participant.id] || []), dynId];
            }
          }

          const updatedPrelim = {
            ...prelim,
            tables,
            started_at: prelim.started_at || new Date().toISOString(),
          };

          const updates: any = { preliminary_round: updatedPrelim };
          if (gmEnabled) {
            updates.game_mode = { ...rawGM, played };
          }

          const { error: prelimError } = await supabase
            .from('events')
            .update(updates as any)
            .eq('id', eventId);

          if (prelimError) {
            console.warn('[checkin-participant] Could not auto-assign preliminary table:', prelimError);
          } else {
            console.log(`[checkin-participant] Auto-assigned ${participant.id} to preliminary table`);
          }
        }
      }
    } catch (prelimErr) {
      console.error('[checkin-participant] Preliminary auto-assign error:', prelimErr);
      // Non-blocking: check-in still succeeds
    }

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
