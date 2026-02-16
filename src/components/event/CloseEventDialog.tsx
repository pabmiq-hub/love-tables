import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, AlertTriangle, Send, Clock, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Selection {
  selector_id: string;
  selected_id: string;
  selection_type: string | null;
}

interface Participant {
  id: string;
  name: string;
  email: string | null;
}

interface CloseEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participants: Participant[];
  selections: Selection[];
  onCloseAndSend: (deadlineHours: number) => void;
  onCloseWithoutSending: (deadlineHours: number) => void;
  onWait: () => void;
  isClosing: boolean;
}

const DEADLINE_OPTIONS = [
  { value: "24", label: "24 horas" },
  { value: "48", label: "48 horas" },
  { value: "72", label: "72 horas (3 días)" },
  { value: "120", label: "120 horas (5 días)" },
  { value: "168", label: "168 horas (7 días)" },
];

const CloseEventDialog = ({
  open,
  onOpenChange,
  participants,
  selections,
  onCloseAndSend,
  onCloseWithoutSending,
  onWait,
  isClosing,
}: CloseEventDialogProps) => {
  const [deadlineHours, setDeadlineHours] = useState("48");

  const selectorIds = new Set(selections.map(s => s.selector_id));
  const respondedCount = participants.filter(p => selectorIds.has(p.id)).length;
  const pendingCount = participants.length - respondedCount;
  const progressPercentage = participants.length > 0 
    ? Math.round((respondedCount / participants.length) * 100)
    : 0;
  
  const participantsWithEmail = participants.filter(p => p.email).length;
  const allResponded = pendingCount === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {allResponded ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-primary" />
                ¡Todos han respondido!
              </>
            ) : (
              <>
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Respuestas pendientes
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {allResponded
              ? "Todos los participantes han enviado sus selecciones. Puedes cerrar el evento y enviar los emails."
              : `${pendingCount} de ${participants.length} participantes aún no han respondido.`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progreso de respuestas</span>
              <span className="font-medium">{progressPercentage}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-primary/10 rounded-lg p-3 text-center">
              <div className="font-bold text-primary text-lg">{respondedCount}</div>
              <div className="text-muted-foreground">Respondieron</div>
            </div>
            <div className={`rounded-lg p-3 text-center ${pendingCount > 0 ? 'bg-amber-500/10' : 'bg-muted/50'}`}>
              <div className={`font-bold text-lg ${pendingCount > 0 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                {pendingCount}
              </div>
              <div className="text-muted-foreground">Pendientes</div>
            </div>
          </div>

          {/* Deadline selector */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Plazo para enviar selecciones</Label>
            <Select value={deadlineHours} onValueChange={setDeadlineHours}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEADLINE_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Los participantes tendrán este plazo para enviar sus selecciones. Pasado el plazo, no podrán acceder al panel.
            </p>
          </div>

          {/* Email info */}
          <div className="bg-muted/50 rounded-lg p-3 text-sm text-center">
            <span className="text-muted-foreground">
              {participantsWithEmail} participantes recibirán email
            </span>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button
            variant="hero"
            className="w-full"
            onClick={() => onCloseAndSend(parseInt(deadlineHours))}
            disabled={isClosing}
          >
            {isClosing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Cerrando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Cerrar evento y enviar emails
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            className="w-full"
            onClick={() => onCloseWithoutSending(parseInt(deadlineHours))}
            disabled={isClosing}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Cerrar sin enviar emails
          </Button>
          
          {pendingCount > 0 && (
            <Button
              variant="ghost"
              className="w-full"
              onClick={onWait}
              disabled={isClosing}
            >
              <Clock className="w-4 h-4 mr-2" />
              Esperar más respuestas
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CloseEventDialog;
