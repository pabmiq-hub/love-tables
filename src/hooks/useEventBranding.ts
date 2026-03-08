import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface EventBranding {
  logoUrl: string | null;
  companyName: string | null;
  isWhiteLabel: boolean;
  primaryColor: string | null;
  secondaryColor: string | null;
  backgroundColor: string | null;
  fontFamily: string | null;
  customWelcomeText: string | null;
  customFooterText: string | null;
  hideKonektumBranding: boolean;
  loading: boolean;
}

/**
 * Hook to load organizer branding for participant-facing pages.
 * Given an eventId, resolves the organizer's logo, company name, and full branding config.
 */
export function useEventBranding(eventId: string | undefined): EventBranding {
  const [branding, setBranding] = useState<EventBranding>({
    logoUrl: null,
    companyName: null,
    isWhiteLabel: false,
    primaryColor: null,
    secondaryColor: null,
    backgroundColor: null,
    fontFamily: null,
    customWelcomeText: null,
    customFooterText: null,
    hideKonektumBranding: false,
    loading: true,
  });

  useEffect(() => {
    if (!eventId) {
      setBranding(prev => ({ ...prev, loading: false }));
      return;
    }

    const loadBranding = async () => {
      try {
        // Get event's organizer_id (which is the auth user_id)
        const { data: event } = await supabase
          .from("events")
          .select("organizer_id")
          .eq("id", eventId)
          .single();

        if (!event?.organizer_id) {
          setBranding(prev => ({ ...prev, loading: false }));
          return;
        }

        // Get organizer profile using user_id
        const { data: organizer } = await supabase
          .from("organizers")
          .select("id, logo_url, company_name, active_modules")
          .eq("user_id", event.organizer_id)
          .maybeSingle();

        if (!organizer) {
          setBranding(prev => ({ ...prev, loading: false }));
          return;
        }

        // Load branding config
        const { data: brandingData } = await supabase
          .from("organizer_branding")
          .select("*")
          .eq("organizer_id", organizer.id)
          .maybeSingle();

        const isWhiteLabel = brandingData?.is_white_label === true;

        setBranding({
          logoUrl: organizer.logo_url,
          companyName: organizer.company_name,
          isWhiteLabel,
          primaryColor: brandingData?.primary_color ?? null,
          secondaryColor: brandingData?.secondary_color ?? null,
          backgroundColor: brandingData?.background_color ?? null,
          fontFamily: brandingData?.font_family ?? null,
          customWelcomeText: brandingData?.custom_welcome_text ?? null,
          customFooterText: brandingData?.custom_footer_text ?? null,
          hideKonektumBranding: brandingData?.hide_konektum_branding ?? false,
          loading: false,
        });
      } catch (err) {
        console.error("Error loading event branding:", err);
        setBranding(prev => ({ ...prev, loading: false }));
      }
    };

    loadBranding();
  }, [eventId]);

  return branding;
}
