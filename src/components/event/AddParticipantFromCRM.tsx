import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Database, ChevronRight, Mail, Phone, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Participant } from "@/lib/excelParser";

export interface CRMPickerParticipant extends Participant {
  globalParticipantId: string;
}

interface CRMCandidate {
  id: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  events_attended: number;
  // Last known participant snapshot
  last_birth_date?: string | null;
  last_age_range?: string | null;
  last_preferred_age_range?: string | null;
  last_preference?: string | null;
  last_dating_preference?: string | null;
  last_gender?: string | null;
}

interface Props {
  eventId: string;
  excludeGlobalIds: Set<string>;
  onPickBulk: (people: CRMPickerParticipant[]) => Promise<void> | void;
  onPickSingleForReview: (person: CRMPickerParticipant) => void;
}

const computeAge = (birthDate?: string | null): number | undefined => {
  if (!birthDate) return undefined;
  const today = new Date();
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return undefined;
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

const AddParticipantFromCRM = ({
  eventId,
  excludeGlobalIds,
  onPickBulk,
  onPickSingleForReview,
}: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [candidates, setCandidates] = useState<CRMCandidate[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<"bulk" | "review">("bulk");

  // Stable key so parent-created Sets don't re-fire the effect on every render.
  const excludeKey = useMemo(
    () => Array.from(excludeGlobalIds).sort().join(","),
    [excludeGlobalIds]
  );

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      setLoading(true);
      try {
        // 1. Load all global participants for this organizer
        const { data: globals, error } = await supabase
          .from("global_participants")
          .select("id, display_name, email, phone, events_attended")
          .eq("organizer_id", user.id)
          .order("display_name");

        if (error) throw error;

        const excludeSet = new Set(excludeKey ? excludeKey.split(",") : []);
        const filtered = (globals || []).filter((g) => !excludeSet.has(g.id));

        if (filtered.length === 0) {
          setCandidates([]);
          setLoading(false);
          return;
        }

        // 2. For each global, pull last known participant snapshot (latest by created_at)
        const ids = filtered.map((g) => g.id);
        const { data: parts } = await supabase
          .from("participants")
          .select(
            "global_participant_id, birth_date, age_range, preferred_age_range, preference, dating_preference, gender, created_at"
          )
          .in("global_participant_id", ids)
          .order("created_at", { ascending: false });

        const snapshotMap = new Map<string, CRMCandidate>();
        for (const g of filtered) {
          snapshotMap.set(g.id, {
            id: g.id,
            display_name: g.display_name,
            email: g.email,
            phone: g.phone,
            events_attended: g.events_attended,
          });
        }
        for (const p of parts || []) {
          const gid = p.global_participant_id;
          if (!gid) continue;
          const c = snapshotMap.get(gid);
          if (!c || c.last_birth_date !== undefined) continue; // only first (most recent)
          c.last_birth_date = p.birth_date;
          c.last_age_range = p.age_range;
          c.last_preferred_age_range = p.preferred_age_range;
          c.last_preference = p.preference;
          c.last_dating_preference = p.dating_preference;
          c.last_gender = p.gender;
        }

        setCandidates(Array.from(snapshotMap.values()));
      } catch (e) {
        console.error(e);
        toast({
          title: "Error",
          description: "No se pudo cargar la base de datos",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, excludeKey]);

  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter((c) => {
      return (
        c.display_name.toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.phone || "").toLowerCase().includes(q)
      );
    });
  }, [candidates, search]);

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toCRMPicker = (c: CRMCandidate): CRMPickerParticipant => {
    const age = computeAge(c.last_birth_date) ?? 0;
    return {
      id: Math.random().toString(36).substring(2, 11),
      globalParticipantId: c.id,
      name: c.display_name,
      email: c.email || undefined,
      phone: c.phone || undefined,
      birthDate: c.last_birth_date || undefined,
      age,
      ageRange: c.last_age_range || "",
      preferredAgeRange: c.last_preferred_age_range || "",
      preference: c.last_preference || "",
      datingPreference: c.last_dating_preference || undefined,
      gender: c.last_gender || "",
      isReturningParticipant: true,
    };
  };

  const handleBulkAdd = async () => {
    const picked = filteredList.filter((c) => selectedIds.has(c.id));
    if (picked.length === 0) return;
    setSubmitting(true);
    try {
      await onPickBulk(picked.map(toCRMPicker));
      setSelectedIds(new Set());
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3 py-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 max-h-[70vh]">
      {/* Mode toggle */}
      <div className="flex items-center gap-2 p-1 bg-muted rounded-lg">
        <Button
          type="button"
          variant={mode === "bulk" ? "default" : "ghost"}
          size="sm"
          className="flex-1"
          onClick={() => setMode("bulk")}
        >
          Modo rápido (múltiples)
        </Button>
        <Button
          type="button"
          variant={mode === "review" ? "default" : "ghost"}
          size="sm"
          className="flex-1"
          onClick={() => setMode("review")}
        >
          Revisión individual
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, email o teléfono..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Helper text */}
      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <Database className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        <p>
          {mode === "bulk"
            ? "Selecciona varios usuarios y añádelos directamente con los datos de su última participación."
            : "Pulsa un usuario para abrir el formulario con sus datos pre-rellenados y revisarlos antes de añadirlo."}
        </p>
      </div>

      {/* List */}
      {filteredList.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          {candidates.length === 0
            ? "No tienes usuarios disponibles en tu base de datos. Los usuarios que ya están inscritos en este evento no aparecen aquí."
            : "Ningún usuario coincide con la búsqueda."}
        </div>
      ) : (
        <ScrollArea className="flex-1 min-h-0 max-h-[45vh] pr-3">
          <div className="space-y-2">
            {filteredList.map((c) => {
              const checked = selectedIds.has(c.id);
              const handleClick = () => {
                if (mode === "bulk") toggle(c.id);
                else onPickSingleForReview(toCRMPicker(c));
              };
              return (
                <div
                  key={c.id}
                  onClick={handleClick}
                  className={`group flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    checked && mode === "bulk"
                      ? "bg-primary/5 border-primary"
                      : "hover:bg-accent/50"
                  }`}
                >
                  {mode === "bulk" && (
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggle(c.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{c.display_name}</p>
                      <Badge variant="secondary" className="text-xs gap-1">
                        <Calendar className="w-3 h-3" />
                        {c.events_attended}{" "}
                        {c.events_attended === 1 ? "evento" : "eventos"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                      {c.email && (
                        <span className="flex items-center gap-1 truncate">
                          <Mail className="w-3 h-3" />
                          {c.email}
                        </span>
                      )}
                      {c.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {c.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  {mode === "review" && (
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {/* Footer action */}
      {mode === "bulk" && (
        <div className="flex items-center justify-between pt-2 border-t">
          <p className="text-sm text-muted-foreground">
            {selectedIds.size} seleccionado{selectedIds.size === 1 ? "" : "s"}
          </p>
          <Button
            variant="hero"
            disabled={selectedIds.size === 0 || submitting}
            onClick={handleBulkAdd}
          >
            {submitting
              ? "Añadiendo..."
              : `Añadir ${selectedIds.size > 0 ? `(${selectedIds.size})` : ""}`}
          </Button>
        </div>
      )}
    </div>
  );
};

export default AddParticipantFromCRM;
