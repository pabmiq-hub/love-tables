import { Users, Layers } from "lucide-react";

interface EventHeroCardProps {
  participantsCount?: number | null;
  rounds?: number | null;
  currentRound?: number | null;
  lang: "es" | "en";
}

export default function EventHeroCard({
  participantsCount,
  rounds,
  currentRound = 0,
  lang,
}: EventHeroCardProps) {
  const total = rounds ?? 0;
  const progress = total > 0 ? Math.min(100, (currentRound / total) * 100) : 0;

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5 bg-card/80 backdrop-blur-sm border-b border-border/60">
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-primary shrink-0" />
        <span className="font-display font-bold text-sm">{participantsCount ?? 0}</span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
          {lang === "es" ? "Personas" : "People"}
        </span>
      </div>

      <div className="flex items-center gap-2 min-w-0">
        <Layers className="w-4 h-4 text-primary shrink-0" />
        <div className="flex flex-col items-end min-w-0">
          <span className="text-xs font-medium whitespace-nowrap">
            {lang === "es"
              ? `Ronda ${currentRound} de ${total}`
              : `Round ${currentRound} of ${total}`}
          </span>
          {total > 0 && currentRound > 0 && (
            <div className="w-16 h-1 bg-muted rounded-full mt-0.5 overflow-hidden">
              <div
                className="h-full bg-primary rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
