import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Heart, Briefcase, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Module {
  code: string;
  name: string;
  description: string | null;
}

interface ModuleSelectorProps {
  selectedModules: string[];
  onModulesChange: (modules: string[]) => void;
}

export function ModuleSelector({ selectedModules, onModulesChange }: ModuleSelectorProps) {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadModules();
  }, []);

  const loadModules = async () => {
    const { data } = await supabase
      .from("modules")
      .select("code, name, description")
      .eq("is_active", true);

    if (data) {
      setModules(data);
      // Default to social if nothing selected
      if (selectedModules.length === 0 && data.length > 0) {
        onModulesChange(["social"]);
      }
    }
    setLoading(false);
  };

  const toggleModule = (code: string) => {
    if (selectedModules.includes(code)) {
      // Don't allow deselecting if it's the only one
      if (selectedModules.length > 1) {
        onModulesChange(selectedModules.filter(m => m !== code));
      }
    } else {
      onModulesChange([...selectedModules, code]);
    }
  };

  const getModuleIcon = (code: string) => {
    switch (code) {
      case "social":
        return <Heart className="w-6 h-6" />;
      case "professional":
        return <Briefcase className="w-6 h-6" />;
      default:
        return <Heart className="w-6 h-6" />;
    }
  };

  const getModuleColor = (code: string) => {
    switch (code) {
      case "social":
        return "text-pink-500 bg-pink-500/10";
      case "professional":
        return "text-blue-500 bg-blue-500/10";
      default:
        return "text-primary bg-primary/10";
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground text-center mb-4">
        Selecciona los módulos que deseas utilizar
      </p>
      <div className="grid gap-3">
        {modules.map((module) => {
          const isSelected = selectedModules.includes(module.code);
          return (
            <Card 
              key={module.code}
              className={`cursor-pointer transition-all duration-200 ${
                isSelected 
                  ? "ring-2 ring-primary bg-primary/5" 
                  : "hover:bg-muted/50"
              }`}
              onClick={() => toggleModule(module.code)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getModuleColor(module.code)}`}>
                    {getModuleIcon(module.code)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{module.name}</h4>
                      <Checkbox 
                        checked={isSelected}
                        onCheckedChange={() => toggleModule(module.code)}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {module.description || (
                        module.code === "social" 
                          ? "Eventos de speed dating con preferencias personales y matching romántico"
                          : "Networking B2B con matching cliente-proveedor por sector y necesidades"
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground text-center mt-2">
        Puedes activar ambos módulos para mayor flexibilidad
      </p>
    </div>
  );
}
