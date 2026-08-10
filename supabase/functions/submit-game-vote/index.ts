import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_QUESTIONS = [
  { id: "profession", label_es: "¿Cuál es tu profesión?", label_en: "What do you do for a living?" },
  { id: "fun_fact", label_es: "Explica un fun fact sobre ti", label_en: "Share a fun fact about yourself" },
  { id: "useless_talent", label_es: "¿Cuál es tu talento más inútil?", label_en: "What is your most useless talent?" },
  { id: "movie_genre", label_es: "Si tu vida fuera una película, ¿qué género sería?", label_en: "If your life were a movie, what genre would it be?" },
  { id: "guilty_pleasure", label_es: "¿Qué cosa te da vergüenza admitir que te encanta?", label_en: "What do you love but are embarrassed to admit?" },
];

function normalizeQuestions(raw: any) {
  return Array.isArray(raw?.questions) && raw.questions.length > 0
    ? raw.questions.filter((q: any) => q && typeof q.id === "string").map((q: any) => ({ id: String(q.id) }))
    : DEFAULT_QUESTIONS.map((q) => ({ id: q.id }));
}

function questionsForRound(round: number, questions: any[]) {
  if (questions.length === 0) return [];
  const r = Math.max(0, Math.floor(round));
  const first = (r * 2) % questions.length;
  const second = (r * 2 + 1) % questions.length;
  if (questions.length === 1 || first === second) return [questions[first]];
  return [questions[first], questions[second]];
}

function anonymizeName(fullName: string): string {
  const parts = String(fullName || "").trim().split(/\s+/);
  if (parts.length <= 1) return fullName;
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

let cachedKey: CryptoKey | null = null;
async function getKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "fallback-social-game-key";
  cachedKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(`social-game::${secret}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return cachedKey;
}

async function entryToken(eventId: string, round: number, questionId: string, targetId: string): Promise<string> {
  const key = await getKey();
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${eventId}|${round}|${questionId}|${targetId}`),
  );
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 24);
}

