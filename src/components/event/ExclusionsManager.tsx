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

interface Participant {
  id: string;
  name: string;
  gender: string | null;
  age_range: string | null;
  checked_in: boolean;
}

interface Exclusion {
  id: string;
  participant_1_id: string;
  participant_2_id: string;
  reason: string | null;
}

interface ExclusionsManagerProps {
  eventId: string;
  participants: Participant[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExclusionsChange?: (exclusions: Exclusion[]) => void;
}

export default function ExclusionsManager({
  eventId,
  participants,
  open,
  onOpenChange,
  onExclusionsChange,
}: ExclusionsManagerProps) {
  const { toast } = useToast();
  const [exclusions, setExclusions] = useState<Exclusion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm1, setSearchTerm1] = useState("");
  const [searchTerm2, setSearchTerm2] = useState("");
  const [selectedParticipant1, setSelectedParticipant1] = useState<Participant | null>(null);
  const [selectedParticipant2, setSelectedParticipant2] = useState<Participant | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Only show checked-in participants
  const checkedInParticipants = useMemo(
    () => participants.filter((p) => p.checked_in),
    [participants]
  );

  const filteredParticipants1 = useMemo(() => {
    if (!searchTerm1) return checkedInParticipants;
    return checkedInParticipants.filter((p) =>
      p.name.toLowerCase().includes(searchTerm1.toLowerCase())
    );
  }, [checkedInParticipants, searchTerm1]);

  const filteredParticipants2 = useMemo(() => {
    if (!searchTerm2) return checkedInParticipants.filter((p) => p.id !== selectedParticipant1?.id);
    return checkedInParticipants.filter(
      (p) =>
        p.id !== selectedParticipant1?.id &&
        p.name.toLowerCase().includes(searchTerm2.toLowerCase())
    );
  }, [checkedInParticipants, searchTerm2, selectedParticipant1]);

  useEffect(() => {
    if (open) {
      loadExclusions();
    }
  }, [open, eventId]);

