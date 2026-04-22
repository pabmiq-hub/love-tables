import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { X, Plus, Search, UserPlus, Users, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  buildPairRowsForGroup,
  groupPairsByGroupId,
  type GroupedPairs,
} from "@/lib/inclusions";

interface Participant {
  id: string;
  name: string;
  gender: string | null;
  age_range: string | null;
  checked_in: boolean;
}

interface InclusionRow {
  id: string;
  participant_1_id: string;
  participant_2_id: string;
  reason: string | null;
  group_id: string | null;
}

interface InclusionsManagerProps {
  eventId: string;
  participants: Participant[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInclusionsChange?: (inclusions: InclusionRow[]) => void;
  /** Max participants per table; used to prevent groups bigger than the table. */
  tableSize?: number;
}

export default function InclusionsManager({
  eventId,
  participants,
  open,
  onOpenChange,
  onInclusionsChange,
  tableSize,
}: InclusionsManagerProps) {
  const { toast } = useToast();
  const [rows, setRows] = useState<InclusionRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  // Members of the group being built (in order of selection).
  const [draftMembers, setDraftMembers] = useState<Participant[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  const grouped: GroupedPairs[] = useMemo(() => groupPairsByGroupId(rows), [rows]);

  const eligibleParticipants = participants;

  const availableForDraft = useMemo(() => {
    const draftIds = new Set(draftMembers.map((m) => m.id));
    const filtered = eligibleParticipants.filter((p) => !draftIds.has(p.id));
    if (!searchTerm) return filtered;
    return filtered.filter((p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [eligibleParticipants, draftMembers, searchTerm]);

  useEffect(() => {
    if (open) {
      loadRows();
    } else {
      // Reset draft when closing.
      setDraftMembers([]);
      setSearchTerm("");
      setPickerOpen(false);
    }
  }, [open, eventId]);

  const loadRows = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("participant_inclusions" as any)
      .select("*")
      .eq("event_id", eventId);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las inclusiones",
        variant: "destructive",
      });
    } else {
      const list = (data || []) as unknown as InclusionRow[];
      setRows(list);
      onInclusionsChange?.(list);
    }
    setIsLoading(false);
  };

  const addMember = (p: Participant) => {
    setDraftMembers((prev) => [...prev, p]);
    setSearchTerm("");
    setPickerOpen(false);
  };

  const removeMember = (id: string) => {
    setDraftMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const tooBig = !!tableSize && draftMembers.length > tableSize;

  const addGroup = async () => {
    if (draftMembers.length < 2) {
      toast({
        title: "Selecciona al menos 2 personas",
        description: "Un grupo debe tener 2 o más participantes",
        variant: "destructive",
      });
      return;
    }
    if (tooBig) {
      toast({
        title: "Grupo demasiado grande",
        description: `El grupo (${draftMembers.length}) supera el tamaño de mesa (${tableSize})`,
        variant: "destructive",
      });
      return;
    }

    setIsAdding(true);
    const groupId = crypto.randomUUID();
    const ids = draftMembers.map((m) => m.id);
    const newRows = buildPairRowsForGroup(eventId, ids, groupId, null);

    const { data, error } = await supabase
      .from("participant_inclusions" as any)
      .insert(newRows)
      .select();

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo añadir la inclusión",
        variant: "destructive",
      });
    } else if (data) {
      const next = [...rows, ...((data as unknown) as InclusionRow[])];
      setRows(next);
      onInclusionsChange?.(next);
      setDraftMembers([]);
      setSearchTerm("");
      toast({
        title: "Inclusión añadida",
        description:
          draftMembers.length === 2
            ? `${draftMembers[0].name} y ${draftMembers[1].name} se sentarán juntos`
            : `${draftMembers.length} participantes se sentarán siempre juntos`,
      });
    }
    setIsAdding(false);
  };

  const removeGroup = async (group: GroupedPairs) => {
    const { error } = await supabase
      .from("participant_inclusions" as any)
      .delete()
      .in("id", group.rowIds);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la inclusión",
        variant: "destructive",
      });
    } else {
      const removed = new Set(group.rowIds);
      const next = rows.filter((r) => !removed.has(r.id));
      setRows(next);
      onInclusionsChange?.(next);
      toast({
        title: "Inclusión eliminada",
        description: "Los participantes ya no estarán forzados a coincidir",
      });
    }
  };

  const getParticipantInfo = (participantId: string) =>
    participants.find((p) => p.id === participantId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-emerald-600" />
            Gestionar Inclusiones
          </DialogTitle>
          <DialogDescription>
            Selecciona <strong>2 o más participantes</strong> que deben sentarse{" "}
            <strong>siempre en la misma mesa</strong> en todas las rondas.
            Útil para parejas, amigos o invitados que vienen juntos.
            {tableSize ? (
              <span className="block mt-1 text-xs">
                Tamaño máximo de grupo en este evento: <strong>{tableSize}</strong> (tamaño de mesa).
              </span>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Builder */}
          <div className="border rounded-lg p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-600" />
              Crear nuevo grupo de inclusión
            </h4>

            {/* Members chips */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Miembros del grupo ({draftMembers.length})
              </label>
              {draftMembers.length === 0 ? (
                <div className="p-3 border rounded-md bg-background text-sm text-muted-foreground">
                  Aún no has añadido a nadie. Empieza pulsando "Añadir persona".
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-background min-h-[44px]">
                  {draftMembers.map((m, idx) => (
                    <Badge
                      key={m.id}
                      variant="secondary"
                      className="pl-2 pr-1 py-1 gap-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-100"
                    >
                      <span className="text-xs opacity-60">{idx + 1}.</span>
                      <span className="font-medium">{m.name}</span>
                      <button
                        onClick={() => removeMember(m.id)}
                        className="ml-1 rounded hover:bg-emerald-200 dark:hover:bg-emerald-800 p-0.5"
                        aria-label={`Quitar ${m.name}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Picker */}
            {pickerOpen ? (
              <div className="mt-3 space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    autoFocus
                    placeholder="Buscar participante..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <ScrollArea className="h-40 border rounded-md">
                  <div className="p-1">
                    {availableForDraft.length === 0 ? (
                      <p className="p-2 text-sm text-muted-foreground text-center">
                        No hay más participantes disponibles
                      </p>
                    ) : (
                      availableForDraft.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => addMember(p)}
                          className="w-full text-left p-2 hover:bg-accent rounded-md text-sm flex items-center justify-between"
                        >
                          <span>{p.name}</span>
                          {p.gender && (
                            <Badge variant="outline" className="text-xs">
                              {p.gender}
                            </Badge>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </ScrollArea>
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPickerOpen(false);
                      setSearchTerm("");
                    }}
                  >
                    Cerrar buscador
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPickerOpen(true)}
                  disabled={availableForDraft.length === 0}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Añadir persona
                </Button>
              </div>
            )}

            {tooBig && (
              <div className="mt-3 flex items-start gap-2 p-2 rounded-md bg-destructive/10 text-destructive text-sm">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  Has seleccionado {draftMembers.length} personas pero las mesas son de{" "}
                  {tableSize}. Reduce el grupo o aumenta el tamaño de mesa.
                </span>
              </div>
            )}

            {draftMembers.length >= 2 && (
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDraftMembers([])}
                >
                  Vaciar
                </Button>
                <Button
                  onClick={addGroup}
                  disabled={isAdding || tooBig}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {isAdding
                    ? "Añadiendo..."
                    : `Crear grupo de ${draftMembers.length}`}
                </Button>
              </div>
            )}
          </div>

          {/* Existing groups */}
          <div className="flex-1 overflow-hidden">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Inclusiones activas ({grouped.length})
            </h4>

            <ScrollArea className="h-48 border rounded-lg">
              {isLoading ? (
                <div className="p-4 text-center text-muted-foreground">
                  Cargando inclusiones...
                </div>
              ) : grouped.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  No hay inclusiones configuradas
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {grouped.map((g) => (
                    <div
                      key={g.groupId}
                      className="flex items-start justify-between gap-3 p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-md border border-emerald-100 dark:border-emerald-900"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-xs uppercase tracking-wide text-emerald-700 dark:text-emerald-400 mb-1">
                          Grupo de {g.participantIds.length}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {g.participantIds.map((pid, idx) => {
                            const info = getParticipantInfo(pid);
                            return (
                              <span key={pid} className="flex items-center gap-1.5">
                                <span className="font-medium text-sm">
                                  {info?.name || "Desconocido"}
                                </span>
                                {info?.gender && (
                                  <Badge variant="outline" className="text-xs">
                                    {info.gender}
                                  </Badge>
                                )}
                                {idx < g.participantIds.length - 1 && (
                                  <span className="text-emerald-600 font-bold">+</span>
                                )}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeGroup(g)}
                        className="text-destructive hover:text-destructive shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
