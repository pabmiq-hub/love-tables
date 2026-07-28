// Returns anonymized Top-10 compatibility list + wrapped-table request status for a participant.
// Auth: participantId + verificationCode.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AGE_BUCKETS = [
  { label: "18-23", min: 18, max: 23 },
  { label: "24-29", min: 24, max: 29 },
  { label: "30-35", min: 30, max: 35 },
  { label: "36-40", min: 36, max: 40 },
  { label: "41-46", min: 41, max: 46 },
  { label: "+46", min: 47, max: 200 },
];

const HOBBY_LABELS_ES: Record<string, string> = {
  board_games: "Juegos de mesa", sport: "Deporte", movies_series: "Cine / Series",
  music: "Música", travel: "Viajes", cooking: "Cocina", reading: "Lectura",
  videogames: "Videojuegos", art: "Arte", nature: "Naturaleza",
  photography: "Fotografía", dance: "Baile",
};
const HOBBY_LABELS_EN: Record<string, string> = {
  board_games: "Board games", sport: "Sport", movies_series: "Movies / Series",
  music: "Music", travel: "Travel", cooking: "Cooking", reading: "Reading",
  videogames: "Videogames", art: "Art", nature: "Nature",
  photography: "Photography", dance: "Dance",
};

function ageBucket(birthDate: string | null, ageRange: string | null): string {
  if (birthDate) {
    const b = new Date(birthDate);
    if (!isNaN(b.getTime())) {
      const today = new Date();
      let age = today.getFullYear() - b.getFullYear();
      const m = today.getMonth() - b.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--;
      return AGE_BUCKETS.find((r) => age >= r.min && age <= r.max)?.label || "";
    }
  }
  return ageRange || "";
}

// Default questions structure (must mirror src/lib/wrappedQuestions.ts)
const DEFAULT_QUESTIONS = [
  { id: "lifestyle", type: "multi_choice" },
  { id: "personality", type: "single_choice" },
  { id: "weekend_plan", type: "single_choice" },
  { id: "music", type: "multi_choice" },
  { id: "likes_board_games", type: "yes_no" },
  { id: "gaming_level", type: "single_choice" },
  { id: "humor", type: "multi_choice" },
  { id: "smokes", type: "yes_no" },
  { id: "pets", type: "yes_no" },
  { id: "top_hobbies", type: "ranked_top3" },
];

const RELATED_CLUSTERS: Record<string, string[][]> = {
  music: [
    ["pop", "latin", "indie", "rock"],
    ["electronic", "hiphop"],
    ["classical", "jazz"],
  ],
  lifestyle: [
    ["sport", "outdoor"],
    ["traveler", "outdoor", "foodie"],
    ["movies", "music", "reader", "artist"],
    ["gamer", "movies"],
  ],
  humor: [
    ["absurd", "sarcastic", "dark"],
    ["smart", "sarcastic"],
    ["physical", "absurd"],
  ],
  top_hobbies: [
    ["board_games", "videogames"],
    ["nature", "travel", "photography"],
    ["movies_series", "music", "dance"],
    ["art", "photography", "dance"],
    ["cooking", "reading"],
    ["sport", "nature"],
  ],
};
function areRelated(qid: string, a: string, b: string): boolean {
  if (!a || !b || a === b) return false;
  const groups = RELATED_CLUSTERS[qid];
  if (!groups) return false;
  return groups.some((g) => g.includes(a) && g.includes(b));
}

function computeCompat(a: any, b: any, questions: any[]): number {
  if (!a || !b) return 0;
  let score = 0, max = 0;
  for (const q of questions) {
    const av = a[q.id]; const bv = b[q.id];
    if (q.type === "ranked_top3") {
      max += 60;
      const ar = av || {}; const br = bv || {};
      const aTops = [ar.top1, ar.top2, ar.top3].filter(Boolean);
      const bTops = [br.top1, br.top2, br.top3].filter(Boolean);
      if (ar.top1 && ar.top1 === br.top1) score += 25;
      else if (ar.top1 && bTops.includes(ar.top1)) score += 12;
      else if (ar.top1 && bTops.some((x: string) => areRelated(q.id, ar.top1, x))) score += 6;
      if (ar.top2 && ar.top2 === br.top2) score += 15;
      else if (ar.top2 && bTops.includes(ar.top2)) score += 8;
      else if (ar.top2 && bTops.some((x: string) => areRelated(q.id, ar.top2, x))) score += 4;
      if (ar.top3 && ar.top3 === br.top3) score += 10;
      else if (ar.top3 && bTops.includes(ar.top3)) score += 5;
      else if (ar.top3 && bTops.some((x: string) => areRelated(q.id, ar.top3, x))) score += 3;
      let relBonus = 0;
      for (const x of aTops) {
        if (bTops.includes(x)) continue;
        if (bTops.some((y: string) => areRelated(q.id, x, y))) relBonus += 2;
      }
      score += Math.min(10, relBonus);
    } else if (q.type === "single_choice" || q.type === "yes_no") {
      max += 8;
      if (av && bv && av === bv) score += 8;
      else if (typeof av === "string" && typeof bv === "string" && areRelated(q.id, av, bv)) score += 4;
      if (q.id === "personality" && av && bv && av !== bv) {
        const pair = [String(av), String(bv)].sort().join("+");
        if (pair === "extrovert+introvert" || pair.includes("ambivert")) score += 5;
        max += 5;
      }
    } else if (q.type === "multi_choice") {
      max += 22;
      const A = Array.isArray(av) ? av : [];
      const B = Array.isArray(bv) ? bv : [];
      let shared = 0, related = 0;
      for (const x of A) {
        if (B.includes(x)) shared++;
        else if (B.some((y: string) => areRelated(q.id, x, y))) related++;
      }
      score += Math.min(22, shared * 4 + related * 2);
    }
  }
  return max === 0 ? 0 : Math.round((score / max) * 100);
}

