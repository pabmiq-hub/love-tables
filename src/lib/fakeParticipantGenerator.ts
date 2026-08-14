// Helper to generate synthetic participants for test events.
import {
  DEFAULT_WRAPPED_QUESTIONS,
  type WrappedAnswers,
  type WrappedQuestion,
} from "./wrappedQuestions";
import {
  DEFAULT_SOCIAL_GAME_QUESTIONS,
  type SocialGameAnswers,
  type SocialGameQuestion,
} from "./socialGame";

export interface FakeGenConfig {
  count: number;
  malePct: number; // 0-100
  femalePct: number; // remaining = non-binary
  language: "es" | "en";
  prefix: string; // e.g. "[TEST] "
  redirectEmail: string | null; // if set, use this email for all
  disableEmails: boolean;
  ageRanges: string[]; // available age ranges from event preferences
  preferences: string[]; // available preferences (Solo amistad, Amistad y Ligue, Solo ligue)
  datingPreferences: string[];
  // professional only
  isProfessional?: boolean;
  sectors?: string[];
  companySizes?: string[];
  predefinedNeeds?: string[];
  predefinedSolutions?: string[];
  // Wrapped submode + social game (social events): fake participants answer the full form
  wrappedQuestions?: WrappedQuestion[];
  socialGameQuestions?: SocialGameQuestion[];
  availableLanguages?: string[];
}

export const DEFAULT_FAKE_CONFIG: Omit<FakeGenConfig, "count" | "ageRanges" | "preferences" | "datingPreferences"> = {
  malePct: 50,
  femalePct: 50,
  language: "es",
  prefix: "[TEST] ",
  redirectEmail: null,
  disableEmails: true,
};

const FIRST_NAMES_ES = {
  M: ["Carlos", "Javier", "Miguel", "David", "Daniel", "Pablo", "Álvaro", "Sergio", "Adrián", "Jorge", "Rubén", "Iván", "Marcos", "Luis", "Diego"],
  F: ["María", "Lucía", "Sofía", "Marta", "Laura", "Carmen", "Ana", "Elena", "Sara", "Paula", "Cristina", "Andrea", "Beatriz", "Raquel", "Claudia"],
  X: ["Alex", "Sam", "Robin", "Noa", "Lou"],
};

const FIRST_NAMES_EN = {
  M: ["James", "John", "Michael", "David", "Daniel", "Chris", "Matthew", "Andrew", "Joseph", "Ryan", "Brian", "Kevin", "Mark", "Paul", "Steven"],
  F: ["Mary", "Patricia", "Jennifer", "Linda", "Elizabeth", "Susan", "Jessica", "Sarah", "Karen", "Nancy", "Lisa", "Margaret", "Sandra", "Ashley", "Emily"],
  X: ["Alex", "Sam", "Jordan", "Taylor", "Casey"],
};

const LAST_INITIALS = ["G.", "M.", "L.", "P.", "R.", "S.", "T.", "V.", "C.", "B.", "F.", "H.", "J.", "K.", "N."];

