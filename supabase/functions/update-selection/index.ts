import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Bilateral dating preference compatibility check (mirror of submit-selections).
 */
function areDatingCompatible(pref1: string, gender1: string | null, pref2: string, gender2: string | null): boolean {
  const openPrefs = ["abierto a todo", "abierta a todo", "abierto/a a todo", "open to all"];
  const p1Lower = pref1.toLowerCase();
  const p2Lower = pref2.toLowerCase();
  if (openPrefs.some(o => p1Lower.includes(o)) || openPrefs.some(o => p2Lower.includes(o))) return true;

  const p1LookingForWoman = p1Lower.includes("busco una mujer") || p1Lower.includes("looking for a woman");
  const p1LookingForMan = p1Lower.includes("busco un hombre") || p1Lower.includes("looking for a man");
  const p2LookingForWoman = p2Lower.includes("busco una mujer") || p2Lower.includes("looking for a woman");
  const p2LookingForMan = p2Lower.includes("busco un hombre") || p2Lower.includes("looking for a man");

  const g1 = (gender1 || '').toLowerCase();
  const g2 = (gender2 || '').toLowerCase();
  const p1IsMan = g1 === 'hombre' || g1 === 'man' || p1Lower.includes("soy un hombre");
  const p1IsWoman = g1 === 'mujer' || g1 === 'woman' || p1Lower.includes("soy una mujer");
  const p2IsMan = g2 === 'hombre' || g2 === 'man' || p2Lower.includes("soy un hombre");
  const p2IsWoman = g2 === 'mujer' || g2 === 'woman' || p2Lower.includes("soy una mujer");

  if (p1IsMan && p1LookingForWoman && p2IsWoman && p2LookingForMan) return true;
  if (p1IsWoman && p1LookingForMan && p2IsMan && p2LookingForWoman) return true;
  if (p1IsMan && p1LookingForMan && p2IsMan && p2LookingForMan) return true;
  if (p1IsWoman && p1LookingForWoman && p2IsWoman && p2LookingForWoman) return true;

  return false;
}

// Lightweight rate limit (15 edits per IP / 10 min) to deter abuse.
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 10 * 60 * 1000;
const MAX_EDITS = 15;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return false;
  }
  if (record.count >= MAX_EDITS) return true;
  record.count++;
  return false;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                     req.headers.get('x-real-ip') || 'unknown';
    if (isRateLimited(clientIP)) {
      return new Response(JSON.stringify({ error: 'Demasiadas modificaciones. Espera unos minutos.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { eventId, verificationCode, selectedId, selectionType } = await req.json();

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!eventId || !uuidRegex.test(eventId)) {
      return new Response(JSON.stringify({ error: 'Evento inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!verificationCode || !/^\d{6}$/.test(verificationCode)) {
      return new Response(JSON.stringify({ error: 'Código de verificación inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!selectedId || !uuidRegex.test(selectedId)) {
      return new Response(JSON.stringify({ error: 'Selección inválida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    // selectionType can be null/empty (= remove selection), or one of the allowed types
    const allowedTypes = ['friendship', 'dating', 'both', null, ''] as const;
    if (selectionType !== null && selectionType !== undefined && !['friendship', 'dating', 'both'].includes(selectionType)) {
      return new Response(JSON.stringify({ error: 'Tipo de selección inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Resolve selector via verification code
    const { data: selector, error: selectorError } = await supabase
      .from('participants')
      .select('id, name, event_id, preference, dating_preference, gender')
      .eq('event_id', eventId)
      .eq('verification_code', verificationCode)
      .single();

    if (selectorError || !selector) {
      return new Response(JSON.stringify({ error: 'Código de verificación incorrecto' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (selector.id === selectedId) {
      return new Response(JSON.stringify({ error: 'No puedes seleccionarte a ti mismo' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Check event status — block edits once event is closed
    const { data: event } = await supabase
      .from('events')
      .select('status, selection_closed_at')
      .eq('id', eventId)
      .single();
    if (!event) {
      return new Response(JSON.stringify({ error: 'Evento no encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (event.status === 'completed' || event.selection_closed_at) {
      return new Response(JSON.stringify({ error: 'El periodo de selecciones ya está cerrado' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Verify selected participant belongs to event
    const { data: target, error: targetError } = await supabase
      .from('participants')
      .select('id, dating_preference, gender')
      .eq('id', selectedId)
      .eq('event_id', eventId)
      .single();
    if (targetError || !target) {
      return new Response(JSON.stringify({ error: 'Participante seleccionado inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Find existing selection for this pair (preserve super_like flag if any)
    const { data: existing } = await supabase
      .from('participant_selections')
      .select('id, is_super_like')
      .eq('event_id', eventId)
      .eq('selector_id', selector.id)
      .eq('selected_id', selectedId)
      .maybeSingle();

    const wasSuperLike = !!existing?.is_super_like;

    // Delete existing (RLS blocks DELETE for public, but service role bypasses RLS)
    if (existing) {
      const { error: delError } = await supabase
        .from('participant_selections')
        .delete()
        .eq('id', existing.id);
      if (delError) {
        console.error('[update-selection] Delete error:', delError);
        return new Response(JSON.stringify({ error: 'No se pudo actualizar la selección' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // If selectionType is null/empty → remove (already done above) and exit
    if (!selectionType) {
      return new Response(JSON.stringify({ success: true, removed: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Server-side dating compatibility downgrade
    let finalType = selectionType;
    if (finalType === 'dating' || finalType === 'both') {
      const compatible = !!selector.dating_preference && !!target.dating_preference &&
        areDatingCompatible(selector.dating_preference, selector.gender, target.dating_preference, target.gender);
      if (!compatible) {
        finalType = 'friendship';
      }
    }

    const { error: insertError } = await supabase
      .from('participant_selections')
      .insert({
        event_id: eventId,
        selector_id: selector.id,
        selected_id: selectedId,
        selection_type: finalType,
        is_super_like: wasSuperLike, // preserve super-like assignment if it existed
      });

    if (insertError) {
      console.error('[update-selection] Insert error:', insertError);
      return new Response(JSON.stringify({ error: 'No se pudo guardar la nueva selección' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: true, selectionType: finalType }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('[update-selection] Unexpected error:', err);
    return new Response(JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
