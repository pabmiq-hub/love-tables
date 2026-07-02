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
 * Compute 0–100 compatibility between two wrapped answer sets.
 * Uses stable option keys, not translated labels.
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
      maxScore += 55; // 25 + 15 + 10 + up to 5 extra
      const ar = (av || {}) as any;
      const br = (bv || {}) as any;
      if (ar.top1 && ar.top1 === br.top1) score += 25;
      if (ar.top2 && ar.top2 === br.top2) score += 15;
      if (ar.top3 && ar.top3 === br.top3) score += 10;
      // bonus for shared in any order
      const setA = new Set([ar.top1, ar.top2, ar.top3].filter(Boolean));
      const setB = new Set([br.top1, br.top2, br.top3].filter(Boolean));
      let overlap = 0;
      for (const v of setA) if (setB.has(v)) overlap++;
      // subtract exact matches already counted
      const exact =
        (ar.top1 && ar.top1 === br.top1 ? 1 : 0) +
        (ar.top2 && ar.top2 === br.top2 ? 1 : 0) +
        (ar.top3 && ar.top3 === br.top3 ? 1 : 0);
      score += Math.min(5, (overlap - exact) * 3);
    } else if (q.type === "single_choice" || q.type === "yes_no") {
      maxScore += 8;
      if (av && bv && av === bv) score += 8;
      // personality complementarity bonus
      if (q.id === "personality" && av && bv && av !== bv) {
        const pair = [String(av), String(bv)].sort().join("+");
        if (pair === "extrovert+introvert" || pair.includes("ambivert")) score += 5;
        maxScore += 5;
      }
    } else if (q.type === "multi_choice") {
      maxScore += 20;
      const A = Array.isArray(av) ? (av as string[]) : [];
      const B = Array.isArray(bv) ? (bv as string[]) : [];
      let shared = 0;
      for (const x of A) if (B.includes(x)) shared++;
      score += Math.min(20, shared * 4);
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
