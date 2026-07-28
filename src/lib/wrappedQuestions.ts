// Wrapped submode — default interest questions and compatibility algorithm.
// Keys (`id`, `options_key`) are stable identifiers used for matching.
// Only the visible text (label/options) is translated per language.

export type WrappedQuestionType =
  | "yes_no"
  | "single_choice"
  | "multi_choice"
  | "ranked_top3";

export interface WrappedQuestion {
  id: string;
  type: WrappedQuestionType;
  required: boolean;
  options_key?: string[]; // stable option ids
  i18n: {
    es: { label: string; options?: string[] };
    en: { label: string; options?: string[] };
  };
}

export type WrappedAnswers = Record<
  string,
  string | string[] | { top1?: string; top2?: string; top3?: string } | boolean | null
>;

// The `top_hobbies` question MUST include "board_games" as an option.
export const DEFAULT_WRAPPED_QUESTIONS: WrappedQuestion[] = [
  {
    id: "lifestyle",
    type: "multi_choice",
    required: true,
    options_key: ["sport", "movies", "gamer", "traveler", "foodie", "music", "reader", "artist", "outdoor"],
    i18n: {
      es: {
        label: "Estilo de vida (elige todos los que te representen)",
        options: ["Deportista", "Cinéfilo/a", "Gamer", "Viajero/a", "Foodie", "Melómano/a", "Lector/a", "Artista / creativo/a", "Naturaleza / outdoor"],
      },
      en: {
        label: "Lifestyle (pick all that apply)",
        options: ["Sporty", "Movie lover", "Gamer", "Traveler", "Foodie", "Music lover", "Reader", "Artist / creative", "Nature / outdoor"],
      },
    },
  },
  {
    id: "personality",
    type: "single_choice",
    required: true,
    options_key: ["introvert", "ambivert", "extrovert"],
    i18n: {
      es: { label: "¿Cómo te describirías?", options: ["Introvertido/a", "Ambivertido/a", "Extrovertido/a"] },
      en: { label: "How would you describe yourself?", options: ["Introvert", "Ambivert", "Extrovert"] },
    },
  },
  {
    id: "weekend_plan",
    type: "single_choice",
    required: true,
    options_key: ["home", "dinner_friends", "party", "getaway", "cultural"],
    i18n: {
      es: {
        label: "Tu plan ideal de fin de semana",
        options: ["Casa tranquilo/a", "Cena con amigos", "Fiesta", "Escapada", "Evento cultural"],
      },
      en: {
        label: "Your ideal weekend plan",
        options: ["Chill at home", "Dinner with friends", "Party", "Getaway", "Cultural event"],
      },
    },
  },
  {
    id: "music",
    type: "multi_choice",
    required: false,
    options_key: ["pop", "rock", "indie", "electronic", "latin", "classical", "hiphop", "jazz"],
    i18n: {
      es: { label: "Música favorita", options: ["Pop", "Rock", "Indie", "Electrónica", "Latina", "Clásica", "Hip-hop", "Jazz"] },
      en: { label: "Favorite music", options: ["Pop", "Rock", "Indie", "Electronic", "Latin", "Classical", "Hip-hop", "Jazz"] },
    },
  },
  {
    id: "likes_board_games",
    type: "yes_no",
    required: true,
    i18n: {
      es: { label: "¿Te gustan los juegos de mesa?" },
      en: { label: "Do you like board games?" },
    },
  },
  {
    id: "gaming_level",
    type: "single_choice",
    required: false,
    options_key: ["casual", "regular", "hardcore"],
    i18n: {
      es: { label: "Nivel de aficionado a juegos", options: ["Casual", "Habitual", "Muy aficionado/a"] },
      en: { label: "Gaming level", options: ["Casual", "Regular", "Very into it"] },
    },
  },
  {
    id: "humor",
    type: "multi_choice",
    required: false,
    options_key: ["absurd", "sarcastic", "physical", "smart", "dark"],
    i18n: {
      es: { label: "Tipo de humor", options: ["Absurdo", "Sarcástico", "Físico", "Inteligente", "Negro"] },
      en: { label: "Sense of humor", options: ["Absurd", "Sarcastic", "Physical", "Smart", "Dark"] },
    },
  },
  {
    id: "smokes",
    type: "yes_no",
    required: false,
    i18n: { es: { label: "¿Fumas?" }, en: { label: "Do you smoke?" } },
  },
  {
    id: "pets",
    type: "yes_no",
    required: false,
    i18n: { es: { label: "¿Tienes mascotas?" }, en: { label: "Do you have pets?" } },
  },
  {
    id: "top_hobbies",
    type: "ranked_top3",
    required: true,
    options_key: [
      "board_games", "sport", "movies_series", "music", "travel",
      "cooking", "reading", "videogames", "art", "nature", "photography", "dance",
    ],
    i18n: {
      es: {
        label: "Tus 3 hobbies favoritos (ordenados del más al menos)",
        options: [
          "Juegos de mesa", "Deporte", "Cine / Series", "Música", "Viajes",
          "Cocina", "Lectura", "Videojuegos", "Arte", "Naturaleza", "Fotografía", "Baile",
        ],
      },
      en: {
        label: "Your top 3 hobbies (most to least favorite)",
        options: [
          "Board games", "Sport", "Movies / Series", "Music", "Travel",
          "Cooking", "Reading", "Videogames", "Art", "Nature", "Photography", "Dance",
        ],
      },
    },
  },
];

