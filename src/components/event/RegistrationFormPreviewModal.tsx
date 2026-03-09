import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import DynamicRegistrationForm from "@/components/registration/DynamicRegistrationForm";
import type { FormField } from "@/components/event/RegistrationFormEditor";

interface RegistrationFormPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fields: FormField[];
  eventName: string;
  eventDate: string;
  eventTime: string | null;
  eventLocation: string | null;
  registrationSubtitle: string | null;
  registrationDescription: string | null;
  eventLang: "es" | "en";
}

const RegistrationFormPreviewModal = ({
  open,
  onOpenChange,
  fields,
  eventName,
  eventDate,
  eventTime,
  eventLocation,
  registrationSubtitle,
  registrationDescription,
  eventLang,
}: RegistrationFormPreviewModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle>Vista previa del formulario</DialogTitle>
          <DialogDescription>
            Así verán los participantes el formulario de inscripción
          </DialogDescription>
        </DialogHeader>
        <div className="px-4 pb-4">
          <DynamicRegistrationForm
            fields={fields}
            eventName={eventName}
            eventDate={eventDate ? new Date(eventDate + "T00:00:00") : null}
            eventTime={eventTime}
            eventLocation={eventLocation}
            registrationSubtitle={registrationSubtitle}
            registrationDescription={registrationDescription}
            eventLang={eventLang}
            isSubmitting={false}
            onSubmit={() => {}}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RegistrationFormPreviewModal;
