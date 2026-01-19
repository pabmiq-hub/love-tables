import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckCircle2, Clock, Send, AlertCircle, ChevronDown } from "lucide-react";

interface Participant {
  id: string;
  name: string;
  email: string | null;
  selection_submitted_at?: string | null;
}

interface Selection {
  selector_id: string;
  selected_id: string;
  selection_type: string | null;
}

interface SelectionProgressProps {
  participants: Participant[];
  selections: Selection[];
  onSendReminder: (participantIds: string[]) => void;
  isSendingReminder: boolean;
}

const SelectionProgress = ({
  participants,
  selections,
  onSendReminder,
  isSendingReminder,
}: SelectionProgressProps) => {
  const [isPendingListOpen, setIsPendingListOpen] = useState(false);

  // Get unique selectors (participants who have submitted)
  const selectorIds = new Set(selections.map(s => s.selector_id));
  
  const respondedParticipants = participants.filter(p => selectorIds.has(p.id));
  const pendingParticipants = participants.filter(p => !selectorIds.has(p.id));
  
  const progressPercentage = participants.length > 0 
    ? Math.round((respondedParticipants.length / participants.length) * 100)
    : 0;

  const pendingWithEmail = pendingParticipants.filter(p => p.email);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Progreso de Selecciones
        </CardTitle>
        <CardDescription>
          {respondedParticipants.length} de {participants.length} participantes han respondido
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Respuestas recibidas</span>
            <span className="font-medium">{progressPercentage}%</span>
          </div>
          <Progress value={progressPercentage} className="h-3" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-primary/10 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span className="text-2xl font-bold text-primary">{respondedParticipants.length}</span>
            </div>
            <div className="text-sm text-muted-foreground">Han respondido</div>
          </div>
          <div className="bg-amber-500/10 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span className="text-2xl font-bold text-amber-500">{pendingParticipants.length}</span>
            </div>
            <div className="text-sm text-muted-foreground">Pendientes</div>
          </div>
        </div>

        {/* Collapsible Pending Participants List */}
        {pendingParticipants.length > 0 && (
          <Collapsible open={isPendingListOpen} onOpenChange={setIsPendingListOpen}>
            <div className="flex items-center justify-between">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 px-2 hover:bg-muted/50">
                  <ChevronDown className={`w-4 h-4 transition-transform ${isPendingListOpen ? "rotate-180" : ""}`} />
                  <span className="font-medium text-sm">Ver pendientes ({pendingParticipants.length})</span>
                </Button>
              </CollapsibleTrigger>
              {pendingWithEmail.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSendReminder(pendingWithEmail.map(p => p.id))}
                  disabled={isSendingReminder}
                >
                  <Send className="w-3 h-3 mr-1" />
                  {isSendingReminder ? "Enviando..." : `Recordatorio (${pendingWithEmail.length})`}
                </Button>
              )}
            </div>
            <CollapsibleContent>
              <div className="max-h-48 overflow-y-auto space-y-2 mt-3">
                {pendingParticipants.map(participant => (
                  <div 
                    key={participant.id} 
                    className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm"
                  >
                    <span>{participant.name}</span>
                    <span className={`text-xs ${participant.email ? 'text-muted-foreground' : 'text-destructive'}`}>
                      {participant.email ? participant.email : 'Sin email'}
                    </span>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* All responded */}
        {pendingParticipants.length === 0 && participants.length > 0 && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-center">
            <CheckCircle2 className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="font-medium text-primary">¡Todos han respondido!</p>
            <p className="text-sm text-muted-foreground">Puedes proceder a cerrar el evento y enviar emails</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SelectionProgress;
