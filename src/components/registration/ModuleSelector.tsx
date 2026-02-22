import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Briefcase, Layers, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface ModuleOption {
  id: string;
  name: string;
  description: string;
  modules: string[];
  icon: React.ReactNode;
  color: string;
}

const MODULE_OPTIONS: ModuleOption[] = [
  {
    id: "social",
    name: "Social",
    description: "Actividades de conexión social con preferencias personales y matching romántico",
    modules: ["social"],
    icon: <Heart className="w-6 h-6" />,
    color: "text-pink-500 bg-pink-500/10"
  },
  {
    id: "professional",
    name: "Profesional",
    description: "Networking B2B con matching cliente-proveedor por sector y necesidades",
    modules: ["professional"],
    icon: <Briefcase className="w-6 h-6" />,
    color: "text-blue-500 bg-blue-500/10"
  },
  {
    id: "both",
    name: "Social y Profesional",
    description: "Acceso completo a ambos módulos para máxima flexibilidad en tus eventos",
    modules: ["social", "professional"],
    icon: <Layers className="w-6 h-6" />,
    color: "text-purple-500 bg-purple-500/10"
  }
];

interface ModuleSelectorProps {
  selectedModules: string[];
  onModulesChange: (modules: string[]) => void;
}

export function ModuleSelector({ selectedModules, onModulesChange }: ModuleSelectorProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableModuleCodes, setAvailableModuleCodes] = useState<string[]>([]);
  const hasInitialized = useRef(false);

  useEffect(() => {
    loadModules();
  }, []);

  const loadModules = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from("modules")
        .select("code")
        .eq("is_active", true);

      if (fetchError) {
        console.error("Error fetching modules:", fetchError);
        setError("Error cargando módulos");
        setAvailableModuleCodes(["social", "professional"]);
      } else if (data && data.length > 0) {
        setAvailableModuleCodes(data.map(m => m.code));
      } else {
        setAvailableModuleCodes(["social", "professional"]);
      }
    } catch (err) {
      console.error("Error loading modules:", err);
      setError("Error de conexión");
      setAvailableModuleCodes(["social", "professional"]);
    } finally {
      setLoading(false);
    }
  };

  // Set default selection only once after loading, without causing re-renders
  useEffect(() => {
    if (!loading && !hasInitialized.current && selectedModules.length === 0) {
      hasInitialized.current = true;
      // Use setTimeout to break the synchronous update cycle
      setTimeout(() => {
        onModulesChange(["social"]);
      }, 0);
    }
  }, [loading, selectedModules.length, onModulesChange]);

  const getSelectedOptionId = (): string => {
    if (selectedModules.includes("social") && selectedModules.includes("professional")) {
      return "both";
    }
    if (selectedModules.includes("professional")) {
      return "professional";
    }
    return "social";
  };

  const handleSelect = (option: ModuleOption) => {
    onModulesChange(option.modules);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const selectedOptionId = getSelectedOptionId();

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground text-center mb-4">
        Selecciona el tipo de eventos que organizarás
      </p>
      
      {error && (
        <div className="flex items-center justify-center gap-2 text-amber-600 text-sm mb-4">
          <span>{error} - Mostrando opciones disponibles</span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={loadModules}
            className="h-6 px-2"
          >
            <RefreshCw className="w-3 h-3" />
          </Button>
        </div>
      )}
      
      <div className="grid gap-3">
        {MODULE_OPTIONS.map((option) => {
          const isSelected = selectedOptionId === option.id;
          return (
            <Card 
              key={option.id}
              className={`cursor-pointer transition-all duration-200 ${
                isSelected 
                  ? "ring-2 ring-primary bg-primary/5" 
                  : "hover:bg-muted/50"
              }`}
              onClick={() => handleSelect(option)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${option.color}`}>
                    {option.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{option.name}</h4>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        isSelected 
                          ? "border-primary bg-primary" 
                          : "border-muted-foreground"
                      }`}>
                        {isSelected && (
                          <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {option.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
