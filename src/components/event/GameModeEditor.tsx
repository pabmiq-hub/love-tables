import { useMemo } from "react";
import { Plus, Trash2, Gamepad2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  GameModeConfig,
  GameDynamic,
  validateGameMode,
} from "@/lib/gameMode";

interface GameModeEditorProps {
  value: GameModeConfig;
  onChange: (config: GameModeConfig) => void;
  /** Estimated number of tables (participants / table_size) */
  estimatedTables: number;
  /** Total rounds in the event */
  totalRounds: number;
}

const newId = () => `dyn_${Math.random().toString(36).slice(2, 9)}`;

const GameModeEditor = ({ value, onChange, estimatedTables, totalRounds }: GameModeEditorProps) => {
  const { errors, warnings } = useMemo(
    () => validateGameMode(value, estimatedTables, totalRounds),
    [value, estimatedTables, totalRounds]
  );

  const tableOptions = useMemo(() => {
    const max = Math.max(estimatedTables, 1);
    return Array.from({ length: max }, (_, i) => i + 1);
  }, [estimatedTables]);

  // Map: tableNumber -> dynamicId that already uses it (to disable in other selectors)
  const tableUsage = useMemo(() => {
    const map = new Map<number, string>();
    value.dynamics.forEach((d) => {
      d.table_numbers.forEach((n) => map.set(n, d.id));
    });
    return map;
  }, [value.dynamics]);

  const updateDynamic = (id: string, patch: Partial<GameDynamic>) => {
    onChange({
      ...value,
      dynamics: value.dynamics.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    });
  };

  const removeDynamic = (id: string) => {
    onChange({ ...value, dynamics: value.dynamics.filter((d) => d.id !== id) });
  };

  const addDynamic = () => {
    onChange({
      ...value,
      dynamics: [
        ...value.dynamics,
        { id: newId(), name: `Dinámica ${value.dynamics.length + 1}`, table_numbers: [] },
      ],
    });
  };

  const toggleTableForDynamic = (dynId: string, tableNum: number) => {
    const dyn = value.dynamics.find((d) => d.id === dynId);
    if (!dyn) return;
    const has = dyn.table_numbers.includes(tableNum);
    if (has) {
      updateDynamic(dynId, { table_numbers: dyn.table_numbers.filter((n) => n !== tableNum) });
    } else {
      // If this table is owned by another dynamic, remove it there first
      const owner = tableUsage.get(tableNum);
      if (owner && owner !== dynId) {
        const ownerDyn = value.dynamics.find((d) => d.id === owner)!;
        onChange({
          ...value,
          dynamics: value.dynamics.map((d) => {
            if (d.id === owner)
              return { ...ownerDyn, table_numbers: ownerDyn.table_numbers.filter((n) => n !== tableNum) };
            if (d.id === dynId) return { ...dyn, table_numbers: [...dyn.table_numbers, tableNum].sort((a, b) => a - b) };
            return d;
          }),
        });
        return;
      }
      updateDynamic(dynId, { table_numbers: [...dyn.table_numbers, tableNum].sort((a, b) => a - b) });
    }
  };

  return (
    <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
            <Gamepad2 className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <Label htmlFor="game-mode-toggle" className="font-medium cursor-pointer">
              🎲 Modo lúdico (mesas con dinámicas)
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Marca un grupo de mesas como "mesa con dinámica" (ej: Trivial). Ningún participante
              repetirá la misma dinámica entre rondas, incluida la preliminar.
            </p>
          </div>
        </div>
        <Switch
          id="game-mode-toggle"
          checked={value.enabled}
          onCheckedChange={(enabled) => onChange({ ...value, enabled })}
        />
      </div>

      {value.enabled && (
        <div className="space-y-3 pt-2">
          <div className="text-xs text-muted-foreground">
            Estimación: <strong>{estimatedTables}</strong> mesas según {totalRounds} rondas. Si añades más
            participantes después, podrás revisar las mesas afectadas.
          </div>

          {value.dynamics.length === 0 && (
            <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              Aún no has añadido ninguna dinámica.
            </div>
          )}

          {value.dynamics.map((dyn, idx) => (
            <div key={dyn.id} className="rounded-lg border bg-background p-3 space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                  🎲 {idx + 1}
                </Badge>
                <Input
                  value={dyn.name}
                  placeholder={`Dinámica ${idx + 1} (ej: Trivial)`}
                  onChange={(e) => updateDynamic(dyn.id, { name: e.target.value })}
                  className="flex-1 h-9"
                />
                <Button variant="ghost" size="icon" onClick={() => removeDynamic(dyn.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Mesas asignadas</Label>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {tableOptions.map((n) => {
                    const selected = dyn.table_numbers.includes(n);
                    const ownedByOther = tableUsage.get(n) && tableUsage.get(n) !== dyn.id;
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => toggleTableForDynamic(dyn.id, n)}
                        className={`h-8 min-w-[2rem] px-2 rounded-md text-xs font-medium border transition-colors ${
                          selected
                            ? "bg-amber-500 text-white border-amber-500"
                            : ownedByOther
                            ? "bg-muted text-muted-foreground border-border opacity-60"
                            : "bg-background hover:bg-amber-50 border-border"
                        }`}
                        title={ownedByOther ? `Asignada a otra dinámica (se moverá aquí)` : `Mesa ${n}`}
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}

          <Button type="button" variant="outline" size="sm" onClick={addDynamic} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Añadir dinámica
          </Button>

          {(errors.length > 0 || warnings.length > 0) && (
            <div className="space-y-1.5">
              {errors.map((msg, i) => (
                <div key={`e${i}`} className="flex items-start gap-2 text-xs text-destructive">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>{msg}</span>
                </div>
              ))}
              {warnings.map((msg, i) => (
                <div key={`w${i}`} className="flex items-start gap-2 text-xs text-amber-700">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>{msg}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GameModeEditor;