function findRoundSeating(event: any, participantId: string, round: number): string[] | null {
  if (round === 0) {
    const prelim = event.preliminary_round;
    if (!prelim?.enabled || !Array.isArray(prelim.tables)) return null;
    const dismissed: number[] = prelim.dismissed_tables || [];
    for (let i = 0; i < prelim.tables.length; i++) {
      if (dismissed.includes(i)) continue;
      const table = prelim.tables[i];
      if (Array.isArray(table) && table.some((p: any) => p?.id === participantId)) {
        return table.filter((p: any) => p?.id !== participantId).map((p: any) => p.id);
      }
    }
    return null;
  }

  const tables = Array.isArray(event.tables) ? event.tables : [];
  const roundData = tables.find((r: any) => Number(r?.round) === round);
  if (!roundData || !Array.isArray(roundData.tables)) return null;
  if (event.draft_round !== null && event.draft_round === round) return null;
  for (const table of roundData.tables) {
    if (Array.isArray(table) && table.some((p: any) => p?.id === participantId)) {
      return table.filter((p: any) => p?.id !== participantId).map((p: any) => p.id);
    }
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { eventId, verificationCode, round, questionId, entryToken: token, guessedParticipantId } = await req.json();

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (
      !eventId || !uuidRegex.test(String(eventId)) ||
      !/^\d{6}$/.test(String(verificationCode || "")) ||
      typeof round !== "number" || round < 0 ||
      !questionId || typeof questionId !== "string" ||
      !token || typeof token !== "string" ||
      !guessedParticipantId || !uuidRegex.test(String(guessedParticipantId))
    ) {
      return new Response(JSON.stringify({ error: "Datos inválidos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: event } = await supabase
      .from("events")
      .select("id, tables, preliminary_round, social_game, draft_round")
      .eq("id", eventId)
      .maybeSingle();

    const cfg = (event as any)?.social_game;
    if (!event || !cfg?.enabled) {
      return new Response(JSON.stringify({ error: "El juego no está disponible" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: participant } = await supabase
      .from("participants")
      .select("id")
      .eq("event_id", eventId)
      .eq("verification_code", verificationCode)
      .maybeSingle();

    if (!participant) {
      return new Response(JSON.stringify({ error: "Código de verificación incorrecto" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const questions = normalizeQuestions(cfg);
    const roundQuestions = questionsForRound(round, questions);
    if (!roundQuestions.some((q: any) => q.id === questionId)) {
      return new Response(JSON.stringify({ error: "Pregunta no disponible en esta ronda" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tablemateIds = findRoundSeating(event, participant.id, round);
    if (!tablemateIds || tablemateIds.length === 0) {
      return new Response(JSON.stringify({ error: "No tienes mesa en esta ronda" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!tablemateIds.includes(guessedParticipantId)) {
      return new Response(JSON.stringify({ error: "Esa persona no está en tu mesa" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve which tablemate the anonymous answer belongs to
    let targetId: string | null = null;
    for (const id of tablemateIds) {
      if ((await entryToken(eventId, round, questionId, id)) === token) {
        targetId = id;
        break;
      }
    }
    if (!targetId) {
      return new Response(JSON.stringify({ error: "Respuesta no válida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: mates } = await supabase
      .from("participants")
      .select("id, name, game_answers")
      .in("id", tablemateIds);

    const isCorrect = targetId === guessedParticipantId;
    const author = (mates || []).find((m: any) => m.id === targetId);

    const { error: voteError } = await supabase.from("game_votes").insert({
      event_id: eventId,
      round,
      question_id: questionId,
      voter_participant_id: participant.id,
      target_participant_id: targetId,
      guessed_participant_id: guessedParticipantId,
      is_correct: isCorrect,
    });

    if (voteError) {
      if (String(voteError.code) === "23505" || String(voteError.message || "").includes("duplicate")) {
        return new Response(JSON.stringify({ error: "Ya has votado esta respuesta" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw voteError;
    }

    // Recompute rewards for this round
    const answersById = new Map<string, Record<string, string>>();
    for (const m of (mates || []) as any[]) answersById.set(m.id, (m.game_answers || {}) as Record<string, string>);

    let totalVotable = 0;
    for (const q of roundQuestions) {
      for (const id of tablemateIds) {
        if (String(answersById.get(id)?.[(q as any).id] || "").trim()) totalVotable++;
      }
    }

    const { data: roundVotes } = await supabase
      .from("game_votes")
      .select("is_correct")
      .eq("event_id", eventId)
      .eq("voter_participant_id", participant.id)
      .eq("round", round);

    const correctCount = (roundVotes || []).filter((v: any) => v.is_correct).length;

    const earned: string[] = [];
    if (totalVotable > 0 && correctCount > 0) {
      earned.push("super_like");
      if (correctCount >= 3) earned.push("repeat");
      if (correctCount >= totalVotable) earned.push("crush");
    }

    if (earned.length > 0) {
      await supabase.from("game_rewards").upsert(
        earned.map((type) => ({
          event_id: eventId,
          participant_id: participant.id,
          round,
          reward_type: type,
        })),
        { onConflict: "event_id,participant_id,round,reward_type", ignoreDuplicates: true },
      );
    }

    const { data: allRewards } = await supabase
      .from("game_rewards")
      .select("round, reward_type")
      .eq("event_id", eventId)
      .eq("participant_id", participant.id);

    return new Response(
      JSON.stringify({
        success: true,
        correct: isCorrect,
        authorId: targetId,
        authorName: anonymizeName(author?.name || ""),
        correctCount,
        totalVotable,
        rewards: (allRewards || []).map((r: any) => ({ round: r.round, type: r.reward_type })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[submit-game-vote] error", error);
    return new Response(JSON.stringify({ error: "Error interno del servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
