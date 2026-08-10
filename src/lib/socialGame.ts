// Social game «¿Quién es quién?» — configuration helpers.
// Participants answer 5 free-text questions at registration. In each round they
// read two of those questions anonymously and guess who wrote each answer.

export interface SocialGameQuestion {
  id: string;
  label_es: string;
  label_en: string;
}

export interface SocialGameConfig {
  enabled: boolean;
  questions: SocialGameQuestion[];
}

export const SOCIAL_GAME_MAX_LENGTH = 140;

export const DEFAULT_SOCIAL_GAME_QUESTIONS: SocialGameQuestion[] = [
  { id: "profession", label_es: "¿Cuál es tu profesión?", label_en: "What do you do for a living?" },
  { id: "fun_fact", label_es: "Explica un fun fact sobre ti", label_en: "Share a fun fact about yourself" },
  { id: "useless_talent", label_es: "¿Cuál es tu talento más inútil?", label_en: "What is your most useless talent?" },
  { id: "movie_genre", label_es: "Si tu vida fuera una película, ¿qué género sería?", label_en: "If your life were a movie, what genre would it be?" },
  { id: "guilty_pleasure", label_es: "¿Qué cosa te da vergüenza admitir que te encanta?", label_en: "What do you love but are embarrassed to admit?" },
];

export function normalizeSocialGame(source: unknown): SocialGameConfig {
  const raw = (source || {}) as any;
  const questions: SocialGameQuestion[] = Array.isArray(raw.questions) && raw.questions.length > 0
    ? raw.questions
        .filter((q: any) => q && typeof q.id === "string")
        .map((q: any) => ({
          id: String(q.id),
          label_es: String(q.label_es || ""),
          label_en: String(q.label_en || q.label_es || ""),
        }))
    : DEFAULT_SOCIAL_GAME_QUESTIONS;

  return { enabled: !!raw.enabled, questions };
}

export function isSocialGameEnabled(source: unknown): boolean {
  const raw = (source || {}) as any;
  return !!raw.enabled;
}

export function socialGameLabel(q: SocialGameQuestion, lang: "es" | "en"): string {
  return (lang === "en" ? q.label_en : q.label_es) || q.label_es || q.label_en;
}

/** Two questions per round, rotating deterministically. Round 0 = preliminary. */
export function questionsForRound(round: number, questions: SocialGameQuestion[]): SocialGameQuestion[] {
  if (questions.length === 0) return [];
  const r = Math.max(0, Math.floor(round));
  const first = (r * 2) % questions.length;
  const second = (r * 2 + 1) % questions.length;
  if (questions.length === 1 || first === second) return [questions[first]];
  return [questions[first], questions[second]];
}

export type SocialGameRewardType = "super_like" | "repeat" | "crush";

/** Rewards earned in a round given correct guesses and the total votable answers. */
export function rewardsForRound(correct: number, total: number): SocialGameRewardType[] {
  const rewards: SocialGameRewardType[] = [];
  if (total <= 0 || correct <= 0) return rewards;
  rewards.push("super_like");
  if (correct >= 3) rewards.push("repeat");
  if (correct >= total) rewards.push("crush");
  return rewards;
}

export type SocialGameAnswers = Record<string, string>;

export function missingSocialGameAnswers(
  questions: SocialGameQuestion[],
  answers: SocialGameAnswers
): string[] {
  return questions.filter((q) => !String(answers?.[q.id] || "").trim()).map((q) => q.id);
}
