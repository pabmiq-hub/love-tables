import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Heart, Briefcase, Loader2, RefreshCw } from "lucide-react";
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

const FALLBACK_MODULES: Module[] = [
  { 
    code: "social", 
    name: "Módulo Social", 
    description: "Eventos de speed dating con preferencias personales y matching romántico" 
  },
  { 
    code: "professional", 
    name: "Módulo Profesional", 
    description: "Networking B2B con matching cliente-proveedor por sector y necesidades" 
  }
];

export function ModuleSelector({ selectedModules, onModulesChange }: ModuleSelectorProps) {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadModules();
  }, []);

  const loadModules = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from("modules")
        .select("code, name, description")
        .eq("is_active", true);

      if (fetchError) {
        console.error("Error fetching modules:", fetchError);
        setError("Error cargando módulos");
        // Use fallback modules
        setModules(FALLBACK_MODULES);
        if (selectedModules.length === 0) {
          onModulesChange(["social"]);
        }
        return;
      }

      if (data && data.length > 0) {
        setModules(data);
        if (selectedModules.length === 0) {
          onModulesChange(["social"]);
        }
      } else {
        // No modules in DB, use fallback
        console.warn("No modules found in database, using fallback");
        setModules(FALLBACK_MODULES);
        if (selectedModules.length === 0) {
          onModulesChange(["social"]);
        }
      }
    } catch (err) {
      console.error("Error loading modules:", err);
      setError("Error de conexión");
      // Use fallback modules even on error
      setModules(FALLBACK_MODULES);
      if (selectedModules.length === 0) {
        onModulesChange(["social"]);
      }
    } finally {
      setLoading(false);
    }
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
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground text-center mb-4">
        Selecciona los módulos que deseas utilizar
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
