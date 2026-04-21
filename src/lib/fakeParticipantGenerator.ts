// Helper to generate synthetic participants for test events.

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
