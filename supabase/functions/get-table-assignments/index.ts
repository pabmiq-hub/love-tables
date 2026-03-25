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

/** Returns "FirstName L." from a full name */
function anonymizeName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return fullName;
  const firstName = parts[0];
  const lastInitial = parts[parts.length - 1][0];
  return `${firstName} ${lastInitial.toUpperCase()}.`;
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

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(eventId)) {
      return new Response(
        JSON.stringify({ error: 'Formato de evento inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
      .select('id, status, tables, current_round, rounds, selection_deadline_hours, selection_closed_at, round_duration, round_started_at, round_paused_at, round_elapsed_seconds, completed_rounds, preliminary_round')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      console.error('[get-table-assignments] Event not found:', eventError);
      return new Response(
        JSON.stringify({ error: 'Evento no encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (event.status !== 'active' && event.status !== 'completed') {
      return new Response(
        JSON.stringify({ 
          error: 'Las asignaciones de mesa solo están disponibles cuando el evento ha comenzado',
          eventStatus: event.status
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find participant by verification code
    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .select('id, name, checked_in, preference, dating_preference, gender')
      .eq('event_id', eventId)
      .eq('verification_code', verificationCode)
      .maybeSingle();

    if (participantError || !participant) {
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

    const currentRound = event.current_round || 0;
    const completedRounds: number[] = event.completed_rounds || [];

    // Extract table assignments for this participant
    const tables = event.tables as any;
    if (!tables || !Array.isArray(tables) || tables.length === 0) {
      return new Response(
        JSON.stringify({ 
          participantName: anonymizeName(participant.name),
          participantPreference: participant.preference,
          participantDatingPreference: participant.dating_preference,
          participantGender: participant.gender,
          assignments: [],
          existingSelections: [],
          message: 'Las mesas aún no han sido asignadas',
          currentRound,
          totalRounds: event.rounds,
          timer: {
            roundDuration: Math.floor((event.round_duration || 300) / 60),
            roundStartedAt: event.round_started_at,
            roundPausedAt: event.round_paused_at,
            roundElapsedSeconds: event.round_elapsed_seconds || 0,
            completedRounds,
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Collect all tablemate IDs to fetch their preferences in bulk
    // Only include rounds up to current_round (or completed rounds)
    const tablemateIds = new Set<string>();
    const assignments: { round: number; table: number; tablemateEntries: { id: string; name: string }[] }[] = [];
    
    for (const roundData of tables) {
      const roundNumber = roundData.round;
      
      // Only include rounds that are completed or currently active
      if (roundNumber > currentRound) continue;
      
      const roundTables = roundData.tables;
      if (!roundTables || !Array.isArray(roundTables)) continue;
      
      for (let tableIndex = 0; tableIndex < roundTables.length; tableIndex++) {
        const table = roundTables[tableIndex];
        if (!Array.isArray(table)) continue;
        
        const isInTable = table.some((p: any) => p.id === participant.id);
        
        if (isInTable) {
          const mates = table
            .filter((p: any) => p.id !== participant.id)
            .map((p: any) => ({ id: p.id, name: p.name }));
          mates.forEach((m: any) => tablemateIds.add(m.id));
          assignments.push({
            round: roundNumber,
            table: tableIndex + 1,
            tablemateEntries: mates
          });
          break;
        }
      }
    }

    // Also process preliminary round if exists
    const preliminaryRound = (event as any).preliminary_round;
    if (preliminaryRound?.enabled && Array.isArray(preliminaryRound.tables)) {
      for (let tableIndex = 0; tableIndex < preliminaryRound.tables.length; tableIndex++) {
        const table = preliminaryRound.tables[tableIndex];
        if (!Array.isArray(table)) continue;
        const isInTable = table.some((p: any) => p.id === participant.id);
        if (isInTable) {
          const mates = table
            .filter((p: any) => p.id !== participant.id)
            .map((p: any) => ({ id: p.id, name: p.name }));
          mates.forEach((m: any) => tablemateIds.add(m.id));
          assignments.push({
            round: 0,
            table: tableIndex + 1,
            tablemateEntries: mates
          });
          break;
        }
      }
    }

    // Fetch preferences for all tablemates + existing selections in parallel
    const [preferencesResult, selectionsResult] = await Promise.all([
      tablemateIds.size > 0
        ? supabase.from('participants').select('id, preference, dating_preference, gender').in('id', Array.from(tablemateIds))
        : Promise.resolve({ data: [], error: null }),
      supabase.from('participant_selections').select('selected_id, selection_type').eq('event_id', eventId).eq('selector_id', participant.id)
    ]);

    const preferencesMap = new Map<string, { preference: string | null; dating_preference: string | null; gender: string | null }>();
    if (preferencesResult.data) {
      for (const p of preferencesResult.data) {
        preferencesMap.set(p.id, { preference: p.preference, dating_preference: p.dating_preference, gender: p.gender });
      }
    }

    // Build final assignments with anonymized names and preferences
    const finalAssignments = assignments.map(a => ({
      round: a.round,
      table: a.table,
      tablemates: a.tablemateEntries.map(tm => ({
        id: tm.id,
        name: anonymizeName(tm.name),
        preference: preferencesMap.get(tm.id)?.preference || null,
        dating_preference: preferencesMap.get(tm.id)?.dating_preference || null,
        gender: preferencesMap.get(tm.id)?.gender || null,
      }))
    }));

    const existingSelections = (selectionsResult.data || []).map((s: any) => ({
      selected_id: s.selected_id,
      selection_type: s.selection_type,
    }));

    console.log(`[get-table-assignments] Found ${finalAssignments.length} assignments for participant ${participant.id} (filtered to round ${currentRound})`);

    return new Response(
      JSON.stringify({ 
        participantName: anonymizeName(participant.name),
        participantPreference: participant.preference,
        participantDatingPreference: participant.dating_preference,
        participantGender: participant.gender,
        assignments: finalAssignments,
        existingSelections,
        currentRound,
        totalRounds: event.rounds,
        timer: {
          roundDuration: Math.floor((event.round_duration || 300) / 60),
          roundStartedAt: event.round_started_at,
          roundPausedAt: event.round_paused_at,
          roundElapsedSeconds: event.round_elapsed_seconds || 0,
          completedRounds,
        }
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
