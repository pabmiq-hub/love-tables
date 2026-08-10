import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Heart, RotateCcw, Zap, Loader2, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getWrappedQuestions, type WrappedAnswers, type WrappedQuestion } from "@/lib/wrappedQuestions";

interface ParticipantLite {
  id: string;
  wrapped_profile_id?: string | null;
}

interface Match {
  participant1: { id: string; name: string };
  participant2: { id: string; name: string };
}

interface Selection {
  selector_id: string;
  selected_id: string;
  is_super_like?: boolean | null;
}

interface Props {
  eventId: string;
  participants: ParticipantLite[];
  selections: Selection[];
  matches: Match[];
  wrappedEnabled?: boolean;
  wrappedQuestions?: unknown;
}

const pairKey = (a: string, b: string) => [a, b].sort().join(":");

const EventEngagementInsights = ({
  eventId,
  participants,
  selections,
  matches,
  wrappedEnabled,
  wrappedQuestions,
}: Props) => {
  const [loading, setLoading] = useState(true);
  const [wrappedProfiles, setWrappedProfiles] = useState<
    { id: string; answers: WrappedAnswers | null; hobbies_ranked: string[] | null }[]
  >([]);
  const [crushRequests, setCrushRequests] = useState<any[]>([]);
  const [repeatRequests, setRepeatRequests] = useState<any[]>([]);
  const [gameVotes, setGameVotes] = useState<any[]>([]);
  const [gameRewards, setGameRewards] = useState<any[]>([]);

  const profileIdsKey = useMemo(
    () =>
      Array.from(
        new Set(participants.map((p) => p.wrapped_profile_id).filter(Boolean) as string[]),
      )
        .sort()
        .join(","),
    [participants],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const profileIds = profileIdsKey ? profileIdsKey.split(",") : [];

      const [profilesRes, crushRes, repeatRes, votesRes, rewardsRes] = await Promise.all([
        profileIds.length > 0
          ? supabase.from("wrapped_profiles").select("id, answers, hobbies_ranked").in("id", profileIds)
          : Promise.resolve({ data: [], error: null } as any),
        supabase.from("crush_requests").select("id, requester_id, target_id, status").eq("event_id", eventId),
        supabase
          .from("repeat_requests")
          .select("id, requester_id, target_id, status")
          .eq("event_id", eventId),
        supabase.from("game_votes").select("voter_participant_id, is_correct, round").eq("event_id", eventId),
        supabase.from("game_rewards").select("participant_id, reward_type").eq("event_id", eventId),
      ]);

      if (cancelled) return;
      setWrappedProfiles((profilesRes.data as any) || []);
      setCrushRequests((crushRes.data as any) || []);
      setRepeatRequests((repeatRes.data as any) || []);
      setGameVotes((votesRes.data as any) || []);
      setGameRewards((rewardsRes.data as any) || []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId, profileIdsKey]);

  const gameStats = useMemo(() => {
    const total = gameVotes.length;
    const correct = gameVotes.filter((v) => v.is_correct).length;
    const players = new Set(gameVotes.map((v) => v.voter_participant_id)).size;
    const rewardsByType = gameRewards.reduce<Record<string, number>>((acc, r) => {
      acc[r.reward_type] = (acc[r.reward_type] || 0) + 1;
      return acc;
    }, {});
    return {
      total,
      correct,
      players,
      accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
      rewardsByType,
    };
  }, [gameVotes, gameRewards]);

  const matchPairSet = useMemo(() => {
    const s = new Set<string>();
    matches.forEach((m) => s.add(pairKey(m.participant1.id, m.participant2.id)));
    return s;
  }, [matches]);

  const questions: WrappedQuestion[] = useMemo(
    () => getWrappedQuestions(wrappedQuestions),
    [wrappedQuestions],
  );

  // ============ INTERESTS AGGREGATION ============
  const interestStats = useMemo(() => {
    const totalProfiles = wrappedProfiles.length;
    if (totalProfiles === 0) return null;

    const perQuestion: {
      question: WrappedQuestion;
      counts: { key: string; label: string; value: number; pct: number }[];
    }[] = [];

    for (const q of questions) {
      if (q.type === "ranked_top3") continue; // handled separately
      const counts: Record<string, number> = {};
      wrappedProfiles.forEach((prof) => {
        const ans = prof.answers?.[q.id];
        if (ans == null) return;
        if (q.type === "yes_no") {
          const key = ans === true ? "yes" : ans === false ? "no" : null;
          if (key) counts[key] = (counts[key] || 0) + 1;
        } else if (q.type === "single_choice") {
          if (typeof ans === "string") counts[ans] = (counts[ans] || 0) + 1;
        } else if (q.type === "multi_choice") {
          if (Array.isArray(ans)) {
            (ans as string[]).forEach((v) => (counts[v] = (counts[v] || 0) + 1));
          }
        }
      });

      const labelFor = (key: string): string => {
        if (q.type === "yes_no") return key === "yes" ? "Sí" : "No";
        const idx = q.options_key?.indexOf(key) ?? -1;
        if (idx >= 0) return q.i18n.es.options?.[idx] || key;
        return key;
      };

      const denom = q.type === "multi_choice" ? totalProfiles : totalProfiles;
      const items = Object.entries(counts)
        .map(([key, value]) => ({
          key,
          label: labelFor(key),
          value,
          pct: denom > 0 ? Math.round((value / denom) * 100) : 0,
        }))
        .sort((a, b) => b.value - a.value);

      if (items.length > 0) perQuestion.push({ question: q, counts: items });
    }

    // Top hobbies aggregated with weight (rank 1: 3pts, rank 2: 2pts, rank 3: 1pt)
    const hobbyQ = questions.find((q) => q.id === "top_hobbies");
    const hobbyScores: Record<string, { weighted: number; picks: number }> = {};
    wrappedProfiles.forEach((prof) => {
      const ranked = prof.hobbies_ranked;
      if (Array.isArray(ranked)) {
        ranked.slice(0, 3).forEach((key, idx) => {
          if (!key) return;
          const weight = 3 - idx;
          if (!hobbyScores[key]) hobbyScores[key] = { weighted: 0, picks: 0 };
          hobbyScores[key].weighted += weight;
          hobbyScores[key].picks += 1;
        });
      }
    });
    const hobbyLabels = (key: string) => {
      const idx = hobbyQ?.options_key?.indexOf(key) ?? -1;
      return idx >= 0 ? hobbyQ!.i18n.es.options?.[idx] || key : key;
    };
    const topHobbies = Object.entries(hobbyScores)
      .map(([key, v]) => ({
        key,
        label: hobbyLabels(key),
        picks: v.picks,
        weighted: v.weighted,
        pct: totalProfiles > 0 ? Math.round((v.picks / totalProfiles) * 100) : 0,
      }))
      .sort((a, b) => b.weighted - a.weighted);

    return { totalProfiles, perQuestion, topHobbies };
  }, [wrappedProfiles, questions]);

  // ============ EVENTS: SUPER LIKE / CRUSH / REPEAT ============
  const superLikeStats = useMemo(() => {
    const sl = selections.filter((s) => s.is_super_like);
    const total = sl.length;
    const uniqueSenders = new Set(sl.map((s) => s.selector_id)).size;
    const uniqueReceivers = new Set(sl.map((s) => s.selected_id)).size;
    let becameMatch = 0;
    sl.forEach((s) => {
      if (matchPairSet.has(pairKey(s.selector_id, s.selected_id))) becameMatch += 1;
    });
    const matchRate = total > 0 ? Math.round((becameMatch / total) * 100) : 0;
    return { total, uniqueSenders, uniqueReceivers, becameMatch, matchRate };
  }, [selections, matchPairSet]);

  const crushStats = useMemo(() => {
    const total = crushRequests.length;
    const accepted = crushRequests.filter((c) => c.status === "accepted").length;
    const rejected = crushRequests.filter((c) => c.status === "rejected").length;
    const pending = crushRequests.filter((c) => c.status === "pending").length;
    const acceptRate = total > 0 ? Math.round((accepted / total) * 100) : 0;
    let becameMatch = 0;
    crushRequests
      .filter((c) => c.status === "accepted")
      .forEach((c) => {
        if (matchPairSet.has(pairKey(c.requester_id, c.target_id))) becameMatch += 1;
      });
    return { total, accepted, rejected, pending, acceptRate, becameMatch };
  }, [crushRequests, matchPairSet]);

  const repeatStats = useMemo(() => {
    const total = repeatRequests.length;
    const accepted = repeatRequests.filter((r) => r.status === "accepted").length;
    const declined = repeatRequests.filter((r) => r.status === "declined").length;
    const pending = repeatRequests.filter((r) => r.status === "pending").length;
    const expired = repeatRequests.filter((r) => r.status === "expired").length;
    const acceptRate = total > 0 ? Math.round((accepted / total) * 100) : 0;
    let becameMatch = 0;
    repeatRequests
      .filter((r) => r.status === "accepted")
      .forEach((r) => {
        if (matchPairSet.has(pairKey(r.requester_id, r.target_id))) becameMatch += 1;
      });
    return { total, accepted, declined, pending, expired, acceptRate, becameMatch };
  }, [repeatRequests, matchPairSet]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {gameStats.total > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <Zap className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Juego ¿Quién es quién?</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-3xl font-bold">{gameStats.players}</div>
                <p className="text-xs text-muted-foreground mt-1">Participantes que han jugado</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-3xl font-bold">{gameStats.total}</div>
                <p className="text-xs text-muted-foreground mt-1">Votos emitidos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-3xl font-bold">{gameStats.accuracy}%</div>
                <p className="text-xs text-muted-foreground mt-1">Aciertos ({gameStats.correct})</p>
                <Progress value={gameStats.accuracy} className="h-1.5 mt-2" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 space-y-1">
                <p className="text-xs text-muted-foreground">Premios desbloqueados</p>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary">Super Like ×{gameStats.rewardsByType.super_like || 0}</Badge>
                  <Badge variant="secondary">Repetir ×{gameStats.rewardsByType.repeat || 0}</Badge>
                  <Badge variant="secondary">Flechazo ×{gameStats.rewardsByType.crush || 0}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ========== EVENTOS ESPECIALES ========== */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b">
          <Zap className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Eventos especiales</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Impacto de Super Like, Flechazo y Repetir en el evento y su tasa de conversión a match.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Super Like */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-2 bg-gradient-to-r from-blue-50 to-cyan-50">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                Super Like
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-baseline justify-between">
                <div className="text-3xl font-bold text-blue-600">{superLikeStats.total}</div>
                <span className="text-xs text-muted-foreground">enviados</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Emisores únicos</span>
                <Badge variant="secondary">{superLikeStats.uniqueSenders}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Receptores únicos</span>
                <Badge variant="secondary">{superLikeStats.uniqueReceivers}</Badge>
              </div>
              <div className="pt-2 border-t space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Coincidencia (match)</span>
                  <span className="font-semibold text-blue-700">
                    {superLikeStats.becameMatch} · {superLikeStats.matchRate}%
                  </span>
                </div>
                <Progress value={superLikeStats.matchRate} className="h-1.5" />
              </div>
            </CardContent>
          </Card>

          {/* Flechazo */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-2 bg-gradient-to-r from-pink-50 to-rose-50">
              <CardTitle className="text-base flex items-center gap-2">
                <Heart className="w-4 h-4 text-pink-600" />
                Flechazo
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-baseline justify-between">
                <div className="text-3xl font-bold text-pink-600">{crushStats.total}</div>
                <span className="text-xs text-muted-foreground">solicitudes</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Aceptadas</span>
                <Badge className="bg-pink-100 text-pink-700 hover:bg-pink-100">{crushStats.accepted}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Rechazadas</span>
                <Badge variant="outline">{crushStats.rejected}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pendientes</span>
                <Badge variant="outline">{crushStats.pending}</Badge>
              </div>
              <div className="pt-2 border-t space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Tasa de aceptación</span>
                  <span className="font-semibold text-pink-700">{crushStats.acceptRate}%</span>
                </div>
                <Progress value={crushStats.acceptRate} className="h-1.5" />
                <div className="flex justify-between text-xs text-muted-foreground pt-1">
                  <span>Aceptadas convertidas en match</span>
                  <span className="font-medium">{crushStats.becameMatch}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Repetir */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-2 bg-gradient-to-r from-amber-50 to-orange-50">
              <CardTitle className="text-base flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-600" />
                Repetir
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-baseline justify-between">
                <div className="text-3xl font-bold text-amber-600">{repeatStats.total}</div>
                <span className="text-xs text-muted-foreground">solicitudes</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Aceptadas</span>
                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">{repeatStats.accepted}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Rechazadas</span>
                <Badge variant="outline">{repeatStats.declined}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pendientes / Expiradas</span>
                <Badge variant="outline">{repeatStats.pending + repeatStats.expired}</Badge>
              </div>
              <div className="pt-2 border-t space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Tasa de aceptación</span>
                  <span className="font-semibold text-amber-700">{repeatStats.acceptRate}%</span>
                </div>
                <Progress value={repeatStats.acceptRate} className="h-1.5" />
                <div className="flex justify-between text-xs text-muted-foreground pt-1">
                  <span>Aceptadas convertidas en match</span>
                  <span className="font-medium">{repeatStats.becameMatch}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ========== INTERESES (WRAPPED) ========== */}
      {wrappedEnabled && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Intereses de los participantes</h2>
          </div>

          {!interestStats || interestStats.totalProfiles === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground text-sm">
                Aún no hay respuestas del modo Wrapped en este evento.
              </CardContent>
            </Card>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Basado en {interestStats.totalProfiles} perfil{interestStats.totalProfiles === 1 ? "" : "es"} con
                respuestas de intereses.
              </p>

              {/* Top hobbies destacado */}
              {interestStats.topHobbies.length > 0 && (
                <Card className="overflow-hidden">
                  <CardHeader className="pb-2 bg-gradient-to-r from-violet-50 to-indigo-50">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-violet-600" />
                      Top hobbies (ponderado por ranking)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      {interestStats.topHobbies.slice(0, 8).map((h, idx) => (
                        <div key={h.key} className="flex items-center gap-3">
                          <span className="w-6 text-sm font-semibold text-muted-foreground">
                            {idx + 1}.
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium truncate">{h.label}</span>
                              <span className="text-muted-foreground shrink-0 ml-2">
                                {h.picks} · {h.pct}%
                              </span>
                            </div>
                            <Progress value={h.pct} className="h-1.5" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Per-question breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {interestStats.perQuestion.map(({ question, counts }) => (
                  <Card key={question.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{question.i18n.es.label}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {counts.slice(0, 8).map((item) => (
                          <div key={item.key}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="truncate">{item.label}</span>
                              <span className="text-muted-foreground shrink-0 ml-2">
                                {item.value} · {item.pct}%
                              </span>
                            </div>
                            <Progress value={item.pct} className="h-1.5" />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default EventEngagementInsights;