  const loadExclusions = async () => {
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
      setExclusions(data || []);
      onExclusionsChange?.(data || []);
    }
    setIsLoading(false);
  };

  const addExclusion = async () => {
    if (!selectedParticipant1 || !selectedParticipant2) return;

    // Check if exclusion already exists (in either direction)
    const exists = exclusions.some(
      (e) =>
        (e.participant_1_id === selectedParticipant1.id &&
          e.participant_2_id === selectedParticipant2.id) ||
        (e.participant_1_id === selectedParticipant2.id &&
          e.participant_2_id === selectedParticipant1.id)
    );

    if (exists) {
      toast({
        title: "Ya existe",
        description: "Esta exclusión ya está registrada",
        variant: "destructive",
      });
      return;
    }

    setIsAdding(true);

    const { data, error } = await supabase
      .from("participant_exclusions")
      .insert({
        event_id: eventId,
        participant_1_id: selectedParticipant1.id,
        participant_2_id: selectedParticipant2.id,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo añadir la exclusión",
        variant: "destructive",
      });
    } else if (data) {
      const newExclusions = [...exclusions, data];
      setExclusions(newExclusions);
      onExclusionsChange?.(newExclusions);
      setSelectedParticipant1(null);
      setSelectedParticipant2(null);
      setSearchTerm1("");
      setSearchTerm2("");
      toast({
        title: "Exclusión añadida",
        description: `${selectedParticipant1.name} y ${selectedParticipant2.name} no coincidirán en las mesas`,
      });
    }

    setIsAdding(false);
  };

  const removeExclusion = async (exclusionId: string) => {
    const { error } = await supabase
      .from("participant_exclusions")
      .delete()
      .eq("id", exclusionId);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la exclusión",
        variant: "destructive",
      });
    } else {
      const newExclusions = exclusions.filter((e) => e.id !== exclusionId);
      setExclusions(newExclusions);
      onExclusionsChange?.(newExclusions);
      toast({
        title: "Exclusión eliminada",
        description: "Los participantes podrán coincidir en las mesas",
      });
    }
  };

  const getParticipantName = (participantId: string) => {
    return participants.find((p) => p.id === participantId)?.name || "Desconocido";
  };

  const getParticipantInfo = (participantId: string) => {
    return participants.find((p) => p.id === participantId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserX className="w-5 h-5" />
            Gestionar Exclusiones
          </DialogTitle>
          <DialogDescription>
            Selecciona participantes que no deben coincidir en ninguna mesa. Solo se muestran los participantes con check-in.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Add new exclusion */}
          <div className="border rounded-lg p-4 bg-muted/30">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Añadir nueva exclusión
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* First participant */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Participante 1
                </label>
                {selectedParticipant1 ? (
                  <div className="flex items-center gap-2 p-2 border rounded-md bg-background">
                    <span className="flex-1 font-medium">{selectedParticipant1.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedParticipant1(null);
                        setSelectedParticipant2(null);
                        setSearchTerm2("");
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar participante..."
                        value={searchTerm1}
                        onChange={(e) => setSearchTerm1(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <ScrollArea className="h-32 border rounded-md">
                      <div className="p-1">
                        {filteredParticipants1.length === 0 ? (
                          <p className="p-2 text-sm text-muted-foreground text-center">
                            No hay participantes con check-in
                          </p>
                        ) : (
                          filteredParticipants1.map((p) => (
                            <button
                              key={p.id}
                              onClick={() => {
                                setSelectedParticipant1(p);
                                setSearchTerm1("");
                              }}
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
                  </div>
                )}
              </div>

              {/* Second participant */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Participante 2
                </label>
                {!selectedParticipant1 ? (
                  <div className="h-32 border rounded-md flex items-center justify-center text-sm text-muted-foreground">
                    Selecciona el primer participante
                  </div>
                ) : selectedParticipant2 ? (
                  <div className="flex items-center gap-2 p-2 border rounded-md bg-background">
                    <span className="flex-1 font-medium">{selectedParticipant2.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedParticipant2(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar participante..."
                        value={searchTerm2}
                        onChange={(e) => setSearchTerm2(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <ScrollArea className="h-32 border rounded-md">
                      <div className="p-1">
                        {filteredParticipants2.length === 0 ? (
                          <p className="p-2 text-sm text-muted-foreground text-center">
                            No hay más participantes
                          </p>
                        ) : (
                          filteredParticipants2.map((p) => (
                            <button
                              key={p.id}
                              onClick={() => {
                                setSelectedParticipant2(p);
                                setSearchTerm2("");
                              }}
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
                  </div>
                )}
              </div>
            </div>

            {selectedParticipant1 && selectedParticipant2 && (
              <div className="mt-4 flex justify-end">
                <Button onClick={addExclusion} disabled={isAdding}>
                  <Plus className="w-4 h-4 mr-2" />
                  {isAdding ? "Añadiendo..." : "Añadir exclusión"}
                </Button>
              </div>
            )}
          </div>

          {/* Existing exclusions */}
          <div className="flex-1 overflow-hidden">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Exclusiones activas ({exclusions.length})
            </h4>
            
            <ScrollArea className="h-48 border rounded-lg">
              {isLoading ? (
                <div className="p-4 text-center text-muted-foreground">
                  Cargando exclusiones...
                </div>
              ) : exclusions.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  No hay exclusiones configuradas
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {exclusions.map((exclusion) => {
                    const p1 = getParticipantInfo(exclusion.participant_1_id);
                    const p2 = getParticipantInfo(exclusion.participant_2_id);
                    return (
                      <div
                        key={exclusion.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-md"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{p1?.name || "Desconocido"}</span>
                            {p1?.gender && (
                              <Badge variant="outline" className="text-xs">
                                {p1.gender}
                              </Badge>
                            )}
                          </div>
                          <span className="text-muted-foreground">↔</span>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{p2?.name || "Desconocido"}</span>
                            {p2?.gender && (
                              <Badge variant="outline" className="text-xs">
                                {p2.gender}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeExclusion(exclusion.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
