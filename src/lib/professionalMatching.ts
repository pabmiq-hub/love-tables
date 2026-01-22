/**
 * Professional Matching Algorithm
 * Calculates compatibility scores between Clients and Providers
 * for B2B Networking events
 */

export interface ProfessionalProfile {
  id: string;
  name: string;
  company_name?: string | null;
  entity_type?: "client" | "provider" | null;
  sector?: string | null;
  company_size?: string | null;
  needs?: string[] | null;
  solutions?: string[] | null;
  business_interests?: string[] | null;
}

export interface MatchReason {
  type: "sector" | "need_solution" | "company_size" | "mutual_interest";
  description: string;
  points: number;
}

export interface ProfessionalMatchResult {
  clientId: string;
  clientName: string;
  providerId: string;
  providerName: string;
  score: number;
  maxPossibleScore: number;
  matchReasons: MatchReason[];
  compatibility: "high" | "medium" | "low";
}

// Scoring weights
const SCORING = {
  SECTOR_MATCH: 30,
  NEED_SOLUTION_MATCH: 20, // per match
  COMPANY_SIZE_COMPATIBLE: 10,
  MUTUAL_INTEREST: 15, // per shared interest
  MAX_NEED_SOLUTION_MATCHES: 3,
  MAX_MUTUAL_INTERESTS: 2,
} as const;

/**
 * Calculate compatibility score between a client and provider
 */
export function calculateMatchScore(
  client: ProfessionalProfile,
  provider: ProfessionalProfile
): ProfessionalMatchResult {
  const matchReasons: MatchReason[] = [];
  let score = 0;

  // 1. Sector match (+30 points)
  if (client.sector && provider.sector && 
      client.sector.toLowerCase() === provider.sector.toLowerCase()) {
    score += SCORING.SECTOR_MATCH;
    matchReasons.push({
      type: "sector",
      description: `Mismo sector: ${client.sector}`,
      points: SCORING.SECTOR_MATCH,
    });
  }

  // 2. Need-Solution matching (+20 points per match, max 3)
  const clientNeeds = (client.needs || []).map(n => n.toLowerCase().trim());
  const providerSolutions = (provider.solutions || []).map(s => s.toLowerCase().trim());

  let needSolutionMatches = 0;
  for (const need of clientNeeds) {
    if (needSolutionMatches >= SCORING.MAX_NEED_SOLUTION_MATCHES) break;
    
    // Look for partial matches in solutions
    const matchingSolution = providerSolutions.find(sol => 
      sol.includes(need) || need.includes(sol) ||
      calculateSimilarity(need, sol) > 0.6
    );

    if (matchingSolution) {
      score += SCORING.NEED_SOLUTION_MATCH;
      matchReasons.push({
        type: "need_solution",
        description: `Necesidad "${need}" cubierta por solución del proveedor`,
        points: SCORING.NEED_SOLUTION_MATCH,
      });
      needSolutionMatches++;
    }
  }

  // 3. Company size compatibility (+10 points)
  if (client.company_size && provider.company_size) {
    const sizeCompatibility = checkSizeCompatibility(client.company_size, provider.company_size);
    if (sizeCompatibility) {
      score += SCORING.COMPANY_SIZE_COMPATIBLE;
      matchReasons.push({
        type: "company_size",
        description: `Tamaños de empresa compatibles`,
        points: SCORING.COMPANY_SIZE_COMPATIBLE,
      });
    }
  }

  // 4. Mutual business interests (+15 points per shared interest, max 2)
  const clientInterests = (client.business_interests || []).map(i => i.toLowerCase().trim());
  const providerInterests = (provider.business_interests || []).map(i => i.toLowerCase().trim());

  let mutualInterests = 0;
  for (const interest of clientInterests) {
    if (mutualInterests >= SCORING.MAX_MUTUAL_INTERESTS) break;
    
    if (providerInterests.some(pi => pi.includes(interest) || interest.includes(pi))) {
      score += SCORING.MUTUAL_INTEREST;
      matchReasons.push({
        type: "mutual_interest",
        description: `Interés mutuo: ${interest}`,
        points: SCORING.MUTUAL_INTEREST,
      });
      mutualInterests++;
    }
  }

  // Calculate max possible score
  const maxPossibleScore = 
    SCORING.SECTOR_MATCH + 
    (SCORING.NEED_SOLUTION_MATCH * SCORING.MAX_NEED_SOLUTION_MATCHES) +
    SCORING.COMPANY_SIZE_COMPATIBLE +
    (SCORING.MUTUAL_INTEREST * SCORING.MAX_MUTUAL_INTERESTS);

  // Determine compatibility level
  const percentage = (score / maxPossibleScore) * 100;
  let compatibility: "high" | "medium" | "low";
  if (percentage >= 60) compatibility = "high";
  else if (percentage >= 30) compatibility = "medium";
  else compatibility = "low";

  return {
    clientId: client.id,
    clientName: client.name,
    providerId: provider.id,
    providerName: provider.name,
    score,
    maxPossibleScore,
    matchReasons,
    compatibility,
  };
}

