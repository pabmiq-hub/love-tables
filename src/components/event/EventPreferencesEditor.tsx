import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
import { ChevronDown, Plus, X, RotateCcw, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AGE_RANGES,
  GENDERS,
  PREFERENCES,
  DATING_PREFERENCES,
} from "@/lib/excelParser";

export interface EventPreferences {
  ageRanges: string[];
  genders: string[];
  preferences: string[];
  datingPreferences: string[];
}

interface EventPreferencesEditorProps {
  value: EventPreferences;
  onChange: (value: EventPreferences) => void;
}

const DEFAULT_PREFERENCES: EventPreferences = {
  ageRanges: [...AGE_RANGES],
  genders: [...GENDERS],
  preferences: [...PREFERENCES],
  datingPreferences: [...DATING_PREFERENCES],
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
  onReset,
}: EditableChipListProps) => {
  const [newItem, setNewItem] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = () => {
    if (newItem.trim() && !items.includes(newItem.trim())) {
      onAdd(newItem.trim());
      setNewItem("");
      setIsAdding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    } else if (e.key === "Escape") {
      setIsAdding(false);
      setNewItem("");
    }
  };

  const isDefault = JSON.stringify([...items].sort()) === JSON.stringify([...defaultItems].sort());

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        {!isDefault && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 text-xs text-muted-foreground hover:text-foreground"
            onClick={onReset}
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Restaurar
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Badge
            key={item}
            variant="secondary"
            className="pl-3 pr-1 py-1 text-sm flex items-center gap-1"
          >
            {item}
            <button
              type="button"
              onClick={() => onRemove(item)}
              className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
        {isAdding ? (
          <div className="flex items-center gap-1">
            <Input
              autoFocus
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => {
                if (!newItem.trim()) {
                  setIsAdding(false);
                }
              }}
              placeholder="Nueva opción..."
              className="h-7 w-32 text-sm"
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2"
              onClick={handleAdd}
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="w-3 h-3 mr-1" />
            Añadir
          </Button>
        )}
      </div>
    </div>
  );
};

const EventPreferencesEditor = ({ value, onChange }: EventPreferencesEditorProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const updatePreferences = (key: keyof EventPreferences, newItems: string[]) => {
    onChange({
      ...value,
      [key]: newItems,
    });
  };

  const addItem = (key: keyof EventPreferences, item: string) => {
    updatePreferences(key, [...value[key], item]);
  };

  const removeItem = (key: keyof EventPreferences, item: string) => {
    updatePreferences(key, value[key].filter((i) => i !== item));
  };

  const resetToDefault = (key: keyof EventPreferences) => {
    updatePreferences(key, [...DEFAULT_PREFERENCES[key]]);
  };

  const resetAll = () => {
    onChange({ ...DEFAULT_PREFERENCES });
  };

  const hasChanges = JSON.stringify(value) !== JSON.stringify(DEFAULT_PREFERENCES);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-between",
            hasChanges && "border-primary/50 bg-primary/5"
          )}
        >
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            <span>Personalizar opciones de registro</span>
            {hasChanges && (
              <Badge variant="secondary" className="text-xs">
                Personalizado
              </Badge>
            )}
          </div>
          <ChevronDown
            className={cn(
              "w-4 h-4 transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-4">
        <div className="space-y-6 p-4 border rounded-lg bg-muted/30">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Personaliza las opciones que verán los participantes al registrarse
            </p>
            {hasChanges && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetAll}
                className="text-xs"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Restaurar todo
              </Button>
            )}
          </div>

          <EditableChipList
            label="📊 Rangos de Edad"
            items={value.ageRanges}
            defaultItems={AGE_RANGES}
            onAdd={(item) => addItem("ageRanges", item)}
            onRemove={(item) => removeItem("ageRanges", item)}
            onReset={() => resetToDefault("ageRanges")}
          />

          <EditableChipList
            label="👤 Géneros"
            items={value.genders}
            defaultItems={GENDERS}
            onAdd={(item) => addItem("genders", item)}
            onRemove={(item) => removeItem("genders", item)}
            onReset={() => resetToDefault("genders")}
          />

          <EditableChipList
            label="🤝 Tipos de Conexión"
            items={value.preferences}
            defaultItems={PREFERENCES}
            onAdd={(item) => addItem("preferences", item)}
            onRemove={(item) => removeItem("preferences", item)}
            onReset={() => resetToDefault("preferences")}
          />

          <EditableChipList
            label="❤️ Preferencias de Ligue"
            items={value.datingPreferences}
            defaultItems={DATING_PREFERENCES}
            onAdd={(item) => addItem("datingPreferences", item)}
            onRemove={(item) => removeItem("datingPreferences", item)}
            onReset={() => resetToDefault("datingPreferences")}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export { DEFAULT_PREFERENCES };
export default EventPreferencesEditor;
