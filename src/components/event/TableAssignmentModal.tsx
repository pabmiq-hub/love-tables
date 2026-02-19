import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Users } from "lucide-react";

interface TableMember {
  id: string;
  name: string;
}

interface RoundData {
  round: number;
  tables: TableMember[][];
}

interface TableAssignmentModalProps {
  open: boolean;
  participant: { id: string; name: string; company_name?: string | null } | null;
  tables: RoundData[];
  completedRounds: number[];
  currentRound: number;
  onConfirm: (updatedTables: RoundData[]) => void;
  onClose: () => void;
}

const TableAssignmentModal = ({
  open,
  participant,
  tables,
  completedRounds,
  currentRound,
  onConfirm,
  onClose,
}: TableAssignmentModalProps) => {
  // For each pending round, store the selected table index (or "auto")
  const [assignments, setAssignments] = useState<Record<number, number | "auto">>({});

  const pendingRounds = tables.filter(r => !completedRounds.includes(r.round));

  useEffect(() => {
    // Reset assignments when modal opens
    if (open && participant) {
      const initial: Record<number, number | "auto"> = {};
      pendingRounds.forEach(r => {
        initial[r.round] = "auto";
      });
      setAssignments(initial);
    }
  }, [open, participant?.id]);

  if (!participant) return null;

  const displayName = participant.company_name || participant.name;

  const handleAutoAssignAll = () => {
    const newAssignments: Record<number, number | "auto"> = {};
    pendingRounds.forEach(r => {
      newAssignments[r.round] = "auto";
    });
    setAssignments(newAssignments);
  };

  const getAutoTableIndex = (roundTables: TableMember[][]): number => {
    let minSize = Infinity;
    let minIdx = 0;
    roundTables.forEach((table, idx) => {
      if (table.length < minSize) {
        minSize = table.length;
        minIdx = idx;
      }
    });
    return minIdx;
  };

  const handleConfirm = () => {
    const updatedTables = tables.map(roundData => {
      if (completedRounds.includes(roundData.round)) return roundData;

      const assignment = assignments[roundData.round];
      const targetIdx = assignment === "auto"
        ? getAutoTableIndex(roundData.tables)
        : assignment;

      const newTables = roundData.tables.map((table, idx) => {
        if (idx === targetIdx) {
          return [...table, { id: participant.id, name: participant.name }];
        }
        return table;
      });

      return { ...roundData, tables: newTables };
    });

    onConfirm(updatedTables);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Asignar a mesas</DialogTitle>
          <DialogDescription>
            Asigna a <strong>{displayName}</strong> a las mesas de las rondas pendientes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button variant="outline" size="sm" className="w-full" onClick={handleAutoAssignAll}>
            <Sparkles className="w-4 h-4 mr-2" />
            Asignación automática (mesa con menos personas)
          </Button>

          {pendingRounds.map(roundData => {
            const isCurrentRound = roundData.round === currentRound;
            return (
              <div key={roundData.round} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">
                    Ronda {roundData.round}
                  </span>
                  {isCurrentRound && (
                    <Badge variant="default" className="text-xs">Activa</Badge>
                  )}
                </div>

                <Select
                  value={String(assignments[roundData.round] ?? "auto")}
                  onValueChange={(v) => setAssignments(prev => ({
                    ...prev,
                    [roundData.round]: v === "auto" ? "auto" : parseInt(v),
                  }))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecciona mesa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">
                      <span className="flex items-center gap-2">
                        <Sparkles className="w-3 h-3" />
                        Automático
                      </span>
                    </SelectItem>
                    {roundData.tables.map((table, idx) => (
                      <SelectItem key={idx} value={String(idx)}>
                        <span className="flex items-center gap-2">
                          <Users className="w-3 h-3" />
                          Mesa {idx + 1} ({table.length} personas)
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Preview: who's at the selected table */}
                {assignments[roundData.round] !== "auto" && assignments[roundData.round] !== undefined && (
                  <div className="text-xs text-muted-foreground pl-2">
                    {roundData.tables[assignments[roundData.round] as number]?.map(m => m.name).join(", ")}
                  </div>
                )}
                {assignments[roundData.round] === "auto" && (
                  <div className="text-xs text-muted-foreground pl-2">
                    Mesa {getAutoTableIndex(roundData.tables) + 1} — {roundData.tables[getAutoTableIndex(roundData.tables)]?.length} personas
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant="hero" onClick={handleConfirm}>Confirmar asignación</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TableAssignmentModal;
