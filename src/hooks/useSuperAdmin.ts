import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface OrganizerWithPlan {
  id: string;
  user_id: string;
  company_name: string | null;
  contact_email: string;
  contact_phone: string | null;
  status: string;
  plan_id: string | null;
  trial_ends_at: string | null;
  active_modules: string[];
  created_at: string;
  plan?: {
    name: string;
    display_name: string;
  } | null;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  max_events: number | null;
  max_participants_per_event: number | null;
  max_active_events: number | null;
  is_active: boolean;
  is_default: boolean;
}

interface Module {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  requires_plans: string[] | null;
}

interface GlobalMetrics {
  totalOrganizers: number;
  activeOrganizers: number;
  pendingOrganizers: number;
  totalEvents: number;
  activeEvents: number;
  totalParticipants: number;
}

export function useSuperAdmin() {
  const { user } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [organizers, setOrganizers] = useState<OrganizerWithPlan[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [metrics, setMetrics] = useState<GlobalMetrics | null>(null);

  useEffect(() => {
    if (!user) {
      setIsSuperAdmin(false);
      setLoading(false);
      return;
    }

    checkSuperAdminStatus();
  }, [user]);

  const checkSuperAdminStatus = async () => {
    if (!user) return;

    try {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "super_admin")
        .maybeSingle();

      setIsSuperAdmin(!!roleData);
    } catch (err) {
      console.error("Error checking super admin status:", err);
      setIsSuperAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const loadOrganizers = async () => {
    if (!isSuperAdmin) return;

    try {
      const { data, error } = await supabase
        .from("organizers")
        .select(`
          *,
          plan:subscription_plans(name, display_name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrganizers((data as OrganizerWithPlan[]) || []);
    } catch (err) {
      console.error("Error loading organizers:", err);
    }
  };

  const loadPlans = async () => {
    try {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setPlans((data as SubscriptionPlan[]) || []);
    } catch (err) {
      console.error("Error loading plans:", err);
    }
  };

  const loadModules = async () => {
    try {
      const { data, error } = await supabase.from("modules").select("*");

      if (error) throw error;
      setModules((data as Module[]) || []);
    } catch (err) {
      console.error("Error loading modules:", err);
    }
  };

  const loadMetrics = async () => {
    if (!isSuperAdmin) return;

    try {
      // Get organizer counts
      const { data: orgData } = await supabase
        .from("organizers")
        .select("status");

      const totalOrganizers = orgData?.length || 0;
      const activeOrganizers =
        orgData?.filter((o) => o.status === "active").length || 0;
      const pendingOrganizers =
        orgData?.filter((o) => o.status === "pending").length || 0;

      // Get event counts
      const { data: eventData } = await supabase
        .from("events")
        .select("status, participants_count");

      const totalEvents = eventData?.length || 0;
      const activeEvents =
        eventData?.filter((e) => e.status === "active").length || 0;
      const totalParticipants =
        eventData?.reduce((sum, e) => sum + (e.participants_count || 0), 0) ||
        0;

      setMetrics({
        totalOrganizers,
        activeOrganizers,
        pendingOrganizers,
        totalEvents,
        activeEvents,
        totalParticipants,
      });
    } catch (err) {
      console.error("Error loading metrics:", err);
    }
  };

  const updateOrganizerStatus = async (
    organizerId: string,
    status: string
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("organizers")
        .update({ status })
        .eq("id", organizerId);

      if (error) throw error;
      await loadOrganizers();
      return true;
    } catch (err) {
      console.error("Error updating organizer status:", err);
      return false;
    }
  };

  const updateOrganizerPlan = async (
    organizerId: string,
    planId: string
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("organizers")
        .update({ plan_id: planId })
        .eq("id", organizerId);

      if (error) throw error;
      await loadOrganizers();
      return true;
    } catch (err) {
      console.error("Error updating organizer plan:", err);
      return false;
    }
  };

  const updateOrganizerModules = async (
    organizerId: string,
    modules: string[]
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("organizers")
        .update({ active_modules: modules })
        .eq("id", organizerId);

      if (error) throw error;
      await loadOrganizers();
      return true;
    } catch (err) {
      console.error("Error updating organizer modules:", err);
      return false;
    }
  };

  const setTrialPeriod = async (
    organizerId: string,
    days: number
  ): Promise<boolean> => {
    try {
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + days);

      const { error } = await supabase
        .from("organizers")
        .update({
          trial_ends_at: trialEndsAt.toISOString(),
          status: "active",
        })
        .eq("id", organizerId);

      if (error) throw error;
      await loadOrganizers();
      return true;
    } catch (err) {
      console.error("Error setting trial period:", err);
      return false;
    }
  };

  return {
    isSuperAdmin,
    loading,
    organizers,
    plans,
    modules,
    metrics,
    loadOrganizers,
    loadPlans,
    loadModules,
    loadMetrics,
    updateOrganizerStatus,
    updateOrganizerPlan,
    updateOrganizerModules,
    setTrialPeriod,
    refresh: async () => {
      await Promise.all([
        loadOrganizers(),
        loadPlans(),
        loadModules(),
        loadMetrics(),
      ]);
    },
  };
}