const COMPANY_PREFIXES = ["Tech", "Soft", "Data", "Cloud", "Smart", "Next", "Bright", "Quick", "Pro", "Global"];
const COMPANY_SUFFIXES = ["Solutions", "Systems", "Labs", "Group", "Hub", "Works", "Studio", "Partners", "Co", "Tech"];

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function pickMany<T>(arr: T[], n: number, rng: () => number): T[] {
  if (arr.length === 0) return [];
  const shuffled = [...arr].sort(() => rng() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

// Simple seeded RNG so generation is reproducible per session if needed
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface GeneratedFakeParticipant {
  id: string;
  name: string;
  email: string;
  phone: string;
  gender: string;
  age: number;
  ageRange: string;
  preferredAgeRange: string;
  preference: string;
  datingPreference: string;
  birthDate: string;
  // Professional
  companyName?: string;
  entityType?: "client" | "provider";
  sector?: string;
  companySize?: string;
  needs?: string[];
  solutions?: string[];
  // Wrapped submode + social game
  wrappedAnswers?: WrappedAnswers;
  gameAnswers?: SocialGameAnswers;
  spokenLanguages?: string[];
}


// ---- Wrapped submode + social game synthetic answers ----

function fakeWrappedAnswers(
  questions: WrappedQuestion[],
  rng: () => number
): WrappedAnswers {
  const answers: WrappedAnswers = {};
  for (const q of questions) {
    const keys = q.options_key && q.options_key.length > 0
      ? q.options_key
      : (q.i18n?.es?.options || []).map((_, i) => String(i));

    if (q.type === "yes_no") {
      answers[q.id] = rng() > 0.5 ? "yes" : "no";
    } else if (q.type === "single_choice") {
      if (keys.length > 0) answers[q.id] = pick(keys, rng);
    } else if (q.type === "multi_choice") {
      const n = 1 + Math.floor(rng() * Math.min(3, Math.max(1, keys.length)));
      answers[q.id] = pickMany(keys, n, rng);
    } else if (q.type === "ranked_top3") {
      const top = pickMany(keys, 3, rng);
      answers[q.id] = { top1: top[0], top2: top[1], top3: top[2] };
    }
  }
  return answers;
}

const GAME_ANSWERS_POOL: Record<string, { es: string[]; en: string[] }> = {
  profession: {
    es: ["Diseñadora gráfica", "Profesor de instituto", "Enfermero", "Desarrolladora web", "Arquitecta", "Comercial", "Fisioterapeuta"],
    en: ["Graphic designer", "High school teacher", "Nurse", "Web developer", "Architect", "Sales rep", "Physiotherapist"],
  },
  fun_fact: {
    es: ["He dormido en un iglú", "Sé silbar con los dedos", "He corrido dos maratones", "Toco la trompeta desde los 8 años", "Nunca he visto Titanic"],
    en: ["I slept in an igloo once", "I can whistle with my fingers", "I ran two marathons", "I've played trumpet since I was 8", "I've never seen Titanic"],
  },
  useless_talent: {
    es: ["Recito el abecedario al revés", "Muevo las orejas", "Adivino canciones en 2 segundos", "Hago malabares con naranjas", "Doblo la lengua en tres"],
    en: ["I recite the alphabet backwards", "I can wiggle my ears", "I name songs in 2 seconds", "I juggle oranges", "I can fold my tongue in three"],
  },
  movie_genre: {
    es: ["Comedia romántica", "Documental de naturaleza", "Thriller nórdico", "Comedia absurda", "Aventura de sobremesa"],
    en: ["Romantic comedy", "Nature documentary", "Nordic thriller", "Absurd comedy", "Afternoon adventure"],
  },
  guilty_pleasure: {
    es: ["Los realities de citas", "Cantar reggaetón en la ducha", "La pizza con piña", "Las novelas de vampiros", "Los vídeos de gatos"],
    en: ["Dating reality shows", "Singing reggaeton in the shower", "Pineapple pizza", "Vampire novels", "Cat videos"],
  },
};

const GENERIC_GAME_ANSWERS = {
  es: ["Una respuesta muy típica mía", "Depende del día, pero suele ser sí", "Nada que pueda contar aquí", "Me lo preguntan mucho", "Prefiero sorprender en persona"],
  en: ["A very me kind of answer", "Depends on the day, usually yes", "Nothing I can share here", "People ask me this a lot", "I'd rather surprise you in person"],
};

function fakeGameAnswers(
  questions: SocialGameQuestion[],
  lang: "es" | "en",
  rng: () => number
): SocialGameAnswers {
  const answers: SocialGameAnswers = {};
  for (const q of questions) {
    const pool = GAME_ANSWERS_POOL[q.id]?.[lang] || GENERIC_GAME_ANSWERS[lang];
    answers[q.id] = pick(pool, rng);
  }
  return answers;
}

export function generateFakeParticipants(
  config: FakeGenConfig
): GeneratedFakeParticipant[] {
  const rng = mulberry32(Date.now() & 0xffffffff);
  const result: GeneratedFakeParticipant[] = [];

  const names =
    config.language === "en" ? FIRST_NAMES_EN : FIRST_NAMES_ES;

  const malePct = Math.max(0, Math.min(100, config.malePct));
  const femalePct = Math.max(0, Math.min(100 - malePct, config.femalePct));
  const nbPct = 100 - malePct - femalePct;

  const maleCount = Math.round((malePct / 100) * config.count);
  const femaleCount = Math.round((femalePct / 100) * config.count);
  const nbCount = config.count - maleCount - femaleCount;

  const allocations: Array<"M" | "F" | "X"> = [
    ...Array(maleCount).fill("M"),
    ...Array(femaleCount).fill("F"),
    ...Array(Math.max(0, nbCount)).fill("X"),
  ];

  for (let i = 0; i < config.count; i++) {
    const g = allocations[i] ?? "X";
    const first = pick(names[g], rng);
    const last = pick(LAST_INITIALS, rng);
    const id = `fake-${Date.now().toString(36)}-${i}-${Math.floor(rng() * 1e6).toString(36)}`;
    const age = 20 + Math.floor(rng() * 30); // 20-49
    const ageRange = config.ageRanges.length > 0 ? pick(config.ageRanges, rng) : "25-32";
    const preferredAgeRange = config.ageRanges.length > 0 ? pick(config.ageRanges, rng) : ageRange;
    const preference = config.preferences.length > 0 ? pick(config.preferences, rng) : "Solo amistad";
    const datingPreference =
      config.datingPreferences.length > 0
        ? pick(config.datingPreferences, rng)
        : "";

    const genderLabel =
      g === "M"
        ? config.language === "en"
          ? "Male"
          : "Hombre"
        : g === "F"
        ? config.language === "en"
          ? "Female"
          : "Mujer"
        : config.language === "en"
        ? "Non-binary"
        : "No binario";

    // Birth date around the chosen age
    const today = new Date();
    const year = today.getFullYear() - age;
    const month = Math.floor(rng() * 12) + 1;
    const day = Math.floor(rng() * 28) + 1;
    const birthDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    const email = config.redirectEmail
      ? config.redirectEmail
      : `test+${id}@konektum.test`;
    const phone = `+34600${String(Math.floor(rng() * 1000000)).padStart(6, "0")}`;

    const participant: GeneratedFakeParticipant = {
      id,
      name: `${config.prefix}${first} ${last}`,
      email,
      phone,
      gender: genderLabel,
      age,
      ageRange,
      preferredAgeRange,
      preference,
      datingPreference,
      birthDate,
    };

    if (!config.isProfessional) {
      participant.wrappedAnswers = fakeWrappedAnswers(
        config.wrappedQuestions && config.wrappedQuestions.length > 0
          ? config.wrappedQuestions
          : DEFAULT_WRAPPED_QUESTIONS,
        rng
      );
      participant.gameAnswers = fakeGameAnswers(
        config.socialGameQuestions && config.socialGameQuestions.length > 0
          ? config.socialGameQuestions
          : DEFAULT_SOCIAL_GAME_QUESTIONS,
        config.language,
        rng
      );
      const langs = config.availableLanguages && config.availableLanguages.length > 0
        ? config.availableLanguages
        : ["es", "ca", "en"];
      participant.spokenLanguages = pickMany(langs, 1 + Math.floor(rng() * Math.min(2, langs.length)), rng);
    }

    if (config.isProfessional) {
      const companyName = `${pick(COMPANY_PREFIXES, rng)}${pick(COMPANY_SUFFIXES, rng)}`;
      const entityType: "client" | "provider" = rng() > 0.5 ? "client" : "provider";
      const sector =
        config.sectors && config.sectors.length > 0 ? pick(config.sectors, rng) : "Tecnología";
      const companySize =
        config.companySizes && config.companySizes.length > 0
          ? pick(config.companySizes, rng)
          : "PYME";
      const needs =
        entityType === "client" && config.predefinedNeeds && config.predefinedNeeds.length > 0
          ? pickMany(config.predefinedNeeds, 1 + Math.floor(rng() * 3), rng)
          : [];
      const solutions =
        entityType === "provider" && config.predefinedSolutions && config.predefinedSolutions.length > 0
          ? pickMany(config.predefinedSolutions, 1 + Math.floor(rng() * 3), rng)
          : [];

      participant.companyName = `${config.prefix}${companyName}`;
      participant.entityType = entityType;
      participant.sector = sector;
      participant.companySize = companySize;
      participant.needs = needs;
      participant.solutions = solutions;
    }

    result.push(participant);
  }

  return result;
}
