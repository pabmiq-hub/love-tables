import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Plus, X, Repeat, ShieldCheck } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface GroupRound {
  round: number;
  table_size: number;
  allow_repeats: boolean;
}

interface GroupRoundsEditorProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  groupRounds: GroupRound[];
  onGroupRoundsChange: (rounds: GroupRound[]) => void;
  totalRounds: number;
  defaultTableSize: number;
}

const GroupRoundsEditor = ({
  enabled,
  onEnabledChange,
  groupRounds,
  onGroupRoundsChange,
  totalRounds,
  defaultTableSize,
}: GroupRoundsEditorProps) => {
  const usedRounds = groupRounds.map((g) => g.round);
  const availableRounds = Array.from({ length: totalRounds }, (_, i) => i + 1).filter(
    (r) => !usedRounds.includes(r)
  );

  const handleAddGroupRound = () => {
    if (availableRounds.length === 0) return;
    const nextRound = availableRounds[0];
    onGroupRoundsChange([
      ...groupRounds,
      { round: nextRound, table_size: Math.min(defaultTableSize * 2, 12), allow_repeats: true },
    ]);
  };

  const handleRemoveGroupRound = (round: number) => {
    onGroupRoundsChange(groupRounds.filter((g) => g.round !== round));
  };

  const handleUpdateRound = (index: number, field: keyof GroupRound, value: number | boolean) => {
    const updated = [...groupRounds];
    updated[index] = { ...updated[index], [field]: value };
    onGroupRoundsChange(updated);
  };

  return (
    <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-violet-500" />
          </div>
          <div>
            <Label htmlFor="group-rounds" className="font-medium cursor-pointer">
              Rondas grupales
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Rondas especiales con más participantes por mesa
            </p>
          </div>
        </div>
        <Switch
          id="group-rounds"
          checked={enabled}
          onCheckedChange={(checked) => {
            onEnabledChange(checked);
            if (!checked) onGroupRoundsChange([]);
          }}
        />
      </div>

      {enabled && (
        <div className="ml-[52px] space-y-3">
          {groupRounds
            .sort((a, b) => a.round - b.round)
            .map((gr, idx) => (
              <div key={gr.round} className="flex flex-col gap-2 p-3 rounded-md border bg-background">
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2 flex-wrap">
                    <Select
                      value={String(gr.round)}
                      onValueChange={(v) => handleUpdateRound(idx, "round", parseInt(v))}
                    >
                      <SelectTrigger className="w-32 h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={String(gr.round)}>Ronda {gr.round}</SelectItem>
                        {availableRounds.map((r) => (
                          <SelectItem key={r} value={String(r)}>
                            Ronda {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min={3}
                        max={20}
                        value={gr.table_size}
                        onChange={(e) =>
                          handleUpdateRound(idx, "table_size", Math.max(3, Math.min(20, parseInt(e.target.value) || 3)))
                        }
                        className="w-16 h-8 text-sm"
                      />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">por mesa</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => handleRemoveGroupRound(gr.round)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 pl-1">
                  <Switch
                    id={`allow-repeats-${gr.round}`}
                    checked={gr.allow_repeats !== false}
                    onCheckedChange={(checked) => handleUpdateRound(idx, "allow_repeats", checked)}
                    className="scale-90"
                  />
                  <Label htmlFor={`allow-repeats-${gr.round}`} className="text-xs cursor-pointer flex items-center gap-1.5">
                    {gr.allow_repeats !== false ? (
                      <>
                        <Repeat className="w-3 h-3 text-amber-500" />
                        <span>Permite repeticiones de participantes</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-3 h-3 text-emerald-500" />
                        <span>Sin repeticiones (misma restricción que rondas normales)</span>
                      </>
                    )}
                  </Label>
                </div>
              </div>
            ))}

          {availableRounds.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleAddGroupRound}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Añadir ronda grupal
            </Button>
          )}

          {groupRounds.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Las rondas grupales usan mesas más grandes. Puedes configurar si permiten que participantes que ya coincidieron vuelvan a sentarse juntos.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default GroupRoundsEditor;
