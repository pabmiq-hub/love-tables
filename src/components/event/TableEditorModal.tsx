import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { UserMinus, ArrowRightLeft, UserPlus, Table2, Users, Trash2, Plus } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface TableMember {
  id: string;
  name: string;
}

interface RoundData {
  round: number;
  tables: TableMember[][];
}

interface TableEditorModalProps {
  open: boolean;
  roundData: RoundData | null;
  allParticipants: { id: string; name: string; company_name?: string | null; checked_in?: boolean | null }[];
  isCompletedRound: boolean;
  onSave: (updatedRoundData: RoundData) => void;
  onClose: () => void;
}

type EditAction = 
  | { type: "remove"; tableIndex: number; participantId: string }
  | { type: "move"; fromTable: number; toTable: number; participantId: string }
  | { type: "add"; tableIndex: number; participantId: string; participantName: string };

const TableEditorModal = ({
  open,
  roundData,
  allParticipants,
  isCompletedRound,
  onSave,
  onClose,
}: TableEditorModalProps) => {
  const [editedTables, setEditedTables] = useState<TableMember[][]>([]);
  const [moveParticipant, setMoveParticipant] = useState<{ id: string; name: string; fromTable: number } | null>(null);
  const [addToTable, setAddToTable] = useState<number | null>(null);

  useEffect(() => {
    if (open && roundData) {
      setEditedTables(roundData.tables.map(t => [...t]));
      setMoveParticipant(null);
      setAddToTable(null);
    }
  }, [open, roundData?.round]);

  if (!roundData) return null;

  // All participant IDs currently assigned in this round
  const assignedIds = new Set(editedTables.flat().map(p => p.id));

  // Participants available to add (checked in but not in this round's tables)
  const availableParticipants = allParticipants.filter(
    p => p.checked_in && !assignedIds.has(p.id)
  );

  const handleRemove = (tableIndex: number, participantId: string) => {
    setEditedTables(prev => 
      prev.map((table, idx) => 
        idx === tableIndex ? table.filter(p => p.id !== participantId) : table
      )
    );
  };

  const handleMove = (toTableIndex: number) => {
    if (!moveParticipant) return;
    const { id, name, fromTable } = moveParticipant;
    
    setEditedTables(prev => 
      prev.map((table, idx) => {
        if (idx === fromTable) return table.filter(p => p.id !== id);
        if (idx === toTableIndex) return [...table, { id, name }];
        return table;
      })
    );
    setMoveParticipant(null);
  };

  const handleAdd = (tableIndex: number, participantId: string) => {
    const participant = allParticipants.find(p => p.id === participantId);
    if (!participant) return;
    
    setEditedTables(prev =>
      prev.map((table, idx) =>
        idx === tableIndex ? [...table, { id: participant.id, name: participant.name }] : table
      )
    );
    setAddToTable(null);
  };

  const handleSave = () => {
    onSave({ ...roundData, tables: editedTables });
  };

  const hasChanges = JSON.stringify(editedTables) !== JSON.stringify(roundData.tables);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Table2 className="w-5 h-5" />
            Editar mesas — Ronda {roundData.round}
          </DialogTitle>
          <DialogDescription>
            {isCompletedRound 
              ? "Esta ronda ya fue completada. Los cambios se guardarán pero no afectarán a encuentros pasados."
              : "Puedes quitar, mover o añadir participantes a las mesas."
            }
          </DialogDescription>
        </DialogHeader>

        {/* Move participant overlay */}
        {moveParticipant && (
          <Card className="border-primary border-2 bg-primary/5">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <ArrowRightLeft className="w-4 h-4 text-primary" />
                  <span>Moviendo a <strong>{moveParticipant.name}</strong> desde Mesa {moveParticipant.fromTable + 1}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setMoveParticipant(null)}>
                  Cancelar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Haz clic en "Recibir aquí" en la mesa destino</p>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {editedTables.map((table, tableIndex) => (
            <Card key={tableIndex} className="border">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Table2 className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm">Mesa {tableIndex + 1}</span>
                    <Badge variant="secondary" className="text-xs">{table.length} personas</Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    {moveParticipant && moveParticipant.fromTable !== tableIndex && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs h-7 border-primary text-primary"
                        onClick={() => handleMove(tableIndex)}
                      >
                        <ArrowRightLeft className="w-3 h-3 mr-1" />
                        Recibir aquí
                      </Button>
                    )}
                    {addToTable === tableIndex ? (
                      <div className="flex items-center gap-1">
                        <Select onValueChange={(v) => handleAdd(tableIndex, v)}>
                          <SelectTrigger className="h-7 w-[180px] text-xs">
                            <SelectValue placeholder="Seleccionar participante" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableParticipants.length === 0 ? (
                              <div className="p-2 text-xs text-muted-foreground">No hay participantes disponibles</div>
                            ) : (
                              availableParticipants.map(p => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.company_name || p.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setAddToTable(null)}>
                          ✕
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => { setAddToTable(tableIndex); setMoveParticipant(null); }}
                      >
                        <UserPlus className="w-3 h-3 mr-1" />
                        Añadir
                      </Button>
                    )}
                  </div>
                </div>

                {table.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-2">Mesa vacía</p>
                ) : (
                  <div className="space-y-1">
                    {table.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-1.5 rounded-md bg-background/50 hover:bg-background/80 transition-colors group">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-medium">
                            {member.name.charAt(0)}
                          </div>
                          <span className="text-sm">{member.name}</span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                            onClick={() => {
                              setMoveParticipant({ id: member.id, name: member.name, fromTable: tableIndex });
                              setAddToTable(null);
                            }}
                            title="Mover a otra mesa"
                          >
                            <ArrowRightLeft className="w-3 h-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                title="Quitar de la mesa"
                              >
                                <UserMinus className="w-3 h-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Quitar a {member.name}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Se eliminará de la Mesa {tableIndex + 1} en la Ronda {roundData.round}. Puedes volver a añadirlo después.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleRemove(tableIndex, member.id)}>
                                  Quitar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant="hero" onClick={handleSave} disabled={!hasChanges}>
            Guardar cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TableEditorModal;
