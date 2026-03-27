import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { eventId, verificationCode, confirmed } = await req.json();

    // Validate inputs
    if (!eventId || !verificationCode || typeof confirmed !== 'boolean') {
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

    // Find participant
    const { data: participant, error: pError } = await supabase
      .from('participants')
      .select('id')
      .eq('event_id', eventId)
      .eq('verification_code', verificationCode)
      .maybeSingle();

    if (pError || !participant) {
      return new Response(
        JSON.stringify({ error: 'Código de verificación incorrecto' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get event with preliminary_round
    const { data: event, error: eError } = await supabase
      .from('events')
      .select('preliminary_round')
      .eq('id', eventId)
      .single();

    if (eError || !event) {
      return new Response(
        JSON.stringify({ error: 'Evento no encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prelim = event.preliminary_round as any;
    if (!prelim?.enabled || !Array.isArray(prelim.tables)) {
      return new Response(
        JSON.stringify({ error: 'No hay ronda preliminar en este evento' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find which table this participant is in
    let participantTableIndex = -1;
    for (let i = 0; i < prelim.tables.length; i++) {
      if (Array.isArray(prelim.tables[i]) && prelim.tables[i].some((p: any) => p.id === participant.id)) {
        participantTableIndex = i;
        break;
      }
    }

    if (participantTableIndex === -1) {
      return new Response(
        JSON.stringify({ error: 'No estás asignado a ninguna mesa preliminar' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update confirmations
    const confirmations = prelim.confirmations || {};
    confirmations[participant.id] = confirmed;

    // Check if all participants in this table said false → dismiss the table
    const dismissedTables: number[] = prelim.dismissed_tables || [];
    
    if (!confirmed) {
      const tableParticipants = prelim.tables[participantTableIndex];
      const allDenied = tableParticipants.every((p: any) => confirmations[p.id] === false);
      if (allDenied && !dismissedTables.includes(participantTableIndex)) {
        dismissedTables.push(participantTableIndex);
      }
    }

    const updatedPrelim = {
      ...prelim,
      confirmations,
      dismissed_tables: dismissedTables,
    };

    const { error: updateError } = await supabase
      .from('events')
      .update({ preliminary_round: updatedPrelim })
      .eq('id', eventId);

    if (updateError) {
      console.error('[confirm-preliminary] Update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Error al actualizar' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        confirmed,
        tableDismissed: dismissedTables.includes(participantTableIndex)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[confirm-preliminary] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
