import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { UserPlus, Database, Lock } from "lucide-react";
import AddParticipantModal, { type EventCustomPreferences } from "./AddParticipantModal";
import AddParticipantFromCRM, { type CRMPickerParticipant } from "./AddParticipantFromCRM";
import { useFeatures } from "@/hooks/useFeatures";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Participant } from "@/lib/excelParser";

interface Props {
  open: boolean;
  onClose: () => void;
  eventId: string;
  excludeGlobalIds: Set<string>;
  customPreferences?: EventCustomPreferences;
  onAdd: (participant: Participant) => void | Promise<void>;
  onAddBulk: (participants: CRMPickerParticipant[]) => Promise<void> | void;
}

const AddParticipantTabsModal = ({
  open,
  onClose,
  eventId,
  excludeGlobalIds,
  customPreferences,
  onAdd,
  onAddBulk,
}: Props) => {
  const { hasFeature, isSuperAdmin } = useFeatures();
  const [tab, setTab] = useState<"manual" | "crm">("manual");
  const [reviewSeed, setReviewSeed] = useState<CRMPickerParticipant | null>(null);

  const crmEnabled = hasFeature("crm") || isSuperAdmin;

  // Reviewing a single CRM user: open the manual form pre-filled
  if (reviewSeed) {
    return (
      <AddParticipantModal
        onClose={() => {
          setReviewSeed(null);
          onClose();
        }}
        onAdd={async (p) => {
          // Preserve global_participant_id linkage by injecting it via id pattern? Not possible.
          // Instead the parent handler will re-link by email/phone.
          await onAdd(p);
        }}
        customPreferences={customPreferences}
        initialValues={reviewSeed}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Añadir participante</DialogTitle>
          <DialogDescription>
            Crea un nuevo participante o selecciónalo desde tu base de datos.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual" className="gap-2">
              <UserPlus className="w-4 h-4" />
              Nuevo
            </TabsTrigger>
            {crmEnabled ? (
              <TabsTrigger value="crm" className="gap-2">
                <Database className="w-4 h-4" />
                Desde base de datos
              </TabsTrigger>
            ) : (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Button variant="ghost" disabled className="w-full opacity-60 gap-2 h-9">
                        <Database className="w-4 h-4" />
                        Desde base de datos
                        <Lock className="w-3 h-3" />
                      </Button>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    Disponible en el plan Empresa (CRM)
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </TabsList>

          <TabsContent value="manual" className="flex-1 overflow-y-auto mt-4">
            <ManualFormInline
              onAdd={async (p) => {
                await onAdd(p);
                onClose();
              }}
              onCancel={onClose}
              customPreferences={customPreferences}
            />
          </TabsContent>

          {crmEnabled && (
            <TabsContent value="crm" className="flex-1 overflow-hidden mt-4">
              <AddParticipantFromCRM
                eventId={eventId}
                excludeGlobalIds={excludeGlobalIds}
                onPickBulk={async (people) => {
                  await onAddBulk(people);
                  onClose();
                }}
                onPickSingleForReview={(person) => setReviewSeed(person)}
              />
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

// Re-uses the manual form inside the dialog (without its own modal chrome)
const ManualFormInline = ({
  onAdd,
  onCancel,
  customPreferences,
}: {
  onAdd: (p: Participant) => void | Promise<void>;
  onCancel: () => void;
  customPreferences?: EventCustomPreferences;
}) => {
  // Simply mount the existing modal; its overlay sits above the dialog.
  // For a cleaner UX we render it without the outer dialog overlay by reusing the inline mode.
  return (
    <AddParticipantModal
      onClose={onCancel}
      onAdd={onAdd}
      customPreferences={customPreferences}
      embedded
    />
  );
};

export default AddParticipantTabsModal;
