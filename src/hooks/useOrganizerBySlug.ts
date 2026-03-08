import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface OrganizerBrandingBySlug {
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
  loading: boolean;
  notFound: boolean;
}

export function useOrganizerBySlug(slug: string | undefined): OrganizerBrandingBySlug {
  const [data, setData] = useState<OrganizerBrandingBySlug>({
    organizerId: "",
    userId: "",
    logoUrl: null,
    companyName: null,
    slug: "",
    isWhiteLabel: false,
    primaryColor: null,
    secondaryColor: null,
    backgroundColor: null,
    fontFamily: null,
    customWelcomeText: null,
    customFooterText: null,
    hideKonektumBranding: false,
    loading: true,
    notFound: false,
  });

  useEffect(() => {
    if (!slug) {
      setData(prev => ({ ...prev, loading: false, notFound: true }));
      return;
    }

    const load = async () => {
      try {
        const { data: organizer } = await supabase
          .from("organizers")
          .select("id, user_id, logo_url, company_name, slug")
          .eq("slug", slug)
          .maybeSingle();

        if (!organizer) {
          setData(prev => ({ ...prev, loading: false, notFound: true }));
          return;
        }

        const { data: brandingData } = await supabase
          .from("organizer_branding")
          .select("*")
          .eq("organizer_id", organizer.id)
          .maybeSingle();

        setData({
          organizerId: organizer.id,
          userId: organizer.user_id,
          logoUrl: organizer.logo_url,
          companyName: organizer.company_name,
          slug: organizer.slug,
          isWhiteLabel: brandingData?.is_white_label === true,
          primaryColor: brandingData?.primary_color ?? null,
          secondaryColor: brandingData?.secondary_color ?? null,
          backgroundColor: brandingData?.background_color ?? null,
          fontFamily: brandingData?.font_family ?? null,
          customWelcomeText: brandingData?.custom_welcome_text ?? null,
          customFooterText: brandingData?.custom_footer_text ?? null,
          hideKonektumBranding: brandingData?.hide_konektum_branding ?? false,
          loading: false,
          notFound: false,
        });
      } catch (err) {
        console.error("Error loading organizer by slug:", err);
        setData(prev => ({ ...prev, loading: false, notFound: true }));
      }
    };

    load();
  }, [slug]);

  return data;
}
