import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";

interface SuperLikeConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  recipientName: string;
  language?: "es" | "en";
}

const SuperLikeConfirmDialog = ({ open, onClose, onConfirm, recipientName, language = "es" }: SuperLikeConfirmDialogProps) => {
  const isEn = language === "en";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center mx-auto mb-2 shadow-lg">
            <Star className="w-8 h-8 text-white fill-white" />
          </div>
          <DialogTitle className="text-center text-xl">
            {isEn ? "Send Super Like?" : "¿Enviar Super Like?"}
          </DialogTitle>
          <DialogDescription className="text-center pt-2">
            {isEn ? (
              <>
                You're about to give your <strong className="text-amber-600">only Super Like</strong> of the event to{" "}
                <strong>{recipientName}</strong>. They will receive an anonymous notification immediately.
              </>
            ) : (
              <>
                Vas a dar tu <strong className="text-amber-600">único Super Like</strong> del evento a{" "}
                <strong>{recipientName}</strong>. Recibirá una notificación anónima inmediatamente.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            {isEn ? "Cancel" : "Cancelar"}
          </Button>
          <Button
            onClick={onConfirm}
            className="flex-1 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white shadow-md"
          >
            <Star className="w-4 h-4 mr-2 fill-white" />
            {isEn ? "Send Super Like" : "Enviar Super Like"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SuperLikeConfirmDialog;
