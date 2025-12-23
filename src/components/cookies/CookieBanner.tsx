import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { useCookieConsent, CookieConsent } from "@/hooks/useCookieConsent";
import { Link } from "react-router-dom";
import { Cookie, Shield } from "lucide-react";

export const CookieBanner = () => {
  const { consent, showBanner, setShowBanner, saveConsent, acceptAll, rejectAll } = useCookieConsent();
  const [showSettings, setShowSettings] = useState(false);
  const [localConsent, setLocalConsent] = useState<CookieConsent>({
    necessary: true,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    if (consent) {
      setLocalConsent(consent);
    }
  }, [consent]);

  useEffect(() => {
    const handler = () => setShowSettings(true);
    window.addEventListener("open-cookie-settings", handler);
    return () => window.removeEventListener("open-cookie-settings", handler);
  }, []);

  const handleSaveSettings = () => {
    saveConsent(localConsent);
    setShowSettings(false);
  };

  if (!showBanner && !showSettings) return null;

  return (
    <>
      {/* Banner */}
      {showBanner && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-card border-t border-border shadow-elevated">
          <div className="container mx-auto max-w-5xl">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="flex items-start gap-3 flex-1">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Cookie className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Utilizamos cookies</p>
                  <p className="text-sm text-muted-foreground">
                    Usamos cookies propias y de terceros para mejorar tu experiencia. Puedes aceptar todas, rechazar las no esenciales o{" "}
                    <button onClick={() => setShowSettings(true)} className="text-primary hover:underline">
                      configurar tus preferencias
                    </button>
                    . Más información en nuestra{" "}
                    <Link to="/politica-cookies" className="text-primary hover:underline">
                      Política de Cookies
                    </Link>
                    .
                  </p>
                </div>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <Button variant="outline" size="sm" onClick={rejectAll} className="flex-1 md:flex-none">
                  Rechazar
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowSettings(true)} className="flex-1 md:flex-none">
                  Configurar
                </Button>
                <Button size="sm" onClick={acceptAll} className="flex-1 md:flex-none bg-gradient-primary hover:opacity-90">
                  Aceptar todas
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Configuración de cookies
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Necessary */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-sm">Cookies técnicas (necesarias)</p>
                <p className="text-sm text-muted-foreground">
                  Esenciales para el funcionamiento del sitio. No se pueden desactivar.
                </p>
              </div>
              <Switch checked={true} disabled />
            </div>

            {/* Analytics */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-sm">Cookies analíticas</p>
                <p className="text-sm text-muted-foreground">
                  Nos ayudan a entender cómo usas el sitio para mejorar la experiencia.
                </p>
              </div>
              <Switch
                checked={localConsent.analytics}
                onCheckedChange={(checked) => setLocalConsent({ ...localConsent, analytics: checked })}
              />
            </div>

            {/* Marketing */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-sm">Cookies de marketing</p>
                <p className="text-sm text-muted-foreground">
                  Permiten mostrarte publicidad relevante y medir su efectividad.
                </p>
              </div>
              <Switch
                checked={localConsent.marketing}
                onCheckedChange={(checked) => setLocalConsent({ ...localConsent, marketing: checked })}
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowSettings(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveSettings} className="bg-gradient-primary hover:opacity-90">
              Guardar preferencias
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
