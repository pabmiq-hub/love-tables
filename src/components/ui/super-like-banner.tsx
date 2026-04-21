import { Star, Sparkles } from "lucide-react";

interface SuperLikeBannerProps {
  language?: "es" | "en";
  variant?: "received" | "sent";
}

const SuperLikeBanner = ({ language = "es", variant = "received" }: SuperLikeBannerProps) => {
  const isEn = language === "en";

  if (variant === "sent") {
    return (
      <div className="relative overflow-hidden rounded-xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 dark:from-amber-950/30 dark:via-yellow-950/30 dark:to-amber-950/30 p-4 shadow-sm animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <Star className="w-7 h-7 text-amber-500 fill-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-amber-900 dark:text-amber-100">
              {isEn ? "Super Like sent ⭐" : "Super Like enviado ⭐"}
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              {isEn ? "The recipient has been notified anonymously." : "El destinatario ha sido notificado de forma anónima."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border-2 border-amber-300 bg-gradient-to-r from-amber-100 via-yellow-100 to-amber-100 dark:from-amber-950/40 dark:via-yellow-950/40 dark:to-amber-950/40 p-4 shadow-md animate-fade-in">
      {/* shimmer animation overlay */}
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          background:
            "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.6) 50%, transparent 70%)",
          animation: "superlike-shimmer 2.5s linear infinite",
          backgroundSize: "200% 100%",
        }}
      />
      <style>{`
        @keyframes superlike-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes superlike-pulse-star {
          0%, 100% { transform: scale(1) rotate(0deg); }
          50% { transform: scale(1.15) rotate(8deg); }
        }
      `}</style>
      <div className="relative flex items-center gap-3">
        <div className="relative shrink-0">
          <div
            className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg"
            style={{ animation: "superlike-pulse-star 2s ease-in-out infinite" }}
          >
            <Star className="w-7 h-7 text-white fill-white" />
          </div>
          <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-amber-300 animate-pulse" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-amber-900 dark:text-amber-50">
            {isEn ? "✨ Someone special gave you a Super Like!" : "✨ ¡Alguien especial te ha dado un Super Like!"}
          </p>
          <p className="text-xs text-amber-800 dark:text-amber-200 mt-0.5">
            {isEn
              ? "Submit your selections to find out if it's a match."
              : "Envía tus selecciones para descubrir si hay match."}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SuperLikeBanner;
