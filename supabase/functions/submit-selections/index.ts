import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple rate limiting - 10 submissions per IP per 10 minutes (increased for incremental selections)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 10 * 60 * 1000; // 10 minutes
const MAX_SUBMISSIONS = 10;

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

    const { eventId, selectorId: rawSelectorId, verificationCode, selections, superLikeId } = await req.json();
    
    console.log(`[submit-selections] Request for event: ${eventId}, selectorId: ${rawSelectorId || 'N/A'}, verificationCode: ${verificationCode ? '****' : 'N/A'}, selections count: ${selections?.length || 0}, superLikeId: ${superLikeId || 'none'}`);

    // Validate required fields
    if (!eventId || (!rawSelectorId && !verificationCode)) {
      console.error('[submit-selections] Missing eventId or (selectorId/verificationCode)');
      return new Response(
        JSON.stringify({ error: 'Datos incompletos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate UUID format for eventId
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(eventId)) {
      console.error('[submit-selections] Invalid UUID format for eventId');
      return new Response(
        JSON.stringify({ error: 'Formato de solicitud inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If selectorId is provided, validate UUID format
    let selectorId = rawSelectorId;
    if (selectorId && !uuidRegex.test(selectorId)) {
      console.error('[submit-selections] Invalid UUID format for selectorId');
      return new Response(
        JSON.stringify({ error: 'Formato de solicitud inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate verification code format (6 digits)
    if (verificationCode && !/^\d{6}$/.test(verificationCode)) {
      console.error('[submit-selections] Invalid verification code format');
      return new Response(
        JSON.stringify({ error: 'Código de verificación inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Resolve selectorId from verification code if needed
    if (verificationCode && !selectorId) {
      console.log('[submit-selections] Resolving selectorId from verification code');
      const { data: participant, error: codeError } = await supabase
        .from('participants')
        .select('id, name')
        .eq('event_id', eventId)
        .eq('verification_code', verificationCode)
        .single();
      
      if (codeError || !participant) {
        console.error('[submit-selections] Invalid verification code:', codeError);
        return new Response(
          JSON.stringify({ error: 'Código de verificación incorrecto' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      selectorId = participant.id;
      console.log(`[submit-selections] Resolved participant: ${participant.name} (${selectorId})`);
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

    // Supabase client already created above

    // Verify the event exists and check super_like_enabled
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, status, super_like_enabled')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      console.error('[submit-selections] Event not found:', eventError);
      return new Response(
        JSON.stringify({ error: 'Evento no encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the selector is a participant of this event and get their dating info
    const { data: selectorParticipant, error: selectorError } = await supabase
      .from('participants')
      .select('id, name, event_id, preference, dating_preference, gender')
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

    // Get existing selections for this selector (for incremental selection)
    const { data: existingSelections, error: existingError } = await supabase
      .from('participant_selections')
      .select('selected_id')
      .eq('event_id', eventId)
      .eq('selector_id', selectorId);

    if (existingError) {
      console.error('[submit-selections] Error checking existing selections:', existingError);
      return new Response(
        JSON.stringify({ error: 'Error al verificar selecciones existentes' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create set of already selected participant IDs
    const alreadySelectedIds = new Set(existingSelections?.map(s => s.selected_id) || []);
    console.log(`[submit-selections] Selector already has ${alreadySelectedIds.size} selections`);

    // Filter out already selected participants (only add new ones)
    const newSelections = selections.filter(
      (s: { selected_id: string }) => !alreadySelectedIds.has(s.selected_id)
    );

    console.log(`[submit-selections] New selections to add: ${newSelections.length}`);

    // If no new selections, still mark as submitted and return success
    if (newSelections.length === 0) {
      console.log('[submit-selections] No new selections to add, marking as submitted');
      // Update selection_submitted_at even for empty submissions
      await supabase
        .from('participants')
        .update({ selection_submitted_at: new Date().toISOString() })
        .eq('id', selectorId);
      
      return new Response(
        JSON.stringify({ success: true, count: 0, message: 'Selecciones registradas correctamente' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify all selected participants belong to this event
    const selectedIds = newSelections.map((s: { selected_id: string }) => s.selected_id);
    
    const { data: validParticipants, error: validError } = await supabase
      .from('participants')
      .select('id, preference, dating_preference, gender')
      .eq('event_id', eventId)
      .in('id', selectedIds);

    if (validError) {
      console.error('[submit-selections] Error validating selected participants:', validError);
      return new Response(
        JSON.stringify({ error: 'Error al validar participantes seleccionados' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validParticipantIds = new Set(validParticipants?.map(p => p.id) || []);
    
    if (validParticipantIds.size < selectedIds.length) {
      const invalidIds = selectedIds.filter(id => !validParticipantIds.has(id));
      console.warn(`[submit-selections] Filtering out ${invalidIds.length} invalid participant IDs: ${invalidIds.join(', ')}`);
      // Filter newSelections to only include valid participants instead of rejecting the whole request
      const filteredSelections = newSelections.filter(
        (s: { selected_id: string }) => validParticipantIds.has(s.selected_id)
      );
      
      if (filteredSelections.length === 0) {
        console.log('[submit-selections] No valid selections remaining after filtering, marking as submitted');
        await supabase
          .from('participants')
          .update({ selection_submitted_at: new Date().toISOString() })
          .eq('id', selectorId);
        
        return new Response(
          JSON.stringify({ success: true, count: 0, message: 'Selecciones registradas correctamente' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Replace newSelections with filtered ones for the rest of the flow
      newSelections.length = 0;
      newSelections.push(...filteredSelections);
    }

    // Verify selector is not selecting themselves
    if (selectedIds.includes(selectorId)) {
      console.error('[submit-selections] Selector cannot select themselves');
      return new Response(
        JSON.stringify({ error: 'No puedes seleccionarte a ti mismo' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Server-side dating compatibility validation
    // Build a map of selected participants' dating info for validation
    const selectedParticipantMap = new Map<string, { preference: string | null; dating_preference: string | null; gender: string | null }>();
    if (validParticipants) {
      for (const vp of validParticipants) {
        selectedParticipantMap.set(vp.id, { preference: vp.preference, dating_preference: vp.dating_preference, gender: vp.gender });
      }
    }

    const selectorDatingPref = selectorParticipant.dating_preference || '';
    const selectorGender = selectorParticipant.gender || null;

    // Validate and downgrade incompatible dating selections to friendship
    const selectionsToInsert = newSelections.map((s: { selected_id: string; selection_type: string }) => {
      let selectionType = s.selection_type;
      
      if (selectionType === 'dating' || selectionType === 'both') {
        const target = selectedParticipantMap.get(s.selected_id);
        const targetDatingPref = target?.dating_preference || '';
        const targetGender = target?.gender || null;
        
        if (!selectorDatingPref || !targetDatingPref || !areDatingCompatible(selectorDatingPref, selectorGender, targetDatingPref, targetGender)) {
          console.warn(`[submit-selections] Downgrading incompatible dating selection: ${selectorId} → ${s.selected_id}`);
          selectionType = selectionType === 'both' ? 'friendship' : 'friendship';
        }
      }

      return {
        event_id: eventId,
        selector_id: selectorId,
        selected_id: s.selected_id,
        selection_type: selectionType,
        is_super_like: superLikeId && s.selected_id === superLikeId ? true : false,
      };
    });

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

    // Update participant's selection_submitted_at
    await supabase
      .from('participants')
      .update({ selection_submitted_at: new Date().toISOString() })
      .eq('id', selectorId);

    // Trigger super like notification if applicable
    if (superLikeId && event.super_like_enabled) {
      // Check if the super like was actually inserted (not a duplicate)
      const superLikeInserted = selectionsToInsert.some(
        (s: { selected_id: string; is_super_like: boolean }) => s.selected_id === superLikeId && s.is_super_like
      );
      if (superLikeInserted) {
        // Verify this participant hasn't already sent a super like before (double check)
        const { data: existingSuperLikes } = await supabase
          .from('participant_selections')
          .select('id')
          .eq('event_id', eventId)
          .eq('selector_id', selectorId)
          .eq('is_super_like', true);
        
        // Only send notification if this is the first super like (should be 1 - the one we just inserted)
        if (existingSuperLikes && existingSuperLikes.length <= 1) {
          try {
            const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
            const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
            await fetch(`${supabaseUrl}/functions/v1/send-super-like-notification`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseAnonKey}`,
              },
              body: JSON.stringify({ eventId, recipientId: superLikeId }),
            });
            console.log(`[submit-selections] Super like notification triggered for recipient: ${superLikeId}`);
          } catch (notifError) {
            console.error('[submit-selections] Error sending super like notification:', notifError);
            // Don't fail the whole request for a notification error
          }
        }
      }
    }

    const totalSelections = alreadySelectedIds.size + newSelections.length;
    console.log(`[submit-selections] Successfully saved ${newSelections.length} new selections. Total: ${totalSelections}`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        count: newSelections.length, 
        total: totalSelections,
        message: `Guardadas ${newSelections.length} nuevas selecciones` 
      }),
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
