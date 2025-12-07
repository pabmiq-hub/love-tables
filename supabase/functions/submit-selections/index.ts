import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple rate limiting - 3 submissions per IP per 10 minutes
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 10 * 60 * 1000; // 10 minutes
const MAX_SUBMISSIONS = 3;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return false;
  }
  
  if (record.count >= MAX_SUBMISSIONS) {
    return true;
  }
  
  record.count++;
  return false;
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}, 60000);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get client IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('x-real-ip') || 
                     'unknown';

    // Check rate limit
    if (isRateLimited(clientIP)) {
      console.log(`[submit-selections] Rate limit exceeded for IP: ${clientIP}`);
      return new Response(
        JSON.stringify({ error: 'Has enviado demasiadas selecciones. Por favor, espera unos minutos.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { eventId, selectorId, selections } = await req.json();
    
    console.log(`[submit-selections] Request for event: ${eventId}, selector: ${selectorId}`);

    // Validate required fields
    if (!eventId || !selectorId) {
      console.error('[submit-selections] Missing eventId or selectorId');
      return new Response(
        JSON.stringify({ error: 'Datos incompletos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate UUID formats to prevent injection
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(eventId)) {
      console.error('[submit-selections] Invalid UUID format for eventId');
      return new Response(
        JSON.stringify({ error: 'Formato de solicitud inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!uuidRegex.test(selectorId)) {
      console.error('[submit-selections] Invalid UUID format for selectorId');
      return new Response(
        JSON.stringify({ error: 'Formato de solicitud inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate selections array
    if (!Array.isArray(selections)) {
      console.error('[submit-selections] Selections is not an array');
      return new Response(
        JSON.stringify({ error: 'Formato de selecciones inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate each selection
    for (const selection of selections) {
      if (!selection.selected_id || !uuidRegex.test(selection.selected_id)) {
        console.error('[submit-selections] Invalid selected_id in selections');
        return new Response(
          JSON.stringify({ error: 'Formato de selección inválido' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (!['friendship', 'dating', 'both'].includes(selection.selection_type)) {
        console.error('[submit-selections] Invalid selection_type');
        return new Response(
          JSON.stringify({ error: 'Tipo de selección inválido' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Create Supabase client with service role to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the event exists
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, status')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      console.error('[submit-selections] Event not found:', eventError);
      return new Response(
        JSON.stringify({ error: 'Evento no encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the selector is a participant of this event
    const { data: selectorParticipant, error: selectorError } = await supabase
      .from('participants')
      .select('id, name, event_id')
      .eq('id', selectorId)
      .eq('event_id', eventId)
      .single();

    if (selectorError || !selectorParticipant) {
      console.error('[submit-selections] Selector is not a valid participant:', selectorError);
      return new Response(
        JSON.stringify({ error: 'Participante no encontrado en este evento' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if selector has already submitted selections
    const { data: existingSelections, error: existingError } = await supabase
      .from('participant_selections')
      .select('id')
      .eq('event_id', eventId)
      .eq('selector_id', selectorId)
      .limit(1);

    if (existingError) {
      console.error('[submit-selections] Error checking existing selections:', existingError);
      return new Response(
        JSON.stringify({ error: 'Error al verificar selecciones existentes' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingSelections && existingSelections.length > 0) {
      console.log('[submit-selections] Selector has already submitted selections');
      return new Response(
        JSON.stringify({ error: 'Ya has enviado tus selecciones anteriormente' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify all selected participants belong to this event
    if (selections.length > 0) {
      const selectedIds = selections.map((s: { selected_id: string }) => s.selected_id);
      
      const { data: validParticipants, error: validError } = await supabase
        .from('participants')
        .select('id')
        .eq('event_id', eventId)
        .in('id', selectedIds);

      if (validError) {
        console.error('[submit-selections] Error validating selected participants:', validError);
        return new Response(
          JSON.stringify({ error: 'Error al validar participantes seleccionados' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!validParticipants || validParticipants.length !== selectedIds.length) {
        console.error('[submit-selections] Some selected participants are not valid');
        return new Response(
          JSON.stringify({ error: 'Algunos participantes seleccionados no son válidos' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify selector is not selecting themselves
      if (selectedIds.includes(selectorId)) {
        console.error('[submit-selections] Selector cannot select themselves');
        return new Response(
          JSON.stringify({ error: 'No puedes seleccionarte a ti mismo' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Insert selections
      const selectionsToInsert = selections.map((s: { selected_id: string; selection_type: string }) => ({
        event_id: eventId,
        selector_id: selectorId,
        selected_id: s.selected_id,
        selection_type: s.selection_type,
      }));

      const { error: insertError } = await supabase
        .from('participant_selections')
        .insert(selectionsToInsert);

      if (insertError) {
        console.error('[submit-selections] Error inserting selections:', insertError);
        return new Response(
          JSON.stringify({ error: 'Error al guardar las selecciones' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Update participant's selection_submitted_at
    await supabase
      .from('participants')
      .update({ selection_submitted_at: new Date().toISOString() })
      .eq('id', selectorId);

    console.log(`[submit-selections] Successfully saved ${selections.length} selections for participant ${selectorId}`);
    return new Response(
      JSON.stringify({ success: true, count: selections.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[submit-selections] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
