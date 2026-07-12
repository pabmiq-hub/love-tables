import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Sparkles, Search } from "lucide-react";
import {
  computeCompatibility,
  getWrappedQuestions,
  DEFAULT_WRAPPED_QUESTIONS,
  type WrappedAnswers,
  type WrappedQuestion,
} from "@/lib/wrappedQuestions";

interface Props {
  eventId: string;
  wrappedQuestions: unknown;
}

interface Row {
  id: string;
  name: string;
  profileId: string | null;
  answers: WrappedAnswers | null;
  topHobbyKey: string | null;
}

interface RankedMatch {
  otherId: string;
  otherName: string;
  score: number;
}

const HOBBY_LABEL_ES: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  const q = DEFAULT_WRAPPED_QUESTIONS.find(x => x.id === "top_hobbies");
  if (q?.options_key && q.i18n.es.options) {
    q.options_key.forEach((k, i) => { map[k] = q.i18n.es.options![i] || k; });
  }
  return map;
})();

export default function EventCompatibilityTab({ eventId, wrappedQuestions }: Props) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const questions: WrappedQuestion[] = useMemo(
    () => getWrappedQuestions(wrappedQuestions),
    [wrappedQuestions]
  );

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      const { data: parts } = await (supabase as any)
        .from("participants")
        .select("id, name, wrapped_profile_id, status")
        .eq("event_id", eventId)
        .neq("status", "cancelled");

      const profileIds = Array.from(
        new Set((parts || []).map((p: any) => p.wrapped_profile_id).filter(Boolean))
      ) as string[];

      const profilesMap = new Map<string, { answers: WrappedAnswers | null; hobbies_ranked: string[] | null }>();
      if (profileIds.length > 0) {
        const { data: profs } = await supabase
          .from("wrapped_profiles")
          .select("id, answers, hobbies_ranked")
          .in("id", profileIds);
        for (const p of (profs || []) as any[]) {
          profilesMap.set(p.id, { answers: p.answers, hobbies_ranked: p.hobbies_ranked });
        }
      }

      const mapped: Row[] = (parts || []).map((p: any) => {
        const prof = p.wrapped_profile_id ? profilesMap.get(p.wrapped_profile_id) : undefined;
        return {
          id: p.id,
          name: p.name,
          profileId: p.wrapped_profile_id || null,
          answers: prof?.answers || null,
          topHobbyKey: Array.isArray(prof?.hobbies_ranked) && prof!.hobbies_ranked!.length > 0 ? prof!.hobbies_ranked![0] : null,
        };
      });

      if (!cancel) {
        setRows(mapped);
        setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [eventId]);

  const withProfile = useMemo(() => rows.filter(r => r.answers), [rows]);

  const topMatches = useMemo(() => {
    const result = new Map<string, RankedMatch | null>();
    for (const a of withProfile) {
      let best: RankedMatch | null = null;
      for (const b of withProfile) {
        if (b.id === a.id) continue;
        const score = computeCompatibility(a.answers, b.answers, questions);
        if (!best || score > best.score) {
          best = { otherId: b.id, otherName: b.name, score };
        }
      }
      result.set(a.id, best);
    }
    return result;
  }, [withProfile, questions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r => r.name.toLowerCase().includes(q));
  }, [rows, search]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" /> Compatibilidad
            </CardTitle>
            <CardDescription>
              Persona más compatible con cada participante según sus respuestas Wrapped.
              {withProfile.length > 0 && (
                <> · {withProfile.length} con perfil de {rows.length}</>
              )}
            </CardDescription>
          </div>
          <div className="relative sm:w-64">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar participante..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No hay participantes.</p>
        ) : withProfile.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Aún no hay participantes con perfil Wrapped completo.
          </p>
        ) : (
          <div className="space-y-2">
            {filtered.map(r => {
              const best = topMatches.get(r.id);
              const hasProfile = !!r.answers;
              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{r.name}</p>
                    {r.topHobbyKey && (
                      <p className="text-xs text-muted-foreground truncate">
                        Top hobby: {HOBBY_LABEL_ES[r.topHobbyKey] || r.topHobbyKey}
                      </p>
                    )}
                  </div>
                  {!hasProfile ? (
                    <Badge variant="outline" className="text-xs">Sin perfil</Badge>
                  ) : best ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Más compatible</p>
                        <p className="text-sm font-medium truncate max-w-[160px]">{best.otherName}</p>
                      </div>
                      <Badge className="bg-primary/10 text-primary border-primary/30" variant="outline">
                        {best.score}%
                      </Badge>
                    </div>
                  ) : (
                    <Badge variant="outline" className="text-xs">—</Badge>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
