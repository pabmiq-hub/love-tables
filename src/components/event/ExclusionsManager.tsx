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
import { X, Plus, Search, UserX, Users } from "lucide-react";
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

interface ExclusionRow {
  id: string;
  participant_1_id: string;
  participant_2_id: string;
  reason: string | null;
  group_id: string | null;
}

interface ExclusionsManagerProps {
  eventId: string;
  participants: Participant[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExclusionsChange?: (exclusions: ExclusionRow[]) => void;
}

export default function ExclusionsManager({
  eventId,
  participants,
  open,
  onOpenChange,
  onExclusionsChange,
}: ExclusionsManagerProps) {
  const { toast } = useToast();
  const [rows, setRows] = useState<ExclusionRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  // Members of the group being built (in order of selection).
  const [draftMembers, setDraftMembers] = useState<Participant[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  const grouped: GroupedPairs[] = useMemo(() => groupPairsByGroupId(rows), [rows]);

  // Only show checked-in participants
  const checkedInParticipants = useMemo(
    () => participants.filter((p) => p.checked_in),
    [participants]
  );

  const availableForDraft = useMemo(() => {
    const draftIds = new Set(draftMembers.map((m) => m.id));
    const filtered = checkedInParticipants.filter((p) => !draftIds.has(p.id));
    if (!searchTerm) return filtered;
    return filtered.filter((p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [checkedInParticipants, draftMembers, searchTerm]);

  useEffect(() => {
    if (open) {
      loadRows();
    } else {
      setDraftMembers([]);
      setSearchTerm("");
      setPickerOpen(false);
    }
  }, [open, eventId]);

  const loadRows = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("participant_exclusions")
      .select("*")
      .eq("event_id", eventId);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las exclusiones",
        variant: "destructive",
      });
    } else {
      const list = (data || []) as unknown as ExclusionRow[];
      setRows(list);
      onExclusionsChange?.(list);
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

  const addGroup = async () => {
    if (draftMembers.length < 2) {
      toast({
        title: "Selecciona al menos 2 personas",
        description: "Un grupo debe tener 2 o más participantes",
        variant: "destructive",
      });
      return;
    }

    setIsAdding(true);
    const groupId = crypto.randomUUID();
    const ids = draftMembers.map((m) => m.id);
    const newRows = buildPairRowsForGroup(eventId, ids, groupId, null);

    const { data, error } = await supabase
      .from("participant_exclusions")
      .insert(newRows as any)
      .select();

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo añadir la exclusión",
        variant: "destructive",
      });
    } else if (data) {
      const next = [...rows, ...((data as unknown) as ExclusionRow[])];
      setRows(next);
      onExclusionsChange?.(next);
      setDraftMembers([]);
      setSearchTerm("");
      toast({
        title: "Exclusión añadida",
        description:
          draftMembers.length === 2
            ? `${draftMembers[0].name} y ${draftMembers[1].name} no coincidirán`
            : `Las ${draftMembers.length} personas no coincidirán entre sí`,
      });
    }
    setIsAdding(false);
  };

  const removeGroup = async (group: GroupedPairs) => {
    const { error } = await supabase
      .from("participant_exclusions")
      .delete()
      .in("id", group.rowIds);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la exclusión",
        variant: "destructive",
      });
    } else {
      const removed = new Set(group.rowIds);
      const next = rows.filter((r) => !removed.has(r.id));
      setRows(next);
      onExclusionsChange?.(next);
      toast({
        title: "Exclusión eliminada",
        description: "Los participantes podrán coincidir en las mesas",
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
            <UserX className="w-5 h-5" />
            Gestionar Exclusiones
          </DialogTitle>
          <DialogDescription>
            Selecciona <strong>2 o más participantes</strong> que no deben coincidir
            en ninguna mesa. Si añades 3 o más, ninguno coincidirá con otro del grupo.
            Solo se muestran los participantes con check-in.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Builder */}
          <div className="border rounded-lg p-4 bg-muted/30">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Crear nuevo grupo de exclusión
            </h4>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Miembros del grupo ({draftMembers.length})
              </label>
              {draftMembers.length === 0 ? (
                <div className="p-3 border rounded-md bg-background text-sm text-muted-foreground">
                  Aún no has añadido a nadie. Empieza pulsando “+ Añadir persona”.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-background min-h-[44px]">
                  {draftMembers.map((m, idx) => (
                    <Badge
                      key={m.id}
                      variant="secondary"
                      className="pl-2 pr-1 py-1 gap-1"
                    >
                      <span className="text-xs opacity-60">{idx + 1}.</span>
                      <span className="font-medium">{m.name}</span>
                      <button
                        onClick={() => removeMember(m.id)}
                        className="ml-1 rounded hover:bg-muted p-0.5"
                        aria-label={`Quitar ${m.name}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

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
                        No hay más participantes con check-in
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

            {draftMembers.length >= 2 && (
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDraftMembers([])}
                >
                  Vaciar
                </Button>
                <Button onClick={addGroup} disabled={isAdding}>
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
              Exclusiones activas ({grouped.length})
            </h4>

            <ScrollArea className="h-48 border rounded-lg">
              {isLoading ? (
                <div className="p-4 text-center text-muted-foreground">
                  Cargando exclusiones...
                </div>
              ) : grouped.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  No hay exclusiones configuradas
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {grouped.map((g) => (
                    <div
                      key={g.groupId}
                      className="flex items-start justify-between gap-3 p-3 bg-muted/50 rounded-md"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
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
                                  <span className="text-muted-foreground">↔</span>
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
