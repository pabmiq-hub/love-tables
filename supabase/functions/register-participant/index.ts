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

// Calculate age range from birth date
function parseRange(range: any): { label: string; min: number; max: number } | null {
  // Already an object with min/max
  if (typeof range === 'object' && range !== null && range.min !== undefined) {
    return { label: range.label || String(range.min), min: range.min, max: range.max ?? 100 };
  }
  const str = String(range);
  // Handle "+" formats: "41+", "+ 50", "50+"
  if (str.includes('+')) {
    const num = parseInt(str.replace(/[^0-9]/g, ''));
    if (isNaN(num)) return null;
    return { label: str, min: num, max: 100 };
  }
  // Handle "18-24" or "18–24" formats
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

interface RegistrationRequest {
  eventId: string;
  name: string;
  email: string;
  phone?: string;
  gender: string;
  birthDate: string;
  datingPreference?: string;
  preferredAgeRange?: string;
  isReturningParticipant: boolean;
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

    const body: RegistrationRequest = await req.json();
    const { eventId, name, email, phone, gender, birthDate, datingPreference, preferredAgeRange, isReturningParticipant } = body;
    
    console.log(`[register-participant] Registration for event: ${eventId}, name: ${name}`);

    // Validate required fields
    if (!eventId || !name || !email || !gender || !birthDate) {
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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Formato de email inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate birth date format and age
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get event details
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

    // Calculate age range
    const ageRange = calculateAgeRange(birthDate, event.custom_age_ranges as any[] | null);

    // Check quota limits if enabled
    if (event.registration_requirements_enabled && event.slot_quotas) {
      const quotas = event.slot_quotas as any[];
      const matchingQuota = quotas.find(
        (q: any) => q.gender === gender && q.ageRange === ageRange
      );

      if (matchingQuota) {
        // Count current registrations for this quota
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

    // Check if participant already registered with this email
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

    // Check if event starts within 1 hour - auto check-in with code
    const eventDate = new Date(event.date);
    const oneHourBefore = new Date(eventDate.getTime() - 60 * 60 * 1000);
    const shouldAutoCheckin = new Date() >= oneHourBefore;

    // Only generate code if auto check-in (event is imminent)
    let verificationCode: string | null = null;
    if (shouldAutoCheckin) {
      verificationCode = await generateUniqueCode(supabase);
    }

    // Check if this participant has attended previous events from this organizer
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

    // Create participant - NO verification_code unless auto check-in
    const { data: participant, error: insertError } = await supabase
      .from('participants')
      .insert({
        event_id: eventId,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone?.trim() || null,
        gender,
        birth_date: birthDate,
        age_range: ageRange,
        dating_preference: datingPreference || null,
        preferred_age_range: preferredAgeRange || null,
        is_returning_participant: isReturningParticipant || isActuallyReturning,
        verification_code: verificationCode, // null unless auto check-in
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

    // Increment participants count
    await supabase.rpc('increment_participants', { event_id: eventId });

    console.log(`[register-participant] Participant registered: ${participant.id}, autoCheckin: ${shouldAutoCheckin}`);

    // Return success with participant info
    return new Response(
      JSON.stringify({ 
        success: true,
        participantId: participant.id,
        verificationCode: shouldAutoCheckin ? verificationCode : null, // Only return code if auto check-in
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
