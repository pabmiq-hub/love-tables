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

export function normalizeQuestions(raw: any) {
  const qs = Array.isArray(raw?.questions) && raw.questions.length > 0
    ? raw.questions.filter((q: any) => q && typeof q.id === "string").map((q: any) => ({
        id: String(q.id),
        label_es: String(q.label_es || ""),
        label_en: String(q.label_en || q.label_es || ""),
      }))
    : DEFAULT_QUESTIONS;
  return qs;
}

export function questionsForRound(round: number, questions: any[]) {
  if (questions.length === 0) return [];
  const r = Math.max(0, Math.floor(round));
  const first = (r * 2) % questions.length;
  const second = (r * 2 + 1) % questions.length;
  if (questions.length === 1 || first === second) return [questions[first]];
  return [questions[first], questions[second]];
}

export function anonymizeName(fullName: string): string {
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

export async function entryToken(eventId: string, round: number, questionId: string, targetId: string): Promise<string> {
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

/** Rounds (incl. preliminary round 0) where the participant is seated, with tablemate ids. */
export function resolveParticipantRounds(event: any, participantId: string) {
  const result: { round: number; table: number; tablemateIds: string[] }[] = [];
  const tables = Array.isArray(event.tables) ? event.tables : [];
  const completedRounds: number[] = event.completed_rounds || [];
  const maxTableRound = tables.reduce((max: number, r: any) => Math.max(max, Number(r?.round) || 0), 0);
  const maxCompleted = completedRounds.reduce((m: number, r: any) => Math.max(m, Number(r) || 0), 0);
  const storedCurrent = event.current_round || 0;
  const isCompleted = event.status === "completed";
  const currentRound = isCompleted
    ? Math.max(storedCurrent, maxTableRound)
    : Math.min(
        Math.max(event.rounds || maxTableRound || 0, maxTableRound),
        Math.max(storedCurrent, maxCompleted > 0 ? maxCompleted + 1 : 0),
      );
  const draftRound = event.draft_round ?? null;

  for (const roundData of tables) {
    const roundNumber = Number(roundData?.round) || 0;
    if (!isCompleted && roundNumber > currentRound) continue;
    if (draftRound !== null && roundNumber === draftRound) continue;
    const roundTables = roundData?.tables;
    if (!Array.isArray(roundTables)) continue;
    for (let i = 0; i < roundTables.length; i++) {
      const table = roundTables[i];
      if (!Array.isArray(table)) continue;
      if (table.some((p: any) => p?.id === participantId)) {
        result.push({
          round: roundNumber,
          table: i + 1,
          tablemateIds: table.filter((p: any) => p?.id !== participantId).map((p: any) => p.id),
        });
        break;
      }
    }
  }

  const prelim = event.preliminary_round;
  if (prelim?.enabled && Array.isArray(prelim.tables)) {
    const dismissed: number[] = prelim.dismissed_tables || [];
    const confirmations: Record<string, boolean> = prelim.confirmations || {};
    if (confirmations[participantId] !== false) {
      for (let i = 0; i < prelim.tables.length; i++) {
        if (dismissed.includes(i)) continue;
        const table = prelim.tables[i];
        if (!Array.isArray(table)) continue;
        if (table.some((p: any) => p?.id === participantId)) {
          result.push({
            round: 0,
            table: i + 1,
            tablemateIds: table.filter((p: any) => p?.id !== participantId).map((p: any) => p.id),
          });
          break;
        }
      }
    }
  }

  return { rounds: result.sort((a, b) => a.round - b.round), currentRound };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { eventId, verificationCode } = await req.json();

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!eventId || !uuidRegex.test(String(eventId)) || !/^\d{6}$/.test(String(verificationCode || ""))) {
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
      .select("id, status, language, tables, current_round, rounds, completed_rounds, preliminary_round, social_game, draft_round")
      .eq("id", eventId)
      .maybeSingle();

    if (!event) {
      return new Response(JSON.stringify({ error: "Evento no encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cfg = (event as any).social_game;
    if (!cfg?.enabled) {
      return new Response(JSON.stringify({ enabled: false, rounds: [], rewards: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: participant } = await supabase
      .from("participants")
      .select("id, name, checked_in")
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
    const { rounds } = resolveParticipantRounds(event, participant.id);

    const allMateIds = new Set<string>();
    rounds.forEach((r) => r.tablemateIds.forEach((id) => allMateIds.add(id)));

    const [matesResult, votesResult, rewardsResult] = await Promise.all([
      allMateIds.size > 0
        ? supabase.from("participants").select("id, name, game_answers").in("id", Array.from(allMateIds))
        : Promise.resolve({ data: [] as any[] }),
      supabase
        .from("game_votes")
        .select("round, question_id, target_participant_id, guessed_participant_id, is_correct")
        .eq("event_id", eventId)
        .eq("voter_participant_id", participant.id),
      supabase
        .from("game_rewards")
        .select("round, reward_type")
        .eq("event_id", eventId)
        .eq("participant_id", participant.id),
    ]);

    const mates = new Map<string, { name: string; answers: Record<string, string> }>();
    for (const m of (matesResult.data || []) as any[]) {
      mates.set(m.id, { name: m.name, answers: (m.game_answers || {}) as Record<string, string> });
    }

    const votes = (votesResult.data || []) as any[];

    const payloadRounds = [];
    for (const r of rounds) {
      const roundQuestions = questionsForRound(r.round, questions);
      const options = r.tablemateIds
        .filter((id) => mates.has(id))
        .map((id) => ({ id, name: anonymizeName(mates.get(id)!.name) }));

      const questionPayload = [];
      for (const q of roundQuestions) {
        const entries = [];
        for (const id of r.tablemateIds) {
          const mate = mates.get(id);
          const text = String(mate?.answers?.[q.id] || "").trim();
          if (!mate || !text) continue;
          const token = await entryToken(eventId, r.round, q.id, id);
          const vote = votes.find(
            (v) => v.round === r.round && v.question_id === q.id && v.target_participant_id === id,
          );
          entries.push({
            token,
            text,
            vote: vote
              ? {
                  guessedId: vote.guessed_participant_id,
                  correct: !!vote.is_correct,
                  authorId: id,
                  authorName: anonymizeName(mate.name),
                }
              : null,
          });
        }
        questionPayload.push({
          id: q.id,
          label: (event as any).language === "en" ? q.label_en || q.label_es : q.label_es || q.label_en,
          entries: shuffle(entries),
        });
      }

      payloadRounds.push({
        round: r.round,
        table: r.table,
        options,
        questions: questionPayload,
      });
    }

    return new Response(
      JSON.stringify({
        enabled: true,
        rounds: payloadRounds,
        rewards: (rewardsResult.data || []).map((r: any) => ({ round: r.round, type: r.reward_type })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[get-game-round] error", error);
    return new Response(JSON.stringify({ error: "Error interno del servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
