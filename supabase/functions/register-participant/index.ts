import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiter (max 10 registrations per minute per IP)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60000;
const MAX_REQUESTS_PER_WINDOW = 10;

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

// Generate unique 6-digit verification code
async function generateUniqueCode(supabase: any): Promise<string> {
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
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

// Calculate age range from birth date
function parseRange(range: any): { label: string; min: number; max: number } | null {
  if (typeof range === 'object' && range !== null && range.min !== undefined) {
    return { label: range.label || String(range.min), min: range.min, max: range.max ?? 100 };
  }
  const str = String(range);
  if (str.includes('+')) {
    const num = parseInt(str.replace(/[^0-9]/g, ''));
    if (isNaN(num)) return null;
    return { label: str, min: num, max: 100 };
  }
  const parts = str.replace(/–/g, '-').split('-').map(n => parseInt(n.trim()));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return { label: str, min: parts[0], max: parts[1] };
  }
  return null;
}

function calculateAgeRange(birthDate: string, customAgeRanges: any[] | null): string {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  const defaultRanges = ["18–24", "25–32", "33–40", "41–50", "+ 50"];
  const rawRanges = customAgeRanges && customAgeRanges.length > 0 ? customAgeRanges : defaultRanges;
  
  for (const raw of rawRanges) {
    const parsed = parseRange(raw);
    if (parsed && age >= parsed.min && age <= parsed.max) {
      return parsed.label;
    }
  }
  
  return "Otro";
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || req.headers.get('x-real-ip') 
      || 'unknown';
    
    console.log(`[register-participant] Request from IP: ${clientIP}`);
    
    if (isRateLimited(clientIP)) {
      console.warn(`[register-participant] Rate limit exceeded for IP: ${clientIP}`);
      return new Response(
        JSON.stringify({ error: 'Demasiadas solicitudes. Espera un minuto antes de intentarlo de nuevo.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const isProfessional = body.isProfessional === true;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ─── PROFESSIONAL B2B REGISTRATION ───
    if (isProfessional) {
      const { eventId, name, email, phone, entityType, companyName, sector, companySize, needs, solutions } = body;

      console.log(`[register-participant] B2B registration for event: ${eventId}, name: ${name}, type: ${entityType}`);

      if (!eventId || !name || !email || !phone || !entityType || !companyName || !sector || !companySize) {
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

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return new Response(
          JSON.stringify({ error: 'Formato de email inválido' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!['client', 'provider'].includes(entityType)) {
        return new Response(
          JSON.stringify({ error: 'Tipo de entidad inválido' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get event
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id, name, status, date, module, organizer_id, registration_open, waitlist_enabled')
        .eq('id', eventId)
        .single();

      if (eventError || !event) {
        return new Response(
          JSON.stringify({ error: 'Evento no encontrado' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (event.status !== 'pending') {
        return new Response(
          JSON.stringify({ error: 'Las inscripciones para este evento están cerradas' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const registrationOpen = event.registration_open ?? true;
      const waitlistEnabled = event.waitlist_enabled ?? false;
      const isFromWaitlist = body.fromWaitlist === true;

      if (!registrationOpen && !waitlistEnabled && !isFromWaitlist) {
        return new Response(
          JSON.stringify({ error: 'Las inscripciones están cerradas para este evento' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check duplicate email
      const { data: existingParticipant } = await supabase
        .from('participants')
        .select('id')
        .eq('event_id', eventId)
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

      if (existingParticipant) {
        return new Response(
          JSON.stringify({ error: 'Ya estás registrado en este evento' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // If registration is closed and waitlist is enabled, add to waitlist
      if (!registrationOpen && waitlistEnabled && !isFromWaitlist) {
        // Get max position
        const { data: maxPos } = await supabase
          .from('event_waitlist')
          .select('position')
          .eq('event_id', eventId)
          .order('position', { ascending: false })
          .limit(1)
          .maybeSingle();

        const nextPosition = (maxPos?.position || 0) + 1;

        const { error: waitlistError } = await supabase
          .from('event_waitlist')
          .insert({
            event_id: eventId,
            name: name.trim(),
            email: email.toLowerCase().trim(),
            phone: phone.trim(),
            entity_type: entityType,
            company_name: companyName.trim(),
            sector: sector,
            company_size: companySize,
            needs: needs || [],
            solutions: solutions || [],
            position: nextPosition,
          });

        if (waitlistError) {
          if (waitlistError.code === '23505') {
            return new Response(
              JSON.stringify({ error: 'Ya estás en la lista de espera de este evento' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          console.error('[register-participant] Error adding to waitlist:', waitlistError);
          return new Response(
            JSON.stringify({ error: 'Error al añadir a la lista de espera' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, waitlisted: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Auto check-in if event is within 1 hour
      const eventDate = new Date(event.date);
      const oneHourBefore = new Date(eventDate.getTime() - 60 * 60 * 1000);
      const shouldAutoCheckin = new Date() >= oneHourBefore;

      let verificationCode: string | null = null;
      if (shouldAutoCheckin) {
        verificationCode = await generateUniqueCode(supabase);
      }

      // Insert participant with B2B fields
      const { data: participant, error: insertError } = await supabase
        .from('participants')
        .insert({
          event_id: eventId,
          name: name.trim(),
          email: email.toLowerCase().trim(),
          phone: phone.trim(),
          entity_type: entityType,
          company_name: companyName.trim(),
          sector: sector,
          company_size: companySize,
          needs: needs || [],
          solutions: solutions || [],
          verification_code: verificationCode,
          checked_in: shouldAutoCheckin,
        })
        .select()
        .single();

      if (insertError) {
        console.error('[register-participant] Error inserting B2B participant:', insertError);
        return new Response(
          JSON.stringify({ error: 'Error al registrar participante' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await supabase.rpc('increment_participants', { event_id: eventId });

      console.log(`[register-participant] B2B participant registered: ${participant.id}, autoCheckin: ${shouldAutoCheckin}`);

      return new Response(
        JSON.stringify({
          success: true,
          participantId: participant.id,
          verificationCode: shouldAutoCheckin ? verificationCode : null,
          autoCheckedIn: shouldAutoCheckin,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ─── SOCIAL REGISTRATION (existing flow) ───
    const { eventId, name, email, phone, gender, birthDate, preference, datingPreference, preferredAgeRange, isReturningParticipant } = body;
    
    console.log(`[register-participant] Registration for event: ${eventId}, name: ${name}`);

    if (!eventId || !name || !email || !phone || !gender || !birthDate || !preference) {
      return new Response(
        JSON.stringify({ error: 'Faltan campos obligatorios (incluyendo preferencia)' }),
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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Formato de email inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const birthDateObj = new Date(birthDate);
    if (isNaN(birthDateObj.getTime())) {
      return new Response(
        JSON.stringify({ error: 'Fecha de nacimiento inválida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const today = new Date();
    let age = today.getFullYear() - birthDateObj.getFullYear();
    const monthDiff = today.getMonth() - birthDateObj.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDateObj.getDate())) {
      age--;
    }
    
    if (age < 18) {
      return new Response(
        JSON.stringify({ error: 'Debes ser mayor de 18 años para registrarte' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, name, status, date, custom_age_ranges, registration_requirements_enabled, slot_quotas, module, organizer_id')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      console.error('[register-participant] Event not found:', eventError);
      return new Response(
        JSON.stringify({ error: 'Evento no encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (event.status !== 'pending') {
      return new Response(
        JSON.stringify({ error: 'Las inscripciones para este evento están cerradas' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ageRange = calculateAgeRange(birthDate, event.custom_age_ranges as any[] | null);

    if (event.registration_requirements_enabled && event.slot_quotas) {
      const quotas = event.slot_quotas as any[];
      const matchingQuota = quotas.find(
        (q: any) => q.gender === gender && q.ageRange === ageRange
      );

      if (matchingQuota) {
        const { count: currentCount } = await supabase
          .from('participants')
          .select('id', { count: 'exact', head: true })
          .eq('event_id', eventId)
          .eq('gender', gender)
          .eq('age_range', ageRange);

        if (currentCount !== null && currentCount >= matchingQuota.maxSlots) {
          return new Response(
            JSON.stringify({ 
              error: 'No hay plazas disponibles para tu perfil',
              quotaFull: true,
              gender,
              ageRange
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    const { data: existingParticipant } = await supabase
      .from('participants')
      .select('id')
      .eq('event_id', eventId)
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (existingParticipant) {
      return new Response(
        JSON.stringify({ error: 'Ya estás registrado en este evento' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const eventDate = new Date(event.date);
    const oneHourBefore = new Date(eventDate.getTime() - 60 * 60 * 1000);
    const shouldAutoCheckin = new Date() >= oneHourBefore;

    let verificationCode: string | null = null;
    if (shouldAutoCheckin) {
      verificationCode = await generateUniqueCode(supabase);
    }

    let isActuallyReturning = false;
    if (event.organizer_id) {
      const { data: globalParticipant } = await supabase
        .from('global_participants')
        .select('id, events_attended')
        .eq('organizer_id', event.organizer_id)
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();
      
      if (globalParticipant && globalParticipant.events_attended > 0) {
        isActuallyReturning = true;
      }
    }

    const { data: participant, error: insertError } = await supabase
      .from('participants')
      .insert({
        event_id: eventId,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone.trim(),
        gender,
        birth_date: birthDate,
        age_range: ageRange,
        preference: preference || null,
        dating_preference: datingPreference || null,
        preferred_age_range: preferredAgeRange || null,
        is_returning_participant: isReturningParticipant || isActuallyReturning,
        verification_code: verificationCode,
        checked_in: shouldAutoCheckin
      })
      .select()
      .single();

    if (insertError) {
      console.error('[register-participant] Error inserting participant:', insertError);
      return new Response(
        JSON.stringify({ error: 'Error al registrar participante' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await supabase.rpc('increment_participants', { event_id: eventId });

    console.log(`[register-participant] Participant registered: ${participant.id}, autoCheckin: ${shouldAutoCheckin}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        participantId: participant.id,
        verificationCode: shouldAutoCheckin ? verificationCode : null,
        autoCheckedIn: shouldAutoCheckin,
        isReturningParticipant: isActuallyReturning,
        message: shouldAutoCheckin 
          ? 'Registro completado. Se ha realizado el check-in automático. Recibirás un email con tu código de acceso.'
          : 'Registro completado. Recibirás un email de confirmación. El día del evento, al hacer check-in, recibirás tu código personal.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[register-participant] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
