import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Check, X, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

interface OrganizerFeaturesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizer: {
    id: string;
    company_name: string | null;
    contact_email: string;
    plan_id: string | null;
    plan?: { name: string; display_name: string } | null;
  };
  features: Feature[];
  planFeatures: Record<string, string[]>;
  organizerOverrides: OrganizerFeatureOverride[];
  onUpdateFeature: (organizerId: string, featureCode: string, isEnabled: boolean) => Promise<boolean>;
  onRemoveOverride: (organizerId: string, featureCode: string) => Promise<boolean>;
}

export function OrganizerFeaturesModal({
  open,
  onOpenChange,
  organizer,
  features,
  planFeatures,
  organizerOverrides,
  onUpdateFeature,
  onRemoveOverride,
}: OrganizerFeaturesModalProps) {
  const { toast } = useToast();
  const [updating, setUpdating] = useState<string | null>(null);

  // Get features included in the organizer's plan
  const planFeatureCodes = organizer.plan_id
    ? planFeatures[organizer.plan_id] || []
    : [];

  // Group features by module
  const featuresByModule = features.reduce((acc, feature) => {
    if (!acc[feature.module]) {
      acc[feature.module] = [];
    }
    acc[feature.module].push(feature);
    return acc;
  }, {} as Record<string, Feature[]>);

  const getFeatureStatus = (featureCode: string) => {
    const override = organizerOverrides.find((o) => o.feature_code === featureCode);
    const includedInPlan = planFeatureCodes.includes(featureCode);

    if (override) {
      return {
        isEnabled: override.is_enabled,
        hasOverride: true,
        includedInPlan,
      };
    }

    return {
      isEnabled: includedInPlan,
      hasOverride: false,
      includedInPlan,
    };
  };

  const handleToggle = async (featureCode: string, currentEnabled: boolean) => {
    setUpdating(featureCode);
    try {
      const success = await onUpdateFeature(organizer.id, featureCode, !currentEnabled);
      if (success) {
        toast({
          title: "Feature actualizado",
          description: `${featureCode} ${!currentEnabled ? "activado" : "desactivado"}`,
        });
      }
    } finally {
      setUpdating(null);
    }
  };

  const handleResetToDefault = async (featureCode: string) => {
    setUpdating(featureCode);
    try {
      const success = await onRemoveOverride(organizer.id, featureCode);
      if (success) {
        toast({
          title: "Override eliminado",
          description: `${featureCode} restablecido al valor del plan`,
        });
      }
    } finally {
      setUpdating(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Gestión de Features: {organizer.company_name || organizer.contact_email}
          </DialogTitle>
          <DialogDescription>
            Plan actual: {organizer.plan?.display_name || "Sin plan"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {Object.entries(featuresByModule).map(([module, moduleFeatures]) => (
            <div key={module} className="space-y-3">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                {module === "core" ? "Core" : module === "social" ? "Social" : "Profesional"}
              </h3>
              <div className="space-y-2">
                {moduleFeatures.map((feature) => {
                  const status = getFeatureStatus(feature.code);
                  const isLoading = updating === feature.code;

                  return (
                    <div
                      key={feature.code}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{feature.name}</span>
                          {status.includedInPlan && (
                            <Badge variant="secondary" className="text-xs">
                              En plan
                            </Badge>
                          )}
                          {status.hasOverride && (
                            <Badge
                              variant={status.isEnabled ? "default" : "destructive"}
                              className="text-xs"
                            >
                              {status.isEnabled ? "Override: ON" : "Override: OFF"}
                            </Badge>
                          )}
                        </div>
                        {feature.description && (
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {feature.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {status.hasOverride && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResetToDefault(feature.code)}
                            disabled={isLoading}
                            title="Restablecer al valor del plan"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                        <div className="flex items-center gap-2">
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Switch
                              checked={status.isEnabled}
                              onCheckedChange={() =>
                                handleToggle(feature.code, status.isEnabled)
                              }
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
