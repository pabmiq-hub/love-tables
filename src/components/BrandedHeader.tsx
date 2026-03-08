import { Link } from "react-router-dom";
import konektumLogo from "@/assets/konektum-logo.png";

interface BrandedHeaderProps {
  logoUrl?: string | null;
  companyName?: string | null;
  isWhiteLabel?: boolean;
  primaryColor?: string | null;
  backgroundColor?: string | null;
  fontFamily?: string | null;
  backLink?: string;
  backLabel?: React.ReactNode;
  rightContent?: React.ReactNode;
  centered?: boolean;
}

/**
 * Reusable header that shows the organizer's logo (white-label) or Konektum logo (default).
 * Supports dynamic colors and fonts when white-label is active.
 */
export function BrandedHeader({
  logoUrl,
  companyName,
  isWhiteLabel = false,
  primaryColor,
  backgroundColor,
  fontFamily,
  backLink,
  backLabel,
  rightContent,
  centered = false,
}: BrandedHeaderProps) {
  const logo = isWhiteLabel && logoUrl ? logoUrl : konektumLogo;
  const alt = isWhiteLabel && companyName ? companyName : "Konektum";

  const headerStyle: React.CSSProperties = {};
  if (isWhiteLabel) {
    if (backgroundColor) headerStyle.backgroundColor = backgroundColor;
    if (fontFamily) headerStyle.fontFamily = fontFamily;
  }

  return (
    <header
      className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50"
      style={headerStyle}
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {centered ? (
          <>
            <div className="flex-1" />
            <img src={logo} alt={alt} className="h-9 w-auto max-w-[180px] object-contain" />
            <div className="flex-1" />
          </>
        ) : (
          <>
            {backLink ? (
              <Link
                to={backLink}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {backLabel || "Volver"}
              </Link>
            ) : (
              <Link to="/" className="flex items-center gap-2">
                <img src={logo} alt={alt} className="h-9 w-auto max-w-[180px] object-contain" />
              </Link>
            )}

            {!backLink && !rightContent && <div />}
            {backLink && (
              <img src={logo} alt={alt} className="h-10 w-auto max-w-[180px] object-contain" />
            )}
            {rightContent && <div className="flex items-center gap-3">{rightContent}</div>}
          </>
        )}
      </div>
    </header>
  );
}

/**
 * Inline logo for use in card footers, success screens, etc.
 */
export function BrandedLogo({
  logoUrl,
  companyName,
  isWhiteLabel = false,
  className = "h-10 w-auto",
}: {
  logoUrl?: string | null;
  companyName?: string | null;
  isWhiteLabel?: boolean;
  className?: string;
}) {
  const logo = isWhiteLabel && logoUrl ? logoUrl : konektumLogo;
  const alt = isWhiteLabel && companyName ? companyName : "Konektum";

  return <img src={logo} alt={alt} className={className} />;
}

/**
 * Footer that respects white-label settings.
 */
export function BrandedFooter({
  isWhiteLabel = false,
  hideKonektumBranding = false,
  customFooterText,
}: {
  isWhiteLabel?: boolean;
  hideKonektumBranding?: boolean;
  customFooterText?: string | null;
}) {
  if (isWhiteLabel && hideKonektumBranding && !customFooterText) return null;

  return (
    <div className="text-center py-3 text-xs text-muted-foreground">
      {customFooterText ? (
        <span>{customFooterText}</span>
      ) : !hideKonektumBranding ? (
        <span>Powered by Konektum</span>
      ) : null}
    </div>
  );
}
