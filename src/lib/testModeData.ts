// Test mode helpers: keep fake participants in sync with every participant-facing
// feature (Wrapped submode compatibility + «¿Quién es quién?» social game).
// Used both when creating a test event and to backfill older test events.
import { supabase } from "@/integrations/supabase/client";
import { generateFakeParticipants, type FakeGenConfig } from "./fakeParticipantGenerator";
import { DEFAULT_WRAPPED_QUESTIONS, getWrappedQuestions, type WrappedAnswers } from "./wrappedQuestions";
import { DEFAULT_SOCIAL_GAME_QUESTIONS, normalizeSocialGame } from "./socialGame";

function hobbiesFrom(answers: WrappedAnswers | null | undefined): string[] {
  const top = (answers as any)?.top_hobbies;
  if (!top) return [];
  return [top.top1, top.top2, top.top3].filter(Boolean) as string[];
}

/**
 * Creates (or updates) a wrapped_profile per fake participant and links it, so the
 * compatibility ranking works exactly like with real registrations.
 */
export async function linkWrappedProfiles(
  organizerId: string,
  participants: { id: string; email?: string | null; wrappedAnswers?: WrappedAnswers | null }[]
): Promise<number> {
  let linked = 0;
  for (const p of participants) {
    if (!p.wrappedAnswers || !p.email) continue;
    const emailLower = p.email.toLowerCase().trim();
    const hobbies = hobbiesFrom(p.wrappedAnswers);

    const { data: existing } = await supabase
      .from("wrapped_profiles")
      .select("id")
      .eq("organizer_id", organizerId)
      .eq("email", emailLower)
      .maybeSingle();

    let profileId = existing?.id as string | undefined;

    if (profileId) {
      await supabase
        .from("wrapped_profiles")
        .update({ answers: p.wrappedAnswers as any, hobbies_ranked: hobbies })
        .eq("id", profileId);
    } else {
      const { data: created } = await supabase
        .from("wrapped_profiles")
        .insert({
          organizer_id: organizerId,
          email: emailLower,
          answers: p.wrappedAnswers as any,
          hobbies_ranked: hobbies,
        })
        .select("id")
        .single();
      profileId = created?.id;
    }

    if (profileId) {
      await supabase.from("participants").update({ wrapped_profile_id: profileId }).eq("id", p.id);
      linked++;
    }
  }
  return linked;
}

export interface BackfillResult {
  updated: number;
  linked: number;
  featuresEnabled: boolean;
}

/**
 * Retroactive fix for existing test events: fills the full form (Wrapped answers,
 * social game answers, spoken languages, birth date) for every fake participant
 * that is missing it, and makes sure the event has the features enabled.
 */
export async function backfillTestEventData(
  eventId: string,
  organizerId: string,
  options: { enableFeatures?: boolean } = {}
): Promise<BackfillResult> {
  const { data: event } = await supabase
    .from("events")
    .select("id, module, language, wrapped_enabled, wrapped_questions, social_game, available_languages")
    .eq("id", eventId)
    .maybeSingle();

  if (!event) return { updated: 0, linked: 0, featuresEnabled: false };

  const isSocial = ((event as any).module || "social") === "social";
  const wrappedQuestions = getWrappedQuestions((event as any).wrapped_questions);
  const socialGame = normalizeSocialGame((event as any).social_game);
  const socialGameQuestions = socialGame.questions.length > 0
    ? socialGame.questions
    : DEFAULT_SOCIAL_GAME_QUESTIONS;
  const availableLanguages = Array.isArray((event as any).available_languages) && (event as any).available_languages.length > 0
    ? (event as any).available_languages
    : ["es", "ca", "en"];
  const language = ((event as any).language === "en" ? "en" : "es") as "es" | "en";

  let featuresEnabled = false;
  if (isSocial && options.enableFeatures) {
    await supabase
      .from("events")
      .update({
        wrapped_enabled: true,
        wrapped_questions: wrappedQuestions as any,
        social_game: { enabled: true, questions: socialGameQuestions } as any,
        super_like_enabled: true,
        repeat_request_enabled: true,
        crush_enabled: true,
      })
      .eq("id", eventId);
    featuresEnabled = true;
  }

  const { data: fakes } = await supabase
    .from("participants")
    .select("id, name, email, gender, birth_date, game_answers, spoken_languages, wrapped_profile_id")
    .eq("event_id", eventId)
    .eq("is_fake", true);

  if (!fakes || fakes.length === 0) return { updated: 0, linked: 0, featuresEnabled };

  // One synthetic answer set per fake participant
  const cfg: FakeGenConfig = {
    count: fakes.length,
    malePct: 50,
    femalePct: 50,
    language,
    prefix: "",
    redirectEmail: null,
    disableEmails: true,
    ageRanges: [],
    preferences: [],
    datingPreferences: [],
    wrappedQuestions: wrappedQuestions.length > 0 ? wrappedQuestions : DEFAULT_WRAPPED_QUESTIONS,
    socialGameQuestions,
    availableLanguages,
  };
  const generated = generateFakeParticipants(cfg);

  const toLink: { id: string; email?: string | null; wrappedAnswers?: WrappedAnswers | null }[] = [];
  let updated = 0;

  for (let i = 0; i < fakes.length; i++) {
    const f = fakes[i] as any;
    const g = generated[i];
    if (!g) continue;

    const updates: Record<string, any> = {};
    const hasWrapped = f.wrapped_answers && Object.keys(f.wrapped_answers).length > 0;
    const hasGame = f.game_answers && Object.keys(f.game_answers).length > 0;

    if (!hasWrapped) updates.wrapped_answers = g.wrappedAnswers || null;
    if (!hasGame) updates.game_answers = g.gameAnswers || null;
    if (!Array.isArray(f.spoken_languages) || f.spoken_languages.length === 0) {
      updates.spoken_languages = g.spokenLanguages || [];
    }
    if (!f.birth_date) updates.birth_date = g.birthDate;

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase.from("participants").update(updates).eq("id", f.id);
      if (!error) updated++;
    }

    const answers = (updates.wrapped_answers || f.wrapped_answers) as WrappedAnswers | null;
    if (!f.wrapped_profile_id && answers) {
      toLink.push({ id: f.id, email: f.email, wrappedAnswers: answers });
    }
  }

  const linked = await linkWrappedProfiles(organizerId, toLink);
  return { updated, linked, featuresEnabled };
}
