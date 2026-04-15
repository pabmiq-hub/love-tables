import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router-dom";

interface GDPRConsentProps {
  lang: "es" | "en";
  dataConsent: boolean;
  marketingConsent: boolean;
  onDataConsentChange: (checked: boolean) => void;
  onMarketingConsentChange: (checked: boolean) => void;
}

const GDPRConsent = ({
  lang,
  dataConsent,
  marketingConsent,
  onDataConsentChange,
  onMarketingConsentChange,
}: GDPRConsentProps) => {
  const isEs = lang === "es";

  return (
    <div className="space-y-3 pt-2 border-t">
      {/* Mandatory: data processing consent */}
      <label className="flex items-start gap-3 cursor-pointer">
        <Checkbox
          checked={dataConsent}
          onCheckedChange={(v) => onDataConsentChange(!!v)}
          className="mt-0.5"
        />
        <span className="text-xs text-muted-foreground leading-relaxed">
          {isEs ? (
            <>
              He leído y acepto la{" "}
              <Link to="/politica-privacidad" target="_blank" className="underline text-primary hover:text-primary/80">
                Política de Privacidad
              </Link>
              . Consiento el tratamiento de mis datos personales para la gestión y organización del evento, incluyendo la comunicación de resultados y asignaciones de mesas.{" "}
              <span className="text-destructive font-medium">*</span>
            </>
          ) : (
            <>
              I have read and accept the{" "}
              <Link to="/politica-privacidad" target="_blank" className="underline text-primary hover:text-primary/80">
                Privacy Policy
              </Link>
              . I consent to the processing of my personal data for the management and organization of the event, including the communication of results and table assignments.{" "}
              <span className="text-destructive font-medium">*</span>
            </>
          )}
        </span>
      </label>

      {/* Optional: marketing consent */}
      <label className="flex items-start gap-3 cursor-pointer">
        <Checkbox
          checked={marketingConsent}
          onCheckedChange={(v) => onMarketingConsentChange(!!v)}
          className="mt-0.5"
        />
        <span className="text-xs text-muted-foreground leading-relaxed">
          {isEs
            ? "Acepto recibir comunicaciones comerciales sobre futuros eventos y novedades. Puedo darme de baja en cualquier momento."
            : "I agree to receive promotional communications about future events and updates. I can unsubscribe at any time."}
        </span>
      </label>
    </div>
  );
};

export default GDPRConsent;
