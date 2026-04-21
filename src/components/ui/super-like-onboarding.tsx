import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Star, Sparkles } from "lucide-react";

interface SuperLikeOnboardingProps {
  open: boolean;
  onClose: () => void;
  language?: "es" | "en";
}

const SuperLikeOnboarding = ({ open, onClose, language = "es" }: SuperLikeOnboardingProps) => {
  const isEn = language === "en";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="relative w-20 h-20 mx-auto mb-3">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Star className="w-10 h-10 text-white fill-white drop-shadow-md" />
            </div>
            <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-amber-400 animate-pulse" />
          </div>
          <DialogTitle className="text-center text-2xl">
            {isEn ? "You have 1 Super Like ⭐" : "Tienes 1 Super Like ⭐"}
          </DialogTitle>
          <DialogDescription className="text-center pt-2 space-y-3 text-base">
            <span className="block">
              {isEn
                ? "A unique way to highlight someone special at this event."
                : "Una forma única de destacar a alguien especial en este evento."}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="flex gap-3 items-start">
            <span className="text-2xl">🎯</span>
            <div>
              <p className="font-semibold text-sm">
                {isEn ? "1 per event" : "1 por evento"}
              </p>
              <p className="text-xs text-muted-foreground">
                {isEn ? "Use it wisely — it's your only one." : "Úsalo sabiamente — es el único que tienes."}
              </p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <span className="text-2xl">🤫</span>
            <div>
              <p className="font-semibold text-sm">
                {isEn ? "100% Anonymous" : "100% Anónimo"}
              </p>
              <p className="text-xs text-muted-foreground">
                {isEn ? "They'll know someone gave them a Super Like — but not who." : "Sabrán que alguien les ha dado un Super Like — pero no quién."}
              </p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <span className="text-2xl">✨</span>
            <div>
              <p className="font-semibold text-sm">
                {isEn ? "Boost your match" : "Aumenta tus posibilidades"}
              </p>
              <p className="text-xs text-muted-foreground">
                {isEn ? "Recipients get notified instantly — making them more likely to choose you back." : "El destinatario recibe una notificación inmediata, así que es más probable que también te elija."}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose} variant="hero" className="w-full bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white shadow-md">
            <Star className="w-4 h-4 mr-2 fill-white" />
            {isEn ? "Got it!" : "¡Entendido!"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SuperLikeOnboarding;
