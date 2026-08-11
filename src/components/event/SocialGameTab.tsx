import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, Sparkles, Repeat, Heart } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Entry {
  token: string;
  text: string;
  vote: { guessedId: string; correct: boolean; authorId: string; authorName: string } | null;
}

interface RoundData {
  round: number;
  table: number;
  options: { id: string; name: string }[];
  questions: { id: string; label: string; entries: Entry[] }[];
}

interface Props {
  eventId: string;
  verificationCode: string;
  lang: "es" | "en";
  onRewardsChange?: () => void;
}


const REWARD_META: Record<string, { icon: any; es: string; en: string }> = {
  super_like: { icon: Sparkles, es: "Super Like extra", en: "Extra Super Like" },
  repeat: { icon: Repeat, es: "Repetir extra", en: "Extra Repeat" },
  crush: { icon: Heart, es: "Flechazo extra", en: "Extra Crush" },
};

const SocialGameTab = ({ eventId, verificationCode, lang }: Props) => {
  const [isLoading, setIsLoading] = useState(true);
  const [rounds, setRounds] = useState<RoundData[]>([]);
  const [rewards, setRewards] = useState<{ round: number; type: string }[]>([]);
  const [pending, setPending] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await supabase.functions.invoke("get-game-round", {
      body: { eventId, verificationCode },
    });
    if (error || data?.error) {
      setRounds([]);
    } else {
      setRounds(data?.rounds || []);
      setRewards(data?.rewards || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, verificationCode]);

  const vote = async (round: number, questionId: string, token: string, guessedParticipantId: string) => {
    setPending(token);
    const { data, error } = await supabase.functions.invoke("submit-game-vote", {
      body: { eventId, verificationCode, round, questionId, entryToken: token, guessedParticipantId },
    });
    setPending(null);

    if (error || data?.error) {
      toast({
        title: "Error",
        description: data?.error || (lang === "en" ? "Could not save your vote" : "No se pudo guardar tu voto"),
        variant: "destructive",
      });
      return;
    }

    toast({
      title: data.correct
        ? lang === "en" ? "Correct! 🎉" : "¡Acertaste! 🎉"
        : lang === "en" ? "Not this time" : "No era esa persona",
      description: lang === "en"
        ? `It was written by ${data.authorName}.`
        : `La escribió ${data.authorName}.`,
    });

    setRewards(data.rewards || []);
    await load();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const rewardCounts = rewards.reduce<Record<string, number>>((acc, r) => {
    acc[r.type] = (acc[r.type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4 bg-primary/5 border-primary/20">
        <p className="text-sm font-semibold mb-1">
          {lang === "en" ? "🎭 Who's who?" : "🎭 ¿Quién es quién?"}
        </p>
        <p className="text-xs text-muted-foreground">
          {lang === "en"
            ? "In each round you'll see two questions with anonymous answers from your tablemates. Guess who wrote each one: 1 hit unlocks an extra Super Like, 3 hits also unlock an extra Repeat, and a perfect round also unlocks an extra Crush."
            : "En cada ronda verás dos preguntas con las respuestas anónimas de tu mesa. Adivina quién escribió cada una: con 1 acierto ganas un Super Like extra, con 3 también un Repetir extra y con pleno también un Flechazo extra."}
        </p>
      </div>

      {Object.keys(rewardCounts).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(rewardCounts).map(([type, count]) => {
            const meta = REWARD_META[type];
            if (!meta) return null;
            const Icon = meta.icon;
            return (
              <Badge key={type} variant="secondary" className="gap-1">
                <Icon className="w-3.5 h-3.5" />
                {lang === "en" ? meta.en : meta.es} ×{count}
              </Badge>
            );
          })}
        </div>
      )}

      {rounds.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          {lang === "en"
            ? "The game will be available once your tables are published."
            : "El juego estará disponible cuando se publiquen tus mesas."}
        </div>
      ) : (
        <Accordion type="single" collapsible defaultValue={`r-${rounds[rounds.length - 1].round}`} className="space-y-2">
          {rounds.map((r) => (
            <AccordionItem key={r.round} value={`r-${r.round}`} className="border rounded-lg px-4">
              <AccordionTrigger className="text-sm">
                {r.round === 0
                  ? lang === "en" ? "Warm-up round" : "Ronda preliminar"
                  : lang === "en" ? `Round ${r.round}` : `Ronda ${r.round}`}
                {" · "}
                {lang === "en" ? `Table ${r.table}` : `Mesa ${r.table}`}
              </AccordionTrigger>
              <AccordionContent className="space-y-5 pb-4">
                {r.questions.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    {lang === "en" ? "No questions for this round." : "No hay preguntas en esta ronda."}
                  </p>
                )}
                {r.questions.map((q) => (
                  <div key={q.id} className="space-y-3">
                    <p className="text-sm font-medium">{q.label}</p>
                    {q.entries.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        {lang === "en" ? "No answers from your tablemates yet." : "Aún no hay respuestas de tu mesa."}
                      </p>
                    )}
                    {q.entries.map((entry) => (
                      <div key={entry.token} className="rounded-md border p-3 space-y-2 bg-muted/30">
                        <p className="text-sm italic">“{entry.text}”</p>
                        {entry.vote ? (
                          <div className="flex items-center gap-2 text-xs">
                            {entry.vote.correct ? (
                              <CheckCircle2 className="w-4 h-4 text-primary" />
                            ) : (
                              <XCircle className="w-4 h-4 text-destructive" />
                            )}
                            <span>
                              {lang === "en" ? "Written by" : "La escribió"} <strong>{entry.vote.authorName}</strong>
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {r.options.map((o) => (
                              <Button
                                key={o.id}
                                size="sm"
                                variant="outline"
                                disabled={pending === entry.token}
                                onClick={() => vote(r.round, q.id, entry.token, o.id)}
                              >
                                {pending === entry.token && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                                {o.name}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
};

export default SocialGameTab;
