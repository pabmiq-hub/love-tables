/**
 * Shared normalization utilities for analytics.
 * Consolidates bilingual (ES/EN) and legacy label variants into canonical Spanish labels.
 */

// ==================== PREFERENCE NORMALIZATION ====================

const PREF_NORMALIZE: Record<string, string> = {
  // Solo amistad variants
  "amistad": "Solo amistad",
  "friendship": "Solo amistad",
  "solo amistad": "Solo amistad",
  "friendship only": "Solo amistad",
  "nuevas amistades": "Solo amistad",
  "nuevas amistades.": "Solo amistad",
  // Amistad y Ligue variants
  "amistad y ligue": "Amistad y Ligue",
  "friendship and dating": "Amistad y Ligue",
  "friendship & dating": "Amistad y Ligue",
  "nuevas amistades y también pareja sentimental": "Amistad y Ligue",
  "nuevas amistades y también pareja sentimental.": "Amistad y Ligue",
  "nuevas amistades y tambien pareja sentimental": "Amistad y Ligue",
  // Solo ligue/dating variants
  "ligue": "Solo ligue",
  "dating": "Solo ligue",
  "dating only": "Solo ligue",
  "pareja sentimental": "Solo ligue",
  "pareja sentimental.": "Solo ligue",
};

/**
 * Normalize a connection preference value to a canonical Spanish label.
 * If null/undefined or not recognized AND `treatUnknownAsFriendship` is true,
 * returns "Solo amistad" (logic: if they didn't choose dating, they want friendship).
 */
export function normalizePreference(p: string | null | undefined, treatUnknownAsFriendship = false): string {
  if (!p) return treatUnknownAsFriendship ? "Solo amistad" : "Sin especificar";
  const normalized = PREF_NORMALIZE[p.toLowerCase().trim()];
  if (normalized) return normalized;
  // If the value is not in the map, check if it's unknown
  if (treatUnknownAsFriendship) return "Solo amistad";
  return p;
}

// ==================== GENDER NORMALIZATION ====================

const GENDER_NORMALIZE: Record<string, string> = {
  man: "Hombre", hombre: "Hombre",
  woman: "Mujer", mujer: "Mujer",
  "non-binary": "No binario", "no binario": "No binario",
  otro: "Otro", other: "Otro",
  "prefiero no decirlo": "Prefiero no decirlo",
  "prefer not to say": "Prefiero no decirlo",
};

export function normalizeGender(g: string | null | undefined): string {
  if (!g) return "Sin especificar";
  return GENDER_NORMALIZE[g.toLowerCase().trim()] || g;
}

// ==================== DATING ORIENTATION NORMALIZATION ====================

const DATING_ORIENTATION_NORMALIZE: Record<string, string> = {
  // Man looking for woman
  "soy un hombre y busco una mujer": "Soy un hombre y busco una mujer",
  "i'm a man looking for a woman": "Soy un hombre y busco una mujer",
  "i am a man looking for a woman": "Soy un hombre y busco una mujer",
  // Woman looking for man
  "soy una mujer y busco un hombre": "Soy una mujer y busco un hombre",
  "i'm a woman looking for a man": "Soy una mujer y busco un hombre",
  "i am a woman looking for a man": "Soy una mujer y busco un hombre",
  // Man looking for man
  "soy un hombre y busco un hombre": "Soy un hombre y busco un hombre",
  "i'm a man looking for a man": "Soy un hombre y busco un hombre",
  "i am a man looking for a man": "Soy un hombre y busco un hombre",
  // Woman looking for woman
  "soy una mujer y busco una mujer": "Soy una mujer y busco una mujer",
  "i'm a woman looking for a woman": "Soy una mujer y busco una mujer",
  "i am a woman looking for a woman": "Soy una mujer y busco una mujer",
  // Open to all
  "estoy abierto a todo": "Estoy abierto/a a todo",
  "estoy abierta a todo": "Estoy abierto/a a todo",
  "i'm open to all": "Estoy abierto/a a todo",
  "i am open to all": "Estoy abierto/a a todo",
  // Prefer not to say
  "prefiero no decirlo": "Prefiero no contestar",
  "prefer not to say": "Prefiero no contestar",
  "prefiero no contestar": "Prefiero no contestar",
};

export function normalizeDatingOrientation(d: string | null | undefined): string | null {
  if (!d || d === "none" || d === "no") return null;
  return DATING_ORIENTATION_NORMALIZE[d.toLowerCase().trim()] || d;
}

// ==================== COLORS ====================

export const PREF_COLORS: Record<string, string> = {
  "Solo amistad": "hsl(210, 70%, 50%)",
  "Amistad y Ligue": "hsl(262, 60%, 55%)",
  "Solo ligue": "hsl(346, 77%, 50%)",
  "Sin especificar": "hsl(240, 5%, 55%)",
};

export const GENDER_COLORS: Record<string, string> = {
  Hombre: "hsl(210, 70%, 50%)",
  Mujer: "hsl(346, 77%, 50%)",
  "No binario": "hsl(262, 60%, 55%)",
  "Prefiero no decirlo": "hsl(240, 5%, 55%)",
  Otro: "hsl(240, 5%, 55%)",
  "Sin especificar": "hsl(240, 5%, 55%)",
};