function normalizeGender(g: string | null | undefined): "male" | "female" | "other" {
  const s = String(g || "").toLowerCase().trim();
  if (!s) return "other";
  if (["male", "hombre", "h", "m ", "hombres", "chico", "masculino"].some((k) => s === k.trim())) return "male";
  if (["female", "mujer", "mujeres", "chica", "femenino", "f"].some((k) => s === k.trim())) return "female";
  if (s.startsWith("hom") || s === "m" || s.startsWith("masc")) return "male";
  if (s.startsWith("muj") || s.startsWith("fem")) return "female";
  return "other";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { eventId, participantId, verificationCode, lang = "es" } = await req.json();
    if (!eventId || !participantId || !verificationCode) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Auth + fetch me
    const { data: me } = await supabase
      .from("participants")
      .select("id, event_id, verification_code, gender, birth_date, age_range, wrapped_profile_id")
      .eq("id", participantId).maybeSingle();

    if (!me || me.event_id !== eventId || me.verification_code !== verificationCode) {
      return new Response(JSON.stringify({ error: "Autenticación inválida" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: event } = await supabase
      .from("events")
      .select("wrapped_enabled, wrapped_questions")
      .eq("id", eventId).maybeSingle();

    if (!event?.wrapped_enabled) {
      return new Response(JSON.stringify({ error: "Modo Wrapped no está activo" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const questions = Array.isArray(event.wrapped_questions) && (event.wrapped_questions as any[]).length > 0
      ? (event.wrapped_questions as any[])
      : DEFAULT_QUESTIONS;

    if (!me.wrapped_profile_id) {
      return new Response(JSON.stringify({ topMatches: [], receivedRequests: [], sentCount: 0, myProfileMissing: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch my profile
    const { data: myProfile } = await supabase
      .from("wrapped_profiles").select("id, answers, hobbies_ranked")
      .eq("id", me.wrapped_profile_id).maybeSingle();

    // Fetch other participants of the event with a wrapped_profile
    const { data: others } = await supabase
      .from("participants")
      .select("id, gender, birth_date, age_range, wrapped_profile_id")
      .eq("event_id", eventId)
      .neq("id", participantId)
      .not("wrapped_profile_id", "is", null);

    const profileIds = Array.from(new Set((others || []).map(o => o.wrapped_profile_id).filter(Boolean))) as string[];
    const { data: profiles } = profileIds.length > 0
      ? await supabase.from("wrapped_profiles").select("id, answers, hobbies_ranked").in("id", profileIds)
      : { data: [] as any[] };

    const profileById = new Map((profiles || []).map((p: any) => [p.id, p]));
    const hobbyLabels = lang === "en" ? HOBBY_LABELS_EN : HOBBY_LABELS_ES;

    // Existing wrapped_table_requests involving me
    const { data: reqs } = await supabase
      .from("wrapped_table_requests")
      .select("id, sender_participant_id, receiver_participant_id, status")
      .eq("event_id", eventId)
      .or(`sender_participant_id.eq.${participantId},receiver_participant_id.eq.${participantId}`);

    const outgoingByReceiver = new Map<string, { id: string; status: string }>();
    const receivedList: { id: string; sender_participant_id: string; status: string }[] = [];
    let sentCount = 0;
    for (const r of reqs || []) {
      if (r.sender_participant_id === participantId) {
        sentCount++;
        outgoingByReceiver.set(r.receiver_participant_id, { id: r.id, status: r.status });
      } else {
        receivedList.push(r);
      }
    }

    const scored = (others || []).map((o: any) => {
      const prof = o.wrapped_profile_id ? profileById.get(o.wrapped_profile_id) : null;
      if (!prof) return null;
      const compat = computeCompat(myProfile?.answers, prof.answers, questions);
      const topHobbyKey = Array.isArray(prof.hobbies_ranked) && prof.hobbies_ranked[0];
      return {
        participantId: o.id,
        gender: o.gender || "",
        ageRange: ageBucket(o.birth_date, o.age_range),
        topHobbyKey: topHobbyKey || "",
        topHobbyLabel: topHobbyKey ? (hobbyLabels[topHobbyKey] || topHobbyKey) : "",
        compat,
        outgoing: outgoingByReceiver.get(o.id) || null,
      };
    }).filter(Boolean) as any[];

    scored.sort((a, b) => b.compat - a.compat);
    const top = scored.slice(0, 10);

    // Split by gender for the two-column UI
    const byGender: Record<"male" | "female" | "other", any[]> = { male: [], female: [], other: [] };
    for (const s of scored) {
      const bucket = normalizeGender(s.gender);
      if (byGender[bucket].length < 10) byGender[bucket].push(s);
    }

    const enrichedReceived = receivedList.map(r => {
      const s = scored.find(x => x.participantId === r.sender_participant_id);
      return {
        requestId: r.id,
        status: r.status,
        senderParticipantId: r.sender_participant_id,
        gender: s?.gender || "",
        ageRange: s?.ageRange || "",
        topHobbyLabel: s?.topHobbyLabel || "",
        compat: s?.compat ?? null,
      };
    });

    return new Response(JSON.stringify({
      topMatches: top,
      topByGender: byGender,
      receivedRequests: enrichedReceived,
      sentCount,
      maxRequests: 3,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("get-wrapped-compatibility error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