export function getWrappedQuestions(source: unknown): WrappedQuestion[] {
  if (Array.isArray(source) && source.length > 0) {
    return source as WrappedQuestion[];
  }
  return DEFAULT_WRAPPED_QUESTIONS;
}

/**
 * Related-interest clusters per question. Two keys in the same cluster earn
 * partial credit (0.5x) even when they are not identical — this rewards
 * users with adjacent tastes (e.g. indie + rock, board_games + videogames,
 * nature + travel).
 */
export const RELATED_CLUSTERS: Record<string, string[][]> = {
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
  return groups.some(g => g.includes(a) && g.includes(b));
}

/**
 * Compute 0–100 compatibility between two wrapped answer sets.
 * Uses stable option keys, not translated labels.
 *
 * Scoring rewards exact matches AND related interests (see RELATED_CLUSTERS)
 * at ~half weight to give a smoother compatibility gradient.
 */
export function computeCompatibility(
  a: WrappedAnswers | null | undefined,
  b: WrappedAnswers | null | undefined,
  questions: WrappedQuestion[] = DEFAULT_WRAPPED_QUESTIONS
): number {
  if (!a || !b) return 0;
  let score = 0;
  let maxScore = 0;

  for (const q of questions) {
    const av = a[q.id];
    const bv = b[q.id];

    if (q.type === "ranked_top3") {
      maxScore += 60; // 25 + 15 + 10 + up to 10 extra (exact overlap + related)
      const ar = (av || {}) as any;
      const br = (bv || {}) as any;
      const aTops = [ar.top1, ar.top2, ar.top3].filter(Boolean) as string[];
      const bTops = [br.top1, br.top2, br.top3].filter(Boolean) as string[];

      // Exact position matches
      if (ar.top1 && ar.top1 === br.top1) score += 25;
      else if (ar.top1 && bTops.includes(ar.top1)) score += 12;
      else if (ar.top1 && bTops.some(x => areRelated(q.id, ar.top1, x))) score += 6;

      if (ar.top2 && ar.top2 === br.top2) score += 15;
      else if (ar.top2 && bTops.includes(ar.top2)) score += 8;
      else if (ar.top2 && bTops.some(x => areRelated(q.id, ar.top2, x))) score += 4;

      if (ar.top3 && ar.top3 === br.top3) score += 10;
      else if (ar.top3 && bTops.includes(ar.top3)) score += 5;
      else if (ar.top3 && bTops.some(x => areRelated(q.id, ar.top3, x))) score += 3;

      // Related-only bonus (any-order overlap not caught above)
      let relBonus = 0;
      for (const x of aTops) {
        if (bTops.includes(x)) continue;
        if (bTops.some(y => areRelated(q.id, x, y))) relBonus += 2;
      }
      score += Math.min(10, relBonus);
    } else if (q.type === "single_choice" || q.type === "yes_no") {
      maxScore += 8;
      if (av && bv && av === bv) score += 8;
      else if (typeof av === "string" && typeof bv === "string" && areRelated(q.id, av, bv)) score += 4;
      // personality complementarity bonus
      if (q.id === "personality" && av && bv && av !== bv) {
        const pair = [String(av), String(bv)].sort().join("+");
        if (pair === "extrovert+introvert" || pair.includes("ambivert")) score += 5;
        maxScore += 5;
      }
    } else if (q.type === "multi_choice") {
      maxScore += 22;
      const A = Array.isArray(av) ? (av as string[]) : [];
      const B = Array.isArray(bv) ? (bv as string[]) : [];
      let shared = 0;
      let related = 0;
      for (const x of A) {
        if (B.includes(x)) {
          shared++;
        } else if (B.some(y => areRelated(q.id, x, y))) {
          related++;
        }
      }
      score += Math.min(22, shared * 4 + related * 2);
    }
  }

  if (maxScore === 0) return 0;
  return Math.round((score / maxScore) * 100);
}

export const AGE_BUCKETS: { label: string; min: number; max: number }[] = [
  { label: "18-23", min: 18, max: 23 },
  { label: "24-29", min: 24, max: 29 },
  { label: "30-35", min: 30, max: 35 },
  { label: "36-40", min: 36, max: 40 },
  { label: "41-46", min: 41, max: 46 },
  { label: "+46", min: 47, max: 200 },
];

export function ageBucketFromBirthDate(birthDate: string): string {
  const b = new Date(birthDate);
  if (isNaN(b.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - b.getFullYear();
  const m = today.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--;
  return AGE_BUCKETS.find((r) => age >= r.min && age <= r.max)?.label || "";
}
