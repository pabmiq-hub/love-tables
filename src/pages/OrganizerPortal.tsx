import { useParams, Navigate, Outlet } from "react-router-dom";
import { useOrganizerBySlug } from "@/hooks/useOrganizerBySlug";
import { createContext, useContext, useEffect } from "react";

interface OrganizerContext {
  organizerId: string;
  userId: string;
  logoUrl: string | null;
  companyName: string | null;
  slug: string;
  isWhiteLabel: boolean;
  primaryColor: string | null;
  secondaryColor: string | null;
  backgroundColor: string | null;
  fontFamily: string | null;
  customWelcomeText: string | null;
  customFooterText: string | null;
  hideKonektumBranding: boolean;
}

const OrganizerCtx = createContext<OrganizerContext | null>(null);

export function useOrganizerContext() {
  return useContext(OrganizerCtx);
}

export default function OrganizerPortal() {
  const { slug } = useParams<{ slug: string }>();
  const branding = useOrganizerBySlug(slug);

  // Inject CSS variables for branding
  useEffect(() => {
    if (branding.loading || branding.notFound) return;

    const root = document.documentElement;
    if (branding.primaryColor) root.style.setProperty("--organizer-primary", branding.primaryColor);
    if (branding.secondaryColor) root.style.setProperty("--organizer-secondary", branding.secondaryColor);
    if (branding.backgroundColor) root.style.setProperty("--organizer-bg", branding.backgroundColor);
    if (branding.fontFamily) root.style.setProperty("--organizer-font", branding.fontFamily);

    return () => {
      root.style.removeProperty("--organizer-primary");
      root.style.removeProperty("--organizer-secondary");
      root.style.removeProperty("--organizer-bg");
      root.style.removeProperty("--organizer-font");
    };
  }, [branding]);

  if (branding.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (branding.notFound) {
    return <Navigate to="/404" replace />;
  }

  const ctx: OrganizerContext = {
    organizerId: branding.organizerId,
    userId: branding.userId,
    logoUrl: branding.logoUrl,
    companyName: branding.companyName,
    slug: branding.slug,
    isWhiteLabel: branding.isWhiteLabel,
    primaryColor: branding.primaryColor,
    secondaryColor: branding.secondaryColor,
    backgroundColor: branding.backgroundColor,
    fontFamily: branding.fontFamily,
    customWelcomeText: branding.customWelcomeText,
    customFooterText: branding.customFooterText,
    hideKonektumBranding: branding.hideKonektumBranding,
  };

  return (
    <OrganizerCtx.Provider value={ctx}>
      <Outlet />
    </OrganizerCtx.Provider>
  );
}
