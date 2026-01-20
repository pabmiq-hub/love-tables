import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface OrganizerProfile {
  id: string;
  user_id: string;
  company_name: string | null;
  contact_email: string;
  contact_phone: string | null;
  status: "pending" | "active" | "suspended" | "cancelled";
  plan_id: string | null;
  trial_ends_at: string | null;
  subscription_starts_at: string | null;
  subscription_ends_at: string | null;
  active_modules: string[];
  created_at: string;
  updated_at: string;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  max_events: number | null;
  max_participants_per_event: number | null;
  max_active_events: number | null;
}

interface OrganizerLimits {
  maxEvents: number | null;
  maxParticipantsPerEvent: number | null;
  maxActiveEvents: number | null;
  currentActiveEvents: number;
}

export function useOrganizer() {
  const { user } = useAuth();
  const [organizer, setOrganizer] = useState<OrganizerProfile | null>(null);
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [limits, setLimits] = useState<OrganizerLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setOrganizer(null);
      setPlan(null);
      setLimits(null);
      setLoading(false);
      return;
    }

    loadOrganizerProfile();
  }, [user]);

  const loadOrganizerProfile = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Load organizer profile
      const { data: orgData, error: orgError } = await supabase
        .from("organizers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (orgError) throw orgError;

      if (orgData) {
        setOrganizer(orgData as OrganizerProfile);

        // Load plan if assigned
        if (orgData.plan_id) {
          const { data: planData, error: planError } = await supabase
            .from("subscription_plans")
            .select("*")
            .eq("id", orgData.plan_id)
            .single();

          if (planError) throw planError;
          setPlan(planData as SubscriptionPlan);

          // Count active events
          const { count, error: countError } = await supabase
            .from("events")
            .select("*", { count: "exact", head: true })
            .eq("organizer_id", orgData.id)
            .in("status", ["pending", "active"]);

          if (countError) throw countError;

          setLimits({
            maxEvents: planData.max_events,
            maxParticipantsPerEvent: planData.max_participants_per_event,
            maxActiveEvents: planData.max_active_events,
            currentActiveEvents: count || 0,
          });
        }
      }
    } catch (err) {
      console.error("Error loading organizer profile:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const isActive = organizer?.status === "active";
  const isPending = organizer?.status === "pending";
  const isSuspended = organizer?.status === "suspended";

  const hasModule = (moduleCode: string): boolean => {
    if (!organizer) return false;
    return organizer.active_modules.includes(moduleCode);
  };

  const canCreateEvent = (): boolean => {
    if (!isActive || !limits) return false;
    if (limits.maxActiveEvents === null) return true; // unlimited
    return limits.currentActiveEvents < limits.maxActiveEvents;
  };

  const canAddParticipants = (currentCount: number, toAdd: number): boolean => {
    if (!isActive || !limits) return false;
    if (limits.maxParticipantsPerEvent === null) return true; // unlimited
    return currentCount + toAdd <= limits.maxParticipantsPerEvent;
  };

  return {
    organizer,
    plan,
    limits,
    loading,
    error,
    isActive,
    isPending,
    isSuspended,
    hasModule,
    canCreateEvent,
    canAddParticipants,
    refresh: loadOrganizerProfile,
  };
}