/**
 * Calculate all possible matches for a set of participants
 * Returns sorted by score (highest first)
 */
export function calculateAllMatches(
  participants: ProfessionalProfile[]
): ProfessionalMatchResult[] {
  const clients = participants.filter(p => p.entity_type === "client");
  const providers = participants.filter(p => p.entity_type === "provider");

  const allMatches: ProfessionalMatchResult[] = [];

  for (const client of clients) {
    for (const provider of providers) {
      const match = calculateMatchScore(client, provider);
      allMatches.push(match);
    }
  }

  // Sort by score descending
  return allMatches.sort((a, b) => b.score - a.score);
}

/**
 * Get optimal pairings using a greedy algorithm
 * Each participant is matched with their best available partner
 */
export function getOptimalPairings(
  participants: ProfessionalProfile[]
): ProfessionalMatchResult[] {
  const allMatches = calculateAllMatches(participants);
  const usedClients = new Set<string>();
  const usedProviders = new Set<string>();
  const pairings: ProfessionalMatchResult[] = [];

  for (const match of allMatches) {
    if (!usedClients.has(match.clientId) && !usedProviders.has(match.providerId)) {
      pairings.push(match);
      usedClients.add(match.clientId);
      usedProviders.add(match.providerId);
    }
  }

  return pairings;
}

/**
 * Check if company sizes are compatible for business
 * Generally, similar sizes or one step different are compatible
 */
function checkSizeCompatibility(clientSize: string, providerSize: string): boolean {
  const sizeOrder = [
    "1-10",
    "11-50", 
    "51-200",
    "201-500",
    "501-1000",
    "1000+",
    "Startup",
    "PYME",
    "Gran empresa",
    "Multinacional",
  ];

  const clientIndex = sizeOrder.findIndex(s => 
    clientSize.toLowerCase().includes(s.toLowerCase()) ||
    s.toLowerCase().includes(clientSize.toLowerCase())
  );
  const providerIndex = sizeOrder.findIndex(s => 
    providerSize.toLowerCase().includes(s.toLowerCase()) ||
    s.toLowerCase().includes(providerSize.toLowerCase())
  );

  // If we can't determine order, assume compatible
  if (clientIndex === -1 || providerIndex === -1) return true;

  // Compatible if within 2 steps
  return Math.abs(clientIndex - providerIndex) <= 2;
}

/**
 * Calculate string similarity using Levenshtein distance
 */
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

/**
 * Format match result for display
 */
export function formatMatchForDisplay(match: ProfessionalMatchResult): string {
  const lines = [
    `${match.clientName} (Cliente) ↔ ${match.providerName} (Proveedor)`,
    `Compatibilidad: ${match.compatibility.toUpperCase()} (${match.score}/${match.maxPossibleScore} pts)`,
  ];

  if (match.matchReasons.length > 0) {
    lines.push("Razones:");
    match.matchReasons.forEach(reason => {
      lines.push(`  • ${reason.description} (+${reason.points}pts)`);
    });
  }

  return lines.join("\n");
}
