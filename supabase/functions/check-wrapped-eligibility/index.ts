import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizeKey(v: unknown) {
  return String(v ?? "").toLowerCase().trim().replace(/–/g, "-").replace(/\s+/g, "");
}

function parseRange(range: any): { label: string; min: number; max: number } | null {
  if (typeof range === "object" && range !== null && range.min !== undefined) {
    return { label: range.label || String(range.min), min: range.min, max: range.max ?? 100 };
  }
  const str = String(range);
  if (str.includes("+")) {
    const num = parseInt(str.replace(/[^0-9]/g, ""));
    if (isNaN(num)) return null;
    return { label: str, min: num, max: 100 };
  }
  const parts = str.replace(/–/g, "-").split("-").map((n) => parseInt(n.trim()));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return { label: str, min: parts[0], max: parts[1] };
  }
  return null;
}

function calculateAgeRange(birthDate: string, customAgeRanges: any[] | null): string {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  const defaults = ["18–24", "25–32", "33–40", "41–50", "+ 50"];
  const raws = customAgeRanges && customAgeRanges.length > 0 ? customAgeRanges : defaults;
  for (const r of raws) {
    const parsed = parseRange(r);
    if (parsed && age >= parsed.min && age <= parsed.max) return parsed.label;
  }
  return "Otro";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { eventId, email, gender, birthDate } = await req.json();

    if (!eventId || !email || !gender || !birthDate) {
      return new Response(JSON.stringify({ error: "Faltan campos obligatorios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: "Email inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const birth = new Date(birthDate);
    if (isNaN(birth.getTime())) {
      return new Response(JSON.stringify({ error: "Fecha de nacimiento inválida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    if (age < 18) {
      return new Response(JSON.stringify({ error: "Debes ser mayor de 18 años" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: event, error: eventError } = await supabase
      .from("events")
      .select(
        "id, organizer_id, status, custom_age_ranges, registration_requirements_enabled, slot_quotas, wrapped_enabled",
      )
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return new Response(JSON.stringify({ error: "Evento no encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Already registered?
    const { data: existing } = await supabase
      .from("participants")
      .select("id")
      .eq("event_id", eventId)
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ error: "Ya estás registrado en este evento", alreadyRegistered: true }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Quota check (soft — waitlist may still be possible in the main flow)
    let quotaFull = false;
    let ageRangeLabel: string | null = null;
    if (event.registration_requirements_enabled && event.slot_quotas) {
      ageRangeLabel = calculateAgeRange(birthDate, event.custom_age_ranges as any[] | null);
      const quotas = event.slot_quotas as any[];
      const match = quotas.find(
        (q: any) =>
          normalizeKey(q.gender) === normalizeKey(gender) &&
          normalizeKey(q.ageRange) === normalizeKey(ageRangeLabel),
      );
      if (match) {
        const { data: all } = await supabase
          .from("participants")
          .select("id, gender, age_range")
          .eq("event_id", eventId);
        const count = (all || []).filter(
          (p: any) =>
            normalizeKey(p.gender) === normalizeKey(match.gender) &&
            normalizeKey(p.age_range) === normalizeKey(match.ageRange),
        ).length;
        if (count >= match.maxSlots) quotaFull = true;
      }
    }

    // Existing wrapped profile for this organizer?
    let hasWrappedProfile = false;
    if (event.organizer_id) {
      const { data: profile } = await supabase
        .from("wrapped_profiles")
        .select("id")
        .eq("organizer_id", event.organizer_id)
        .eq("email", email.toLowerCase().trim())
        .maybeSingle();
      hasWrappedProfile = !!profile;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        quotaFull,
        ageRange: ageRangeLabel,
        hasWrappedProfile,
        wrappedEnabled: !!event.wrapped_enabled,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[check-wrapped-eligibility] error", err);
    return new Response(JSON.stringify({ error: "Error interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
