import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users, Heart, Percent, Send, Inbox, PartyPopper, Calendar,
  Handshake, TrendingUp, Zap, Star, BarChart3, Eye, HeartHandshake,
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import type { AnalyticsData, ParticipantRecord, SelectionRecord } from "@/pages/AdminDashboard";
import {
  normalizeGender,
  normalizePreference,
  normalizeDatingOrientation,
  PREF_COLORS as SHARED_PREF_COLORS,
  GENDER_COLORS,
} from "@/lib/analyticsNormalization";

// ==================== CONSTANTS ====================

const AGE_COLORS = [
  "hsl(346, 77%, 50%)", "hsl(25, 95%, 53%)", "hsl(210, 70%, 50%)",
  "hsl(262, 60%, 55%)", "hsl(142, 76%, 36%)", "hsl(320, 70%, 45%)",
];

const AGE_ORDER = ["18-24", "25-29", "30-34", "35-39", "40-49", "50+"];

const MATCH_TYPE_COLORS = {
  friendship: "hsl(210, 70%, 50%)",
  dating: "hsl(346, 77%, 50%)",
  both: "hsl(262, 60%, 55%)",
};

const tooltipStyle = { borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" };

// ==================== HELPERS ====================

function calcAge(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const diff = Date.now() - new Date(birthDate).getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

function ageToRange(age: number): string {
  if (age < 25) return "18-24";
  if (age < 30) return "25-29";
  if (age < 35) return "30-34";
  if (age < 40) return "35-39";
  if (age < 50) return "40-49";
  return "50+";
}

// ==================== KPI CARD ====================

function KpiCard({ icon: Icon, value, label, color, subtitle }: {
  icon: React.ElementType; value: string | number; label: string; color: string; subtitle?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center shrink-0">
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
          {subtitle && <p className="text-xs text-muted-foreground/70">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== TYPES ====================

interface SocialAnalyticsTabProps {
  data: AnalyticsData;
}

export function SocialAnalyticsTab({ data }: SocialAnalyticsTabProps) {
  const { events, participants, selections } = data;

  // ========== Filtered subsets ==========
  const socialEvents = useMemo(() => events.filter(e => (e.module || "social") === "social" || e.module === "dating"), [events]);
  const socialEventIds = useMemo(() => new Set(socialEvents.map(e => e.id)), [socialEvents]);
  const socialParticipants = useMemo(() => participants.filter(p => socialEventIds.has(p.event_id)), [participants, socialEventIds]);
  const socialSelections = useMemo(() => selections.filter(s => socialEventIds.has(s.event_id)), [selections, socialEventIds]);

  // ========== Deduplicated unique participants ==========
  const uniqueParticipants = useMemo(() => {
    const seen = new Map<string, ParticipantRecord>();
    socialParticipants.forEach(p => {
      const key = p.global_participant_id || p.id;
      if (!seen.has(key)) seen.set(key, p);
    });
    return seen;
  }, [socialParticipants]);

  // ========== 1. MATCH TYPE BREAKDOWN ==========
  const matchBreakdown = useMemo(() => {
    const selMap = new Map<string, Set<string>>();
    socialSelections.forEach(s => {
      const key = `${s.selector_id}->${s.selected_id}`;
      if (!selMap.has(key)) selMap.set(key, new Set());
      if (s.selection_type) selMap.get(key)!.add(s.selection_type);
    });

    let friendshipOnly = 0, datingOnly = 0, both = 0, total = 0;
    const counted = new Set<string>();

    socialSelections.forEach(s => {
      const pairKey = [s.selector_id, s.selected_id].sort().join(":");
      if (counted.has(pairKey)) return;
      const forward = `${s.selector_id}->${s.selected_id}`;
      const reverse = `${s.selected_id}->${s.selector_id}`;
      if (!selMap.has(reverse)) return;

      counted.add(pairKey);
      total++;

      const forwardTypes = selMap.get(forward)!;
      const reverseTypes = selMap.get(reverse)!;
      const allTypes = new Set([...forwardTypes, ...reverseTypes]);
      const hasFriendship = allTypes.has("friendship");
      const hasDating = allTypes.has("dating");

      if (hasFriendship && hasDating) both++;
      else if (hasDating) datingOnly++;
      else friendshipOnly++;
    });

    const chartData = [
      { name: "Solo amistad", value: friendshipOnly, fill: MATCH_TYPE_COLORS.friendship },
      { name: "Solo romance", value: datingOnly, fill: MATCH_TYPE_COLORS.dating },
      { name: "Amistad + Romance", value: both, fill: MATCH_TYPE_COLORS.both },
    ].filter(d => d.value > 0);

    return { friendshipOnly, datingOnly, both, total, chartData };
  }, [socialSelections]);

  // ========== 2. GENDER RECIPROCITY ==========
  const genderReciprocity = useMemo(() => {
    const participantGender = new Map<string, string>();
    socialParticipants.forEach(p => {
      const g = normalizeGender(p.gender);
      if (g !== "Sin especificar") participantGender.set(p.id, g);
    });

    const sentByGender: Record<string, number> = {};
    const receivedByGender: Record<string, number> = {};
    socialSelections.forEach(s => {
      const senderGender = participantGender.get(s.selector_id);
      const receiverGender = participantGender.get(s.selected_id);
      if (senderGender) sentByGender[senderGender] = (sentByGender[senderGender] || 0) + 1;
      if (receiverGender) receivedByGender[receiverGender] = (receivedByGender[receiverGender] || 0) + 1;
    });

    // Mutual match rate by gender
    const selSet = new Set(socialSelections.map(s => `${s.selector_id}->${s.selected_id}`));
    const matchesByGender: Record<string, { matches: number; totalSent: number }> = {};
    const counted = new Set<string>();

    socialSelections.forEach(s => {
      const senderGender = participantGender.get(s.selector_id);
      if (!senderGender) return;
      if (!matchesByGender[senderGender]) matchesByGender[senderGender] = { matches: 0, totalSent: 0 };
      matchesByGender[senderGender].totalSent++;

      const reverse = `${s.selected_id}->${s.selector_id}`;
      const pairKey = [s.selector_id, s.selected_id].sort().join(":");
      if (selSet.has(reverse) && !counted.has(pairKey)) {
        counted.add(pairKey);
        matchesByGender[senderGender].matches++;
        const receiverGender = participantGender.get(s.selected_id);
        if (receiverGender && receiverGender !== senderGender) {
          if (!matchesByGender[receiverGender]) matchesByGender[receiverGender] = { matches: 0, totalSent: 0 };
          matchesByGender[receiverGender].matches++;
        }
      }
    });

    const chartData = Object.entries(sentByGender).map(([gender, sent]) => ({
      name: gender,
      enviadas: sent,
      recibidas: receivedByGender[gender] || 0,
      fill: GENDER_COLORS[gender] || GENDER_COLORS.Otro,
    }));

    return { chartData, matchesByGender };
  }, [socialParticipants, socialSelections]);

  // ========== 3. AGE COMPATIBILITY HEATMAP ==========
  const ageHeatmap = useMemo(() => {
    const participantAge = new Map<string, string>();
    socialParticipants.forEach(p => {
      const age = calcAge(p.birth_date);
      if (age !== null && age >= 16) participantAge.set(p.id, ageToRange(age));
    });

    const selSet = new Set(socialSelections.map(s => `${s.selector_id}->${s.selected_id}`));
    const heatData: Record<string, Record<string, number>> = {};
    const counted = new Set<string>();

    AGE_ORDER.forEach(r => { heatData[r] = {}; AGE_ORDER.forEach(c => heatData[r][c] = 0); });

    socialSelections.forEach(s => {
      const reverse = `${s.selected_id}->${s.selector_id}`;
      const pairKey = [s.selector_id, s.selected_id].sort().join(":");
      if (!selSet.has(reverse) || counted.has(pairKey)) return;
      counted.add(pairKey);

      const age1 = participantAge.get(s.selector_id);
      const age2 = participantAge.get(s.selected_id);
      if (age1 && age2) {
        heatData[age1][age2]++;
        if (age1 !== age2) heatData[age2][age1]++;
      }
    });

    let maxVal = 0;
    AGE_ORDER.forEach(r => AGE_ORDER.forEach(c => { if (heatData[r][c] > maxVal) maxVal = heatData[r][c]; }));

    return { heatData, maxVal };
  }, [socialParticipants, socialSelections]);

  // ========== 4. ROUND ENGAGEMENT ==========
  const roundEngagement = useMemo(() => {
    // Build map: participantId -> Set of round numbers they had assignments in
    const participantRounds = new Map<string, Set<number>>();

    socialEvents.forEach(event => {
      const tables = event.tables as any;
      if (!tables || !Array.isArray(tables)) return;

      tables.forEach((roundData: any) => {
        const roundNumber = roundData.round;
        const roundTables = roundData.tables;
        if (!roundTables || !Array.isArray(roundTables)) return;

        roundTables.forEach((table: any[]) => {
          if (!Array.isArray(table)) return;
          table.forEach((p: any) => {
            if (!participantRounds.has(p.id)) participantRounds.set(p.id, new Set());
            participantRounds.get(p.id)!.add(roundNumber);
          });
        });
      });
    });

    // For each match pair, find which round(s) they shared a table
    const selSet = new Set(socialSelections.map(s => `${s.selector_id}->${s.selected_id}`));
    const matchesByRound: Record<number, number> = {};
    const selectionsByRound: Record<number, number> = {};
    const counted = new Set<string>();

    // Build participant-to-tablemates-per-round map
    const tableMatesByRound = new Map<string, Map<number, Set<string>>>();

    socialEvents.forEach(event => {
      const tables = event.tables as any;
      if (!tables || !Array.isArray(tables)) return;

      tables.forEach((roundData: any) => {
        const roundNumber = roundData.round;
        const roundTables = roundData.tables;
        if (!roundTables || !Array.isArray(roundTables)) return;

        roundTables.forEach((table: any[]) => {
          if (!Array.isArray(table)) return;
          const ids = table.map((p: any) => p.id);
          ids.forEach((id: string) => {
            if (!tableMatesByRound.has(id)) tableMatesByRound.set(id, new Map());
            if (!tableMatesByRound.get(id)!.has(roundNumber)) tableMatesByRound.get(id)!.set(roundNumber, new Set());
            ids.forEach((mateId: string) => {
              if (mateId !== id) tableMatesByRound.get(id)!.get(roundNumber)!.add(mateId);
            });
          });
        });
      });
    });

    // Count selections and matches per round
    socialSelections.forEach(s => {
      // Find which round this pair shared a table
      const selectorRounds = tableMatesByRound.get(s.selector_id);
      if (!selectorRounds) return;

      for (const [round, mates] of selectorRounds.entries()) {
        if (mates.has(s.selected_id)) {
          selectionsByRound[round] = (selectionsByRound[round] || 0) + 1;

          const reverse = `${s.selected_id}->${s.selector_id}`;
          const pairKey = [s.selector_id, s.selected_id].sort().join(":") + `:R${round}`;
          if (selSet.has(reverse) && !counted.has(pairKey)) {
            counted.add(pairKey);
            matchesByRound[round] = (matchesByRound[round] || 0) + 1;
          }
          break; // Count once per selection
        }
      }
    });

    const maxRound = Math.max(...Object.keys(selectionsByRound).map(Number), ...Object.keys(matchesByRound).map(Number), 0);
    const chartData = Array.from({ length: maxRound }, (_, i) => ({
      name: `Ronda ${i + 1}`,
      selecciones: selectionsByRound[i + 1] || 0,
      matches: matchesByRound[i + 1] || 0,
    }));

    return { chartData };
  }, [socialEvents, socialSelections]);

  // ========== 5. POPULARITY DISTRIBUTION ==========
  const popularity = useMemo(() => {
    const receivedCounts = new Map<string, number>();
    socialSelections.forEach(s => {
      receivedCounts.set(s.selected_id, (receivedCounts.get(s.selected_id) || 0) + 1);
    });

    // Histogram of received selections
    const histogram: Record<number, number> = {};
    let maxReceived = 0;
    let zeroSelections = 0;

    const allSocialParticipantIds = new Set(socialParticipants.map(p => p.id));
    allSocialParticipantIds.forEach(id => {
      const count = receivedCounts.get(id) || 0;
      if (count === 0) zeroSelections++;
      histogram[count] = (histogram[count] || 0) + 1;
      if (count > maxReceived) maxReceived = count;
    });

    const chartData = Array.from({ length: Math.min(maxReceived + 1, 12) }, (_, i) => ({
      name: `${i}`,
      participantes: histogram[i] || 0,
    }));

    // Top 5 most selected (anonymized)
    const top5 = [...receivedCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map((entry, idx) => ({ rank: idx + 1, count: entry[1] }));

    return { chartData, zeroSelections, top5, totalParticipants: allSocialParticipantIds.size };
  }, [socialParticipants, socialSelections]);

  // ========== 6. PREFERENCE VS REALITY ==========
  const preferenceVsReality = useMemo(() => {
    const seekingDating = socialParticipants.filter(p =>
      p.dating_preference && p.dating_preference !== "none" && p.dating_preference !== "no"
    );
    const seekingDatingIds = new Set(seekingDating.map(p => p.id));

    // Find dating matches for those who seek it
    const selMap = new Map<string, Set<string>>();
    socialSelections.forEach(s => {
      const key = `${s.selector_id}->${s.selected_id}`;
      if (!selMap.has(key)) selMap.set(key, new Set());
      if (s.selection_type) selMap.get(key)!.add(s.selection_type);
    });

    let datingMatchCount = 0;
    const whoGotDatingMatch = new Set<string>();
    const counted = new Set<string>();

    socialSelections.forEach(s => {
      if (s.selection_type !== "dating") return;
      const reverse = `${s.selected_id}->${s.selector_id}`;
      const pairKey = [s.selector_id, s.selected_id].sort().join(":");
      if (counted.has(pairKey)) return;

      const reverseTypes = selMap.get(reverse);
      if (reverseTypes?.has("dating")) {
        counted.add(pairKey);
        datingMatchCount++;
        if (seekingDatingIds.has(s.selector_id)) whoGotDatingMatch.add(s.selector_id);
        if (seekingDatingIds.has(s.selected_id)) whoGotDatingMatch.add(s.selected_id);
      }
    });

    const conversionRate = seekingDating.length > 0
      ? Math.round((whoGotDatingMatch.size / seekingDating.length) * 100)
      : 0;

    const chartData = [
      { name: "Buscan romance", value: seekingDating.length, fill: "hsl(346, 77%, 50%)" },
      { name: "Lograron match", value: whoGotDatingMatch.size, fill: "hsl(262, 60%, 55%)" },
    ];

    return {
      seekingCount: seekingDating.length,
      matchedCount: whoGotDatingMatch.size,
      conversionRate,
      datingMatchCount,
      totalParticipants: socialParticipants.length,
      chartData,
    };
  }, [socialParticipants, socialSelections]);

  // ========== 7. CONNECTION INDEX ==========
  const connectionIndex = useMemo(() => {
    const selSet = new Set(socialSelections.map(s => `${s.selector_id}->${s.selected_id}`));
    let socialMatches = 0;
    const counted = new Set<string>();
    socialSelections.forEach(s => {
      const reverse = `${s.selected_id}->${s.selector_id}`;
      const pairKey = [s.selector_id, s.selected_id].sort().join(":");
      if (selSet.has(reverse) && !counted.has(pairKey)) {
        counted.add(pairKey);
        socialMatches++;
      }
    });

    const n = socialParticipants.length;
    const maxPossibleConnections = n > 1 ? (n * (n - 1)) / 2 : 1;
    const score = Math.round((socialMatches / maxPossibleConnections) * 1000) / 10;

    // Per-event scores
    const eventScores = socialEvents.map(event => {
      const eventParticipants = socialParticipants.filter(p => p.event_id === event.id);
      const eventSels = socialSelections.filter(s => s.event_id === event.id);
      const eSelSet = new Set(eventSels.map(s => `${s.selector_id}->${s.selected_id}`));
      let eMatches = 0;
      const eCounted = new Set<string>();
      eventSels.forEach(s => {
        const reverse = `${s.selected_id}->${s.selector_id}`;
        const pairKey = [s.selector_id, s.selected_id].sort().join(":");
        if (eSelSet.has(reverse) && !eCounted.has(pairKey)) {
          eCounted.add(pairKey);
          eMatches++;
        }
      });
      const eN = eventParticipants.length;
      const eMax = eN > 1 ? (eN * (eN - 1)) / 2 : 1;
      return {
        name: event.name.length > 20 ? event.name.substring(0, 20) + "…" : event.name,
        score: Math.round((eMatches / eMax) * 1000) / 10,
        matches: eMatches,
        participants: eN,
      };
    }).sort((a, b) => b.score - a.score);

    return { score, socialMatches, eventScores };
  }, [socialEvents, socialParticipants, socialSelections]);

  // ========== Demographics ==========
  const demographics = useMemo(() => {
    const genderCounts: Record<string, number> = {};
    uniqueParticipants.forEach(p => {
      if (p.gender) {
        const norm = normalizeGender(p.gender);
        genderCounts[norm] = (genderCounts[norm] || 0) + 1;
      }
    });
    const genderData = Object.entries(genderCounts)
      .map(([name, value]) => ({ name, value, fill: GENDER_COLORS[name] || GENDER_COLORS.Otro }))
      .sort((a, b) => b.value - a.value);

    const ageCounts: Record<string, number> = {};
    uniqueParticipants.forEach(p => {
      const age = calcAge(p.birth_date);
      if (age !== null && age >= 16) {
        const range = ageToRange(age);
        ageCounts[range] = (ageCounts[range] || 0) + 1;
      }
    });
    const ageData = Object.entries(ageCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => AGE_ORDER.indexOf(a.name) - AGE_ORDER.indexOf(b.name));

    return { genderData, ageData };
  }, [uniqueParticipants]);

  // ========== PREFERENCE BREAKDOWN ==========
  const preferenceBreakdown = useMemo(() => {
    const PREF_NORMALIZE: Record<string, string> = {
      "amistad": "Solo amistad", "friendship": "Solo amistad", "solo amistad": "Solo amistad", "friendship only": "Solo amistad",
      "amistad y ligue": "Amistad y Ligue", "friendship and dating": "Amistad y Ligue",
      "ligue": "Solo ligue", "dating": "Solo ligue", "dating only": "Solo ligue",
    };
    const normalizePref = (p: string | null): string => {
      if (!p) return "Sin especificar";
      return PREF_NORMALIZE[p.toLowerCase().trim()] || p;
    };

    const overallCounts: Record<string, number> = {};
    const byGender: Record<string, Record<string, number>> = {};

    socialParticipants.forEach(p => {
      const pref = normalizePref(p.preference);
      overallCounts[pref] = (overallCounts[pref] || 0) + 1;
      const gender = p.gender ? normalizeGender(p.gender) : "Sin especificar";
      if (!byGender[gender]) byGender[gender] = {};
      byGender[gender][pref] = (byGender[gender][pref] || 0) + 1;
    });

    const PREF_COLORS: Record<string, string> = {
      "Solo amistad": "hsl(210, 70%, 50%)", "Amistad y Ligue": "hsl(262, 60%, 55%)",
      "Solo ligue": "hsl(346, 77%, 50%)", "Sin especificar": "hsl(240, 5%, 55%)",
    };

    const overallData = Object.entries(overallCounts)
      .map(([name, value]) => ({ name, value, fill: PREF_COLORS[name] || PREF_COLORS["Sin especificar"] }))
      .sort((a, b) => b.value - a.value);

    const prefKeys = [...new Set(socialParticipants.map(p => normalizePref(p.preference)))].sort();
    const genderBarData = Object.entries(byGender)
      .filter(([g]) => g !== "Sin especificar")
      .map(([gender, prefs]) => {
        const genderTotal = Object.values(prefs).reduce((a, b) => a + b, 0);
        const row: Record<string, any> = { name: gender, total: genderTotal };
        prefKeys.forEach(pk => {
          row[pk] = prefs[pk] || 0;
          row[`${pk}_pct`] = genderTotal > 0 ? Math.round(((prefs[pk] || 0) / genderTotal) * 100) : 0;
        });
        return row;
      })
      .sort((a, b) => b.total - a.total);

    // Detailed insights
    const insights: string[] = [];
    Object.entries(byGender).forEach(([gender, prefs]) => {
      if (gender === "Sin especificar") return;
      const genderTotal = Object.values(prefs).reduce((a, b) => a + b, 0);
      if (genderTotal === 0) return;
      Object.entries(prefs)
        .sort((a, b) => b[1] - a[1])
        .forEach(([pref, count]) => {
          const pct = Math.round((count / genderTotal) * 100);
          if (pct > 0) {
            const genderLabel = gender === "Hombre" ? "los hombres" : gender === "Mujer" ? "las mujeres" : gender;
            const prefLabel = pref === "Amistad y Ligue" ? "busca amistad y ligue" :
                             pref === "Solo amistad" ? "solo busca amistad" :
                             pref === "Solo ligue" ? "solo busca ligue" : "no especificó preferencia";
            insights.push(`El ${pct}% de ${genderLabel} ${prefLabel}`);
          }
        });
    });

    // Dating orientation breakdown
    const orientationCounts: Record<string, number> = {};
    socialParticipants.forEach(p => {
      if (p.dating_preference && p.dating_preference !== "none" && p.dating_preference !== "no") {
        orientationCounts[p.dating_preference] = (orientationCounts[p.dating_preference] || 0) + 1;
      }
    });
    const orientationData = Object.entries(orientationCounts)
      .map(([name, value]) => ({ name: name.length > 35 ? name.substring(0, 35) + "…" : name, fullName: name, value }))
      .sort((a, b) => b.value - a.value);

    // Orientation by gender
    const orientationByGender: Record<string, Record<string, number>> = {};
    socialParticipants.forEach(p => {
      if (!p.dating_preference || p.dating_preference === "none" || p.dating_preference === "no") return;
      const gender = p.gender ? normalizeGender(p.gender) : "Sin especificar";
      if (!orientationByGender[gender]) orientationByGender[gender] = {};
      orientationByGender[gender][p.dating_preference] = (orientationByGender[gender][p.dating_preference] || 0) + 1;
    });

    const orientationInsights: string[] = [];
    Object.entries(orientationByGender).forEach(([gender, orients]) => {
      if (gender === "Sin especificar") return;
      const genderTotal = Object.values(orients).reduce((a, b) => a + b, 0);
      if (genderTotal === 0) return;
      Object.entries(orients)
        .sort((a, b) => b[1] - a[1])
        .forEach(([orient, count]) => {
          const pct = Math.round((count / genderTotal) * 100);
          if (pct > 0) {
            const genderLabel = gender === "Hombre" ? "los hombres con interés en ligue" : gender === "Mujer" ? "las mujeres con interés en ligue" : gender;
            orientationInsights.push(`El ${pct}% de ${genderLabel}: "${orient}"`);
          }
        });
    });

    return { overallData, genderBarData, prefKeys, total: socialParticipants.length, insights, orientationData, orientationInsights, PREF_COLORS };
  }, [socialParticipants]);

  // ========== Basic KPIs ==========
  const basicKpis = useMemo(() => {
    const whoSubmitted = socialParticipants.filter(p => p.selection_submitted_at).length;
    const submissionRate = socialParticipants.length > 0 ? Math.round((whoSubmitted / socialParticipants.length) * 100) : 0;

    const selectorCounts = new Map<string, number>();
    const selectedCounts = new Map<string, number>();
    socialSelections.forEach(s => {
      selectorCounts.set(s.selector_id, (selectorCounts.get(s.selector_id) || 0) + 1);
      selectedCounts.set(s.selected_id, (selectedCounts.get(s.selected_id) || 0) + 1);
    });

    const avgSent = selectorCounts.size > 0
      ? (Array.from(selectorCounts.values()).reduce((a, b) => a + b, 0) / selectorCounts.size).toFixed(1)
      : "0";
    const avgReceived = selectedCounts.size > 0
      ? (Array.from(selectedCounts.values()).reduce((a, b) => a + b, 0) / selectedCounts.size).toFixed(1)
      : "0";

    return { submissionRate, avgSent, avgReceived };
  }, [socialParticipants, socialSelections]);

  // ==================== RENDER ====================

  return (
    <div className="space-y-10">
      {/* KPIs */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b">
          <PartyPopper className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Resumen social</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard icon={Calendar} value={socialEvents.length} label="Eventos sociales" color="text-primary" />
          <KpiCard icon={Users} value={socialParticipants.length} label="Participantes" color="text-primary" />
          <KpiCard icon={Heart} value={connectionIndex.socialMatches} label="Matches mutuos" color="text-accent" />
          <KpiCard icon={Percent} value={`${basicKpis.submissionRate}%`} label="Enviaron selecciones" color="text-primary" />
        </div>
      </section>

      {/* 1. Match Type Breakdown */}
      {matchBreakdown.total > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <Heart className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Tipos de coincidencia</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-0"><CardTitle className="text-base">Distribución de matches</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={matchBreakdown.chartData} cx="50%" cy="45%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value" strokeWidth={2} stroke="hsl(var(--background))">
                      {matchBreakdown.chartData.map((entry, idx) => <Cell key={idx} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value} matches`, ""]} />
                    <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-sm font-medium">{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <div className="grid grid-cols-1 gap-4">
              <KpiCard icon={Handshake} value={matchBreakdown.friendshipOnly} label="Solo amistad" color="text-blue-500" subtitle={`${matchBreakdown.total > 0 ? Math.round((matchBreakdown.friendshipOnly / matchBreakdown.total) * 100) : 0}% del total`} />
              <KpiCard icon={Heart} value={matchBreakdown.datingOnly} label="Solo romance" color="text-accent" subtitle={`${matchBreakdown.total > 0 ? Math.round((matchBreakdown.datingOnly / matchBreakdown.total) * 100) : 0}% del total`} />
              <KpiCard icon={Star} value={matchBreakdown.both} label="Amistad + Romance" color="text-purple-500" subtitle={`${matchBreakdown.total > 0 ? Math.round((matchBreakdown.both / matchBreakdown.total) * 100) : 0}% del total`} />
            </div>
          </div>
        </section>
      )}

      {/* Demographics */}
      {(demographics.genderData.length > 0 || demographics.ageData.length > 0) && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Demografía de participantes</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {demographics.genderData.length > 0 && (
              <Card>
                <CardHeader className="pb-0"><CardTitle className="text-base">Distribución por género</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={demographics.genderData} cx="50%" cy="45%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value" strokeWidth={2} stroke="hsl(var(--background))">
                        {demographics.genderData.map((entry, idx) => <Cell key={idx} fill={entry.fill} />)}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value} participantes`, ""]} />
                      <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-sm font-medium">{value}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
            {demographics.ageData.length > 0 && (
              <Card>
                <CardHeader className="pb-0"><CardTitle className="text-base">Distribución por rango de edad</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={demographics.ageData} margin={{ left: 0, right: 10 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value} participantes`, ""]} />
                      <Bar dataKey="value" name="Participantes" radius={[6, 6, 0, 0]} barSize={36}>
                        {demographics.ageData.map((_, idx) => <Cell key={idx} fill={AGE_COLORS[idx % AGE_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      )}

      {/* PREFERENCE BREAKDOWN */}
      {preferenceBreakdown.total > 0 && preferenceBreakdown.overallData.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <HeartHandshake className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Preferencias de conexión</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Overall pie chart */}
            <Card>
              <CardHeader className="pb-0"><CardTitle className="text-base">Tipo de conexión buscado</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={preferenceBreakdown.overallData} cx="50%" cy="45%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value" strokeWidth={2} stroke="hsl(var(--background))">
                      {preferenceBreakdown.overallData.map((entry, idx) => <Cell key={idx} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(value: number, name: string) => [`${value} (${preferenceBreakdown.total > 0 ? Math.round((value / preferenceBreakdown.total) * 100) : 0}%)`, name]} />
                    <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-sm font-medium">{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Stacked bar by gender */}
            {preferenceBreakdown.genderBarData.length > 0 && (
              <Card>
                <CardHeader className="pb-0"><CardTitle className="text-base">Preferencias por género</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={preferenceBreakdown.genderBarData} margin={{ left: 0, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(value: number, name: string, props: any) => {
                        const pctKey = `${name}_pct`;
                        const pct = props.payload[pctKey];
                        return [`${value} (${pct}%)`, name];
                      }} />
                      {preferenceBreakdown.prefKeys.map((pk, idx) => (
                        <Bar key={pk} dataKey={pk} name={pk} stackId="a" fill={preferenceBreakdown.PREF_COLORS[pk] || "hsl(240, 5%, 55%)"} radius={idx === preferenceBreakdown.prefKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                      ))}
                      <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-sm font-medium">{value}</span>} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Insights list */}
          {preferenceBreakdown.insights.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Desglose detallado por género</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {preferenceBreakdown.insights.map((insight, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/50">
                      <span className="text-primary mt-0.5">•</span>
                      <span className="text-sm font-medium">{insight}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dating orientation */}
          {preferenceBreakdown.orientationData.length > 0 && (
            <Card>
              <CardHeader className="pb-0"><CardTitle className="text-base">Orientación de ligue</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={Math.max(200, preferenceBreakdown.orientationData.length * 40 + 40)}>
                  <BarChart data={preferenceBreakdown.orientationData} layout="vertical" margin={{ left: 10, right: 30 }}>
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <YAxis dataKey="name" type="category" width={220} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(value: number, _: string, props: any) => [`${value} participantes`, props.payload.fullName || ""]} />
                    <Bar dataKey="value" name="Participantes" radius={[0, 6, 6, 0]} barSize={24} fill="hsl(346, 77%, 50%)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Orientation insights by gender */}
          {preferenceBreakdown.orientationInsights.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Orientación por género</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-2">
                  {preferenceBreakdown.orientationInsights.map((insight, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/50">
                      <Heart className="w-3.5 h-3.5 text-accent mt-0.5 shrink-0" />
                      <span className="text-sm">{insight}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </section>
      )}

      {/* 2. Gender Reciprocity */}
      {genderReciprocity.chartData.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Reciprocidad por género</h2>
          </div>
          <Card>
            <CardHeader className="pb-0"><CardTitle className="text-base">Selecciones enviadas vs recibidas por género</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={genderReciprocity.chartData} margin={{ left: 0, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="enviadas" name="Enviadas" fill="hsl(210, 70%, 50%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="recibidas" name="Recibidas" fill="hsl(346, 77%, 50%)" radius={[4, 4, 0, 0]} />
                  <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-sm font-medium">{value}</span>} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </section>
      )}

      {/* 3. Age Compatibility Heatmap */}
      {ageHeatmap.maxVal > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <Zap className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Compatibilidad por edad</h2>
          </div>
          <Card>
            <CardHeader className="pb-0"><CardTitle className="text-base">Mapa de calor de matches mutuos por rango de edad</CardTitle></CardHeader>
            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 text-left text-muted-foreground font-medium">↓ Edad / →</th>
                      {AGE_ORDER.map(col => (
                        <th key={col} className="px-3 py-2 text-center text-muted-foreground font-medium text-xs">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {AGE_ORDER.map(row => (
                      <tr key={row}>
                        <td className="px-3 py-2 font-medium text-muted-foreground text-xs">{row}</td>
                        {AGE_ORDER.map(col => {
                          const val = ageHeatmap.heatData[row]?.[col] || 0;
                          const intensity = ageHeatmap.maxVal > 0 ? val / ageHeatmap.maxVal : 0;
                          return (
                            <td key={col} className="px-3 py-2 text-center">
                              <div
                                className="w-10 h-10 mx-auto rounded-lg flex items-center justify-center text-xs font-bold transition-colors"
                                style={{
                                  backgroundColor: val > 0 ? `hsla(346, 77%, 50%, ${0.15 + intensity * 0.75})` : "hsl(var(--muted))",
                                  color: intensity > 0.5 ? "white" : val > 0 ? "hsl(346, 77%, 35%)" : "hsl(var(--muted-foreground))",
                                }}
                              >
                                {val}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-3 text-center">Número de matches mutuos entre cada par de rangos de edad</p>
            </CardContent>
          </Card>
        </section>
      )}

      {/* 4. Round Engagement */}
      {roundEngagement.chartData.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Engagement por ronda</h2>
          </div>
          <Card>
            <CardHeader className="pb-0"><CardTitle className="text-base">Selecciones y matches por ronda</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={roundEngagement.chartData} margin={{ left: 0, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="selecciones" name="Selecciones" fill="hsl(210, 70%, 50%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="matches" name="Matches mutuos" fill="hsl(346, 77%, 50%)" radius={[4, 4, 0, 0]} />
                  <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-sm font-medium">{value}</span>} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </section>
      )}

      {/* 5. Popularity Distribution */}
      {popularity.chartData.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <Eye className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Popularidad y distribución</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-0"><CardTitle className="text-base">Distribución de selecciones recibidas</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={popularity.chartData} margin={{ left: 0, right: 10 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} label={{ value: "Nº selecciones recibidas", position: "insideBottom", offset: -5, fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} label={{ value: "Participantes", angle: -90, position: "insideLeft", fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value} participantes`, ""]} />
                    <Bar dataKey="participantes" name="Participantes" fill="hsl(262, 60%, 55%)" radius={[6, 6, 0, 0]} barSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <div className="space-y-4">
              <KpiCard icon={Users} value={popularity.zeroSelections} label="Sin selecciones recibidas" color="text-muted-foreground" subtitle={`${popularity.totalParticipants > 0 ? Math.round((popularity.zeroSelections / popularity.totalParticipants) * 100) : 0}% del total`} />
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Top 5 más seleccionados</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {popularity.top5.map(p => (
                    <div key={p.rank} className="flex items-center gap-3">
                      <Badge variant="outline" className="w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold">{p.rank}</Badge>
                      <span className="text-sm text-muted-foreground">Participante anónimo</span>
                      <span className="ml-auto font-bold text-sm">{p.count} selecciones</span>
                    </div>
                  ))}
                  {popularity.top5.length === 0 && <p className="text-sm text-muted-foreground">Sin datos aún</p>}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      )}

      {/* 6. Preference vs Reality */}
      {preferenceVsReality.totalParticipants > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <Heart className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold">Preferencia vs realidad</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard icon={Heart} value={preferenceVsReality.seekingCount} label="Buscan romance" color="text-accent" subtitle={`${Math.round((preferenceVsReality.seekingCount / preferenceVsReality.totalParticipants) * 100)}% del total`} />
            <KpiCard icon={Star} value={preferenceVsReality.matchedCount} label="Lograron match romántico" color="text-purple-500" />
            <KpiCard icon={Percent} value={`${preferenceVsReality.conversionRate}%`} label="Tasa de conversión" color="text-primary" subtitle="De los que buscan romance" />
            <KpiCard icon={Handshake} value={preferenceVsReality.datingMatchCount} label="Matches románticos totales" color="text-accent" />
          </div>
        </section>
      )}

      {/* 7. Connection Index */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b">
          <Zap className="w-5 h-5 text-accent" />
          <h2 className="text-lg font-semibold">Índice de conexión</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-accent/20">
            <CardContent className="p-8 text-center">
              <p className="text-6xl font-bold text-primary mb-2">{connectionIndex.score}%</p>
              <p className="text-muted-foreground">Índice de conexión global</p>
              <p className="text-xs text-muted-foreground/70 mt-1">(Matches mutuos / conexiones posibles) × 100</p>
            </CardContent>
          </Card>
          {connectionIndex.eventScores.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Ranking por evento</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {connectionIndex.eventScores.slice(0, 6).map((e, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <Badge
                      variant={idx === 0 ? "default" : "outline"}
                      className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold ${idx === 0 ? "bg-primary" : ""}`}
                    >
                      {idx + 1}
                    </Badge>
                    <span className="text-sm truncate flex-1">{e.name}</span>
                    <span className="font-bold text-sm">{e.score}%</span>
                    <span className="text-xs text-muted-foreground">{e.matches} matches</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Selection metrics */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b">
          <Handshake className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Métricas de selección</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard icon={Send} value={basicKpis.avgSent} label="Media selecciones enviadas" color="text-primary" />
          <KpiCard icon={Inbox} value={basicKpis.avgReceived} label="Media selecciones recibidas" color="text-primary" />
          <KpiCard icon={Heart} value={`${connectionIndex.score}%`} label="Índice de conexión" color="text-accent" />
          <KpiCard icon={Percent} value={`${basicKpis.submissionRate}%`} label="Participación en selección" color="text-primary" />
        </div>
      </section>
    </div>
  );
}
