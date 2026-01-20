import { useState } from "react";
import { ChevronDown, ChevronUp, Plus, X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export const DEFAULT_SECTORS = [
  "Tecnología",
  "Finanzas",
  "Salud",
  "Educación",
  "Retail",
  "Industria",
  "Servicios profesionales",
  "Marketing y publicidad",
  "Consultoría",
  "Recursos humanos",
  "Legal",
  "Inmobiliario",
  "Logística",
  "Turismo y hostelería",
  "Otro"
] as const;

export const DEFAULT_COMPANY_SIZES = [
  "Autónomo",
  "Startup (1-10)",
  "PYME (11-50)",
  "Mediana (51-250)",
  "Gran empresa (+250)"
] as const;

export const DEFAULT_NEEDS = [
  "Software/Tecnología",
  "Financiación",
  "Marketing digital",
  "Talento/RRHH",
  "Asesoría legal",
  "Consultoría estratégica",
  "Networking",
  "Formación",
  "Proveedores",
  "Clientes"
] as const;

export const DEFAULT_SOLUTIONS = [
  "Desarrollo software",
  "Servicios financieros",
  "Marketing y comunicación",
  "Headhunting/RRHH",
  "Servicios legales",
  "Consultoría",
  "Formación y coaching",
  "Logística y operaciones",
  "Ventas B2B",
  "Otros servicios"
] as const;

export interface ProfessionalPreferences {
  sectors: string[];
  companySizes: string[];
  predefinedNeeds: string[];
  predefinedSolutions: string[];
}

export const DEFAULT_PROFESSIONAL_PREFERENCES: ProfessionalPreferences = {
  sectors: [...DEFAULT_SECTORS],
  companySizes: [...DEFAULT_COMPANY_SIZES],
  predefinedNeeds: [...DEFAULT_NEEDS],
  predefinedSolutions: [...DEFAULT_SOLUTIONS],
};

interface EditableChipListProps {
  label: string;
  items: string[];
  defaultItems: readonly string[];
  onAdd: (item: string) => void;
  onRemove: (item: string) => void;
  onReset: () => void;
}

const EditableChipList = ({ 
  label, 
  items, 
  defaultItems,
  onAdd, 
  onRemove, 
  onReset 
}: EditableChipListProps) => {
  const [newItem, setNewItem] = useState("");
  
  const handleAdd = () => {
    if (newItem.trim() && !items.includes(newItem.trim())) {
      onAdd(newItem.trim());
      setNewItem("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  const isModified = JSON.stringify([...items].sort()) !== JSON.stringify([...defaultItems].sort());

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        {isModified && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-6 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Restaurar
          </Button>
        )}
      </div>
      
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <Badge 
            key={item} 
            variant="secondary" 
            className="pr-1 flex items-center gap-1"
          >
            {item}
            <button
              onClick={() => onRemove(item)}
              className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
      </div>
      
      <div className="flex gap-2">
        <Input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Añadir ${label.toLowerCase()}...`}
          className="flex-1 h-8 text-sm"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleAdd}
          disabled={!newItem.trim()}
          className="h-8"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

interface ProfessionalPreferencesEditorProps {
  value: ProfessionalPreferences;
  onChange: (value: ProfessionalPreferences) => void;
}

export function ProfessionalPreferencesEditor({ 
  value, 
  onChange 
}: ProfessionalPreferencesEditorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const updateField = (field: keyof ProfessionalPreferences, items: string[]) => {
    onChange({ ...value, [field]: items });
  };

  const addItem = (field: keyof ProfessionalPreferences, item: string) => {
    if (!value[field].includes(item)) {
      updateField(field, [...value[field], item]);
    }
  };

  const removeItem = (field: keyof ProfessionalPreferences, item: string) => {
    if (value[field].length > 1) {
      updateField(field, value[field].filter(i => i !== item));
    }
  };

  const resetField = (field: keyof ProfessionalPreferences) => {
    const defaults: Record<keyof ProfessionalPreferences, readonly string[]> = {
      sectors: DEFAULT_SECTORS,
      companySizes: DEFAULT_COMPANY_SIZES,
      predefinedNeeds: DEFAULT_NEEDS,
      predefinedSolutions: DEFAULT_SOLUTIONS,
    };
    updateField(field, [...defaults[field]]);
  };

  const resetAll = () => {
    onChange({ ...DEFAULT_PROFESSIONAL_PREFERENCES });
  };

  const isModified = JSON.stringify(value) !== JSON.stringify(DEFAULT_PROFESSIONAL_PREFERENCES);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-2">
      <CollapsibleTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full justify-between"
          type="button"
        >
          <span className="flex items-center gap-2">
            Personalizar opciones de registro
            {isModified && (
              <Badge variant="secondary" className="text-xs">
                Modificado
              </Badge>
            )}
          </span>
          {isOpen ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="space-y-4 pt-2">
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={resetAll}
            disabled={!isModified}
            className="text-xs"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Restaurar todo
          </Button>
        </div>
        
        <EditableChipList
          label="Sectores"
          items={value.sectors}
          defaultItems={DEFAULT_SECTORS}
          onAdd={(item) => addItem("sectors", item)}
          onRemove={(item) => removeItem("sectors", item)}
          onReset={() => resetField("sectors")}
        />

        <EditableChipList
          label="Tamaños de empresa"
          items={value.companySizes}
          defaultItems={DEFAULT_COMPANY_SIZES}
          onAdd={(item) => addItem("companySizes", item)}
          onRemove={(item) => removeItem("companySizes", item)}
          onReset={() => resetField("companySizes")}
        />

        <EditableChipList
          label="Necesidades predefinidas"
          items={value.predefinedNeeds}
          defaultItems={DEFAULT_NEEDS}
          onAdd={(item) => addItem("predefinedNeeds", item)}
          onRemove={(item) => removeItem("predefinedNeeds", item)}
          onReset={() => resetField("predefinedNeeds")}
        />

        <EditableChipList
          label="Soluciones predefinidas"
          items={value.predefinedSolutions}
          defaultItems={DEFAULT_SOLUTIONS}
          onAdd={(item) => addItem("predefinedSolutions", item)}
          onRemove={(item) => removeItem("predefinedSolutions", item)}
          onReset={() => resetField("predefinedSolutions")}
        />
      </CollapsibleContent>
    </Collapsible>
  );
}

export default ProfessionalPreferencesEditor;
