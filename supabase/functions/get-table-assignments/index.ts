import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiter
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60000;
const MAX_REQUESTS_PER_WINDOW = 20;

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

interface TableAssignmentRequest {
  eventId: string;
  verificationCode: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || req.headers.get('x-real-ip') 
      || 'unknown';
    
    if (isRateLimited(clientIP)) {
      return new Response(
        JSON.stringify({ error: 'Demasiadas solicitudes. Espera un minuto.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { eventId, verificationCode }: TableAssignmentRequest = await req.json();
    
    console.log(`[get-table-assignments] Request for event: ${eventId}`);

    if (!eventId || !verificationCode) {
      return new Response(
        JSON.stringify({ error: 'Faltan campos obligatorios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(eventId)) {
      return new Response(
        JSON.stringify({ error: 'Formato de evento inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate verification code format (6 digits)
    const codeRegex = /^\d{6}$/;
    if (!codeRegex.test(verificationCode)) {
      return new Response(
        JSON.stringify({ error: 'Código de verificación inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify event exists and is active or completed
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, status, tables, current_round, rounds')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      console.error('[get-table-assignments] Event not found:', eventError);
      return new Response(
        JSON.stringify({ error: 'Evento no encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only allow viewing tables when event is active or completed
    if (event.status !== 'active' && event.status !== 'completed') {
      return new Response(
        JSON.stringify({ 
          error: 'Las asignaciones de mesa solo están disponibles cuando el evento ha comenzado',
          eventStatus: event.status
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find participant by verification code - don't reveal if code exists or not
    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .select('id, name, checked_in')
      .eq('event_id', eventId)
      .eq('verification_code', verificationCode)
      .maybeSingle();

    if (participantError || !participant) {
      // Generic error to not reveal if code exists
      return new Response(
        JSON.stringify({ error: 'Código de verificación incorrecto' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!participant.checked_in) {
      return new Response(
        JSON.stringify({ error: 'Debes hacer check-in primero para ver tus mesas' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract table assignments for this participant
    const tables = event.tables as any;
    if (!tables || !tables.rounds) {
      return new Response(
        JSON.stringify({ 
          participantName: participant.name,
          assignments: [],
          message: 'Las mesas aún no han sido asignadas'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const assignments: { round: number; table: number }[] = [];
    
    // Find participant's table for each round
    for (let roundIndex = 0; roundIndex < tables.rounds.length; roundIndex++) {
      const round = tables.rounds[roundIndex];
      if (!round.tables) continue;
      
      for (let tableIndex = 0; tableIndex < round.tables.length; tableIndex++) {
        const table = round.tables[tableIndex];
        if (!table.participants) continue;
        
        const isInTable = table.participants.some(
          (p: any) => p.id === participant.id
        );
        
        if (isInTable) {
          assignments.push({
            round: roundIndex + 1,
            table: tableIndex + 1
          });
          break;
        }
      }
    }

    console.log(`[get-table-assignments] Found ${assignments.length} assignments for participant ${participant.id}`);

    return new Response(
      JSON.stringify({ 
        participantName: participant.name,
        assignments,
        currentRound: event.current_round,
        totalRounds: event.rounds
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[get-table-assignments] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
