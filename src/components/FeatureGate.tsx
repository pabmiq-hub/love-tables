import { ReactNode } from "react";
import { useFeatures } from "@/hooks/useFeatures";
import { Button } from "@/components/ui/button";
import { Lock, Sparkles } from "lucide-react";

interface FeatureGateProps {
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
  showUpgrade?: boolean;
}

export function FeatureGate({
  feature,
  children,
  fallback,
  showUpgrade = true,
}: FeatureGateProps) {
  const { hasFeature, getFeatureInfo, loading } = useFeatures();

  if (loading) {
    return null;
  }

  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showUpgrade) {
    return null;
  }

  const featureInfo = getFeatureInfo(feature);

  return (
    <div className="relative">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-lg flex items-center justify-center z-10">
        <div className="text-center p-4">
          <Lock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium text-muted-foreground mb-2">
            {featureInfo?.name || "Función premium"}
          </p>
          <Button size="sm" variant="default">
            <Sparkles className="h-4 w-4 mr-2" />
            Mejorar plan
          </Button>
        </div>
      </div>
      <div className="opacity-30 pointer-events-none">{children}</div>
    </div>
  );
}

interface ModuleGateProps {
  module: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function ModuleGate({ module, children, fallback }: ModuleGateProps) {
  // For now, we'll check modules through the organizer hook
  // This is a simplified version - full implementation would use useOrganizer
  return <>{children}</>;
}

// Higher-order component version
export function withFeatureGate<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  featureCode: string
) {
  return function FeatureGatedComponent(props: P) {
    return (
      <FeatureGate feature={featureCode}>
        <WrappedComponent {...props} />
      </FeatureGate>
    );
  };
}
