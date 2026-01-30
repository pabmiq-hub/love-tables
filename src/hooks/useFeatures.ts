import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface Feature {
  code: string;
  name: string;
  description: string | null;
  module: string;
  category: string | null;
}

interface PlanFeature {
  feature_code: string;
  is_limited: boolean;
  limit_value: number | null;
}

interface FeatureOverride {
  feature_code: string;
  is_enabled: boolean;
}

export function useFeatures() {
  const { user } = useAuth();
  const [features, setFeatures] = useState<string[]>([]);
  const [allFeatures, setAllFeatures] = useState<Feature[]>([]);
  const [planFeatures, setPlanFeatures] = useState<PlanFeature[]>([]);
  const [featureOverrides, setFeatureOverrides] = useState<FeatureOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    if (!user) {
      setFeatures([]);
      setIsSuperAdmin(false);
      setLoading(false);
      return;
    }

    loadFeatures();
  }, [user]);

  const loadFeatures = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Check if super admin
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "super_admin")
        .maybeSingle();

      const isAdmin = !!roleData;
      setIsSuperAdmin(isAdmin);

      // Load all available features (for reference)
      const { data: featuresData } = await supabase
        .from("features")
        .select("code, name, description, module, category");

      if (featuresData) {
        setAllFeatures(featuresData as Feature[]);
      }

      // Super admin has all features
      if (isAdmin) {
        setFeatures(featuresData?.map((f) => f.code) || []);
        setLoading(false);
        return;
      }

      // Get organizer's plan features and overrides
      const { data: orgData } = await supabase
        .from("organizers")
        .select("id, plan_id, status")
        .eq("user_id", user.id)
        .single();

      if (!orgData || orgData.status !== "active") {
        setFeatures([]);
        setLoading(false);
        return;
      }

      // Load plan features
      let planFeatureCodes: string[] = [];
      if (orgData.plan_id) {
        const { data: pfData } = await supabase
          .from("plan_features")
          .select("feature_code, is_limited, limit_value")
          .eq("plan_id", orgData.plan_id);

        if (pfData) {
          setPlanFeatures(pfData as PlanFeature[]);
          planFeatureCodes = pfData.map((pf) => pf.feature_code);
        }
      }

      // Load feature overrides for this organizer
      const { data: overridesData } = await supabase
        .from("organizer_features")
        .select("feature_code, is_enabled")
        .eq("organizer_id", orgData.id);

      if (overridesData) {
        setFeatureOverrides(overridesData as FeatureOverride[]);
      }

      // Calculate effective features: plan features + overrides
      const effectiveFeatures = new Set(planFeatureCodes);
      
      // Apply overrides
      overridesData?.forEach((override) => {
        if (override.is_enabled) {
          effectiveFeatures.add(override.feature_code);
        } else {
          effectiveFeatures.delete(override.feature_code);
        }
      });

      setFeatures(Array.from(effectiveFeatures));
    } catch (err) {
      console.error("Error loading features:", err);
    } finally {
      setLoading(false);
    }
  };

  const hasFeature = useCallback(
    (featureCode: string): boolean => {
      if (isSuperAdmin) return true;
      return features.includes(featureCode);
    },
    [features, isSuperAdmin]
  );

  const getFeatureLimit = useCallback(
    (featureCode: string): number | null => {
      if (isSuperAdmin) return null; // unlimited
      const pf = planFeatures.find((p) => p.feature_code === featureCode);
      if (!pf || !pf.is_limited) return null;
      return pf.limit_value;
    },
    [planFeatures, isSuperAdmin]
  );

  const getFeatureInfo = useCallback(
    (featureCode: string): Feature | undefined => {
      return allFeatures.find((f) => f.code === featureCode);
    },
    [allFeatures]
  );

  return {
    features,
    allFeatures,
    loading,
    isSuperAdmin,
    hasFeature,
    getFeatureLimit,
    getFeatureInfo,
    refresh: loadFeatures,
  };
}
