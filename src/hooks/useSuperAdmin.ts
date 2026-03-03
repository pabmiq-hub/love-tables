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

interface Feature {
  code: string;
  name: string;
  description: string | null;
  module: string;
  category: string | null;
}

interface OrganizerFeatureOverride {
  id: string;
  organizer_id: string;
  feature_code: string;
  is_enabled: boolean;
}

interface AuthUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  has_organizer: boolean;
  organizer_id: string | null;
  organizer_status: string | null;
  company_name: string | null;
}

export function useSuperAdmin() {
  const { user, loading: authLoading } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [organizers, setOrganizers] = useState<OrganizerWithPlan[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [metrics, setMetrics] = useState<GlobalMetrics | null>(null);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [organizerFeatures, setOrganizerFeatures] = useState<Record<string, OrganizerFeatureOverride[]>>({});
  const [planFeatures, setPlanFeatures] = useState<Record<string, string[]>>({});
  const [authUsers, setAuthUsers] = useState<AuthUser[]>([]);

  useEffect(() => {
    // Wait for auth to finish loading first
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!user) {
      setIsSuperAdmin(false);
      setLoading(false);
      return;
    }

    checkSuperAdminStatus();
  }, [user, authLoading]);

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

  const loadFeatures = async () => {
    try {
      const { data, error } = await supabase
        .from("features")
        .select("code, name, description, module, category");

      if (error) throw error;
      setFeatures((data as Feature[]) || []);
    } catch (err) {
      console.error("Error loading features:", err);
    }
  };

  const loadPlanFeatures = async () => {
    try {
      const { data, error } = await supabase
        .from("plan_features")
        .select("plan_id, feature_code");

      if (error) throw error;

      // Group by plan_id
      const grouped: Record<string, string[]> = {};
      data?.forEach((pf) => {
        if (!grouped[pf.plan_id]) {
          grouped[pf.plan_id] = [];
        }
        grouped[pf.plan_id].push(pf.feature_code);
      });

      setPlanFeatures(grouped);
    } catch (err) {
      console.error("Error loading plan features:", err);
    }
  };

  const loadOrganizerFeatures = async () => {
    if (!isSuperAdmin) return;

    try {
      const { data, error } = await supabase
        .from("organizer_features")
        .select("*");

      if (error) throw error;

      // Group by organizer_id
      const grouped: Record<string, OrganizerFeatureOverride[]> = {};
      data?.forEach((of) => {
        if (!grouped[of.organizer_id]) {
          grouped[of.organizer_id] = [];
        }
        grouped[of.organizer_id].push(of as OrganizerFeatureOverride);
      });

      setOrganizerFeatures(grouped);
    } catch (err) {
      console.error("Error loading organizer features:", err);
    }
  };

  const updateOrganizerFeature = async (
    organizerId: string,
    featureCode: string,
    isEnabled: boolean
  ): Promise<boolean> => {
    try {
      // Check if override exists
      const existingOverrides = organizerFeatures[organizerId] || [];
      const existingOverride = existingOverrides.find(
        (of) => of.feature_code === featureCode
      );

      if (existingOverride) {
        // Update existing override
        const { error } = await supabase
          .from("organizer_features")
          .update({ is_enabled: isEnabled })
          .eq("id", existingOverride.id);

        if (error) throw error;
      } else {
        // Create new override
        const { error } = await supabase
          .from("organizer_features")
          .insert({
            organizer_id: organizerId,
            feature_code: featureCode,
            is_enabled: isEnabled,
          });

        if (error) throw error;
      }

      await loadOrganizerFeatures();
      return true;
    } catch (err) {
      console.error("Error updating organizer feature:", err);
      return false;
    }
  };

  const removeOrganizerFeatureOverride = async (
    organizerId: string,
    featureCode: string
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("organizer_features")
        .delete()
        .eq("organizer_id", organizerId)
        .eq("feature_code", featureCode);

      if (error) throw error;
      await loadOrganizerFeatures();
      return true;
    } catch (err) {
      console.error("Error removing organizer feature override:", err);
      return false;
    }
  };

  // Get effective features for an organizer (plan features + overrides)
  const getOrganizerEffectiveFeatures = (organizerId: string, planId: string | null): Record<string, boolean> => {
    const result: Record<string, boolean> = {};
    
    // Start with plan features
    const planFeatureCodes = planId ? planFeatures[planId] || [] : [];
    planFeatureCodes.forEach((code) => {
      result[code] = true;
    });

    // Apply overrides
    const overrides = organizerFeatures[organizerId] || [];
    overrides.forEach((override) => {
      result[override.feature_code] = override.is_enabled;
    });

    return result;
  };

  const loadAuthUsers = async () => {
    if (!isSuperAdmin) return;
    try {
      const { data, error } = await supabase.functions.invoke("list-auth-users");
      if (error) throw error;
      setAuthUsers(data?.users || []);
    } catch (err) {
      console.error("Error loading auth users:", err);
    }
  };

  const deleteAuthUser = async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke("delete-auth-user", {
        body: { user_id: userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      await loadAuthUsers();
      return true;
    } catch (err) {
      console.error("Error deleting auth user:", err);
      return false;
    }
  };

  const createOrganizerForUser = async (userId: string, email: string): Promise<boolean> => {
    try {
      const { data: defaultPlan } = await supabase
        .from("subscription_plans")
        .select("id")
        .eq("is_default", true)
        .single();

      const { error } = await supabase
        .from("organizers")
        .insert({
          user_id: userId,
          contact_email: email,
          status: "pending",
          plan_id: defaultPlan?.id || null,
          active_modules: ["social"],
        });

      if (error) throw error;
      await Promise.all([loadAuthUsers(), loadOrganizers()]);
      return true;
    } catch (err) {
      console.error("Error creating organizer for user:", err);
      return false;
    }
  };

  const createNewOrganizer = async (data: {
    email: string;
    password: string;
    company_name: string;
    contact_phone: string;
    plan_id: string;
    active_modules: string[];
  }): Promise<{ success: boolean; email?: string; error?: string }> => {
    try {
      const { data: result, error } = await supabase.functions.invoke("create-organizer", {
        body: data,
      });
      if (error) throw error;
      if (result?.error) return { success: false, error: result.error };
      await Promise.all([loadAuthUsers(), loadOrganizers(), loadMetrics()]);
      return { success: true, email: result.email };
    } catch (err: any) {
      console.error("Error creating new organizer:", err);
      return { success: false, error: err.message || "Error desconocido" };
    }
  };
  return {
    isSuperAdmin,
    loading,
    organizers,
    plans,
    modules,
    metrics,
    features,
    organizerFeatures,
    planFeatures,
    authUsers,
    loadOrganizers,
    loadPlans,
    loadModules,
    loadMetrics,
    loadFeatures,
    loadPlanFeatures,
    loadOrganizerFeatures,
    loadAuthUsers,
    updateOrganizerStatus,
    updateOrganizerPlan,
    updateOrganizerModules,
    setTrialPeriod,
    updateOrganizerFeature,
    removeOrganizerFeatureOverride,
    getOrganizerEffectiveFeatures,
    deleteAuthUser,
    createOrganizerForUser,
    createNewOrganizer,
    refresh: async () => {
      await Promise.all([
        loadOrganizers(),
        loadPlans(),
        loadModules(),
        loadMetrics(),
        loadFeatures(),
        loadPlanFeatures(),
        loadOrganizerFeatures(),
        loadAuthUsers(),
      ]);
    },
  };
}
