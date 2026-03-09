import { StructuredTemplate, TemplateKey } from "./types";

interface EmailPreviewProps {
  template: StructuredTemplate;
  templateKey: TemplateKey;
  primaryColor: string;
  logoUrl: string;
  brandName: string;
  eventName: string;
}

const SAMPLE_DATA: Record<string, string> = {
  "{{nombre}}": "María García",
  "{{evento}}": "",
  "{{fecha}}": "sábado, 15 de marzo de 2026",
  "{{ubicacion}}": "Hotel Palace, Madrid",
  "{{hora}}": "19:00",
  "{{codigo}}": "847291",
};

const replaceVars = (text: string, eventName: string) => {
  let result = text;
  for (const [key, val] of Object.entries(SAMPLE_DATA)) {
    result = result.replaceAll(key, key === "{{evento}}" ? (eventName || "Mi Evento") : val);
  }
  return result;
};

const EmailPreview = ({ template, templateKey, primaryColor, logoUrl, brandName, eventName }: EmailPreviewProps) => {
  const r = (t: string) => replaceVars(t, eventName);

  const renderExtraContent = () => {
    switch (templateKey) {
      case "checkin_code":
        return (
          <div className="rounded-lg p-5 my-4 text-center" style={{ backgroundColor: "#f8f9fa" }}>
            <p className="text-xs text-muted-foreground mb-2">Tu código personal de acceso:</p>
            <div
              className="text-3xl font-bold tracking-[8px] py-4 px-6 rounded-lg text-white font-mono"
              style={{ background: `linear-gradient(135deg, ${primaryColor}, ${adjustColor(primaryColor, 30)})` }}
            >
              847291
            </div>
          </div>
        );
      case "matches":
        return (
          <div className="space-y-3 my-4">
            <div className="rounded-lg p-4" style={{ backgroundColor: `${primaryColor}10` }}>
              <h4 className="font-semibold text-sm mb-2">🤝 Tus matches de amistad:</h4>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>Carlos López - 📞 +34 612 345 678</li>
                <li>Ana Martínez - 📞 +34 698 765 432</li>
              </ul>
            </div>
            <div className="rounded-lg p-4" style={{ backgroundColor: `${primaryColor}10` }}>
              <h4 className="font-semibold text-sm mb-2">❤️ Tus matches de ligue:</h4>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>Pablo Ruiz - 📞 +34 654 321 987</li>
              </ul>
            </div>
          </div>
        );
      case "reminder":
        return (
          <div className="text-center my-5">
            <a
              className="inline-block py-3 px-7 rounded-lg text-white font-bold text-sm no-underline"
              style={{ background: `linear-gradient(135deg, ${primaryColor}, ${adjustColor(primaryColor, 30)})` }}
            >
              Enviar mis selecciones
            </a>
          </div>
        );
      case "registration_confirmation":
        return (
          <div className="text-center my-5">
            <div className="inline-block rounded-lg p-5" style={{ backgroundColor: "#f8f9fa" }}>
              <div className="text-4xl mb-2">🎉</div>
              <p className="text-sm font-medium text-muted-foreground">¡Ya tienes tu plaza reservada!</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-muted/30 rounded-lg p-4 min-h-[400px]">
      <div className="bg-background rounded-lg border overflow-hidden shadow-sm">
        {/* Header */}
        <div
          className="p-6 text-center"
          style={{ background: `linear-gradient(135deg, ${primaryColor}, ${adjustColor(primaryColor, 30)})` }}
        >
          {logoUrl && (
            <img
              src={logoUrl}
              alt={brandName}
              className="max-h-8 max-w-[160px] mx-auto mb-2"
              style={{ filter: "brightness(0) invert(1)" }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          <h2 className="text-white font-bold text-lg">{brandName}</h2>
        </div>

        {/* Body */}
        <div className="p-6 space-y-3">
          <h1 className="text-xl font-bold">{r(template.greeting)}</h1>
          <p className="text-muted-foreground whitespace-pre-line text-sm leading-relaxed">{r(template.intro)}</p>

          {renderExtraContent()}

          <p className="text-muted-foreground text-sm">{r(template.closing)}</p>

          <div className="border-t pt-3 mt-4">
            <p className="text-xs text-muted-foreground whitespace-pre-line">{r(template.signature)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

function adjustColor(hex: string, amount: number): string {
  try {
    const num = parseInt(hex.replace("#", ""), 16);
    const r = Math.min(255, ((num >> 16) & 0xff) + amount);
    const g = Math.min(255, ((num >> 8) & 0xff) + amount);
    const b = Math.min(255, (num & 0xff) + amount);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
  } catch {
    return hex;
  }
}

export default EmailPreview;
