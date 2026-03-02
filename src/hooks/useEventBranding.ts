import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface EventBranding {
  logoUrl: string | null;
  companyName: string | null;
  isWhiteLabel: boolean;
  loading: boolean;
}

/**
 * Hook to load organizer branding for participant-facing pages.
 * Given an eventId, resolves the organizer's logo and company name.
 */
export function useEventBranding(eventId: string | undefined): EventBranding {
  const [branding, setBranding] = useState<EventBranding>({
    logoUrl: null,
    companyName: null,
    isWhiteLabel: false,
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
          .select("logo_url, company_name, active_modules")
          .eq("user_id", event.organizer_id)
          .maybeSingle();

        if (organizer) {
          const modules = organizer.active_modules || [];
          const isProfessionalOnly = modules.length === 1 && modules[0] === "professional";
          const hasLogo = !!organizer.logo_url;

          setBranding({
            logoUrl: organizer.logo_url,
            companyName: organizer.company_name,
            isWhiteLabel: isProfessionalOnly && hasLogo,
            loading: false,
          });
        } else {
          setBranding(prev => ({ ...prev, loading: false }));
        }
      } catch (err) {
        console.error("Error loading event branding:", err);
        setBranding(prev => ({ ...prev, loading: false }));
      }
    };

    loadBranding();
  }, [eventId]);

  return branding;
}
