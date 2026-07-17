import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Users } from "lucide-react";

export interface SlotQuota {
  gender: string;
  ageRange: string;
  maxSlots: number;
}

interface EventQuotasEditorProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  quotas: SlotQuota[];
  onQuotasChange: (quotas: SlotQuota[]) => void;
  availableGenders: string[];
  availableAgeRanges: string[];
  waitlistEnabled?: boolean;
  onWaitlistEnabledChange?: (enabled: boolean) => void;
}

const EventQuotasEditor = ({
  enabled,
  onEnabledChange,
  quotas,
  onQuotasChange,
  availableGenders,
  availableAgeRanges,
  waitlistEnabled = true,
  onWaitlistEnabledChange,
}: EventQuotasEditorProps) => {
  const addQuota = () => {
    const newQuota: SlotQuota = {
      gender: availableGenders[0] || "Hombre",
      ageRange: availableAgeRanges[0] || "25-32",
      maxSlots: 10,
    };
    onQuotasChange([...quotas, newQuota]);
  };

  const updateQuota = (index: number, field: keyof SlotQuota, value: string | number) => {
    const updatedQuotas = [...quotas];
    updatedQuotas[index] = { ...updatedQuotas[index], [field]: value };
    onQuotasChange(updatedQuotas);
  };

  const removeQuota = (index: number) => {
    onQuotasChange(quotas.filter((_, i) => i !== index));
  };

  const totalSlots = quotas.reduce((sum, q) => sum + q.maxSlots, 0);

  // Check for duplicate combinations
  const getDuplicateWarning = (index: number): boolean => {
    const current = quotas[index];
    return quotas.some((q, i) => 
      i !== index && q.gender === current.gender && q.ageRange === current.ageRange
    );
  };

  return (
    <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <Label htmlFor="quotas-toggle" className="font-medium cursor-pointer">
              Establecer requisitos de registro
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Limita cuántas plazas hay disponibles por género y rango de edad
            </p>
          </div>
        </div>
        <Switch
          id="quotas-toggle"
          checked={enabled}
          onCheckedChange={onEnabledChange}
        />
      </div>

      {enabled && (
        <div className="ml-[52px] space-y-4">
          <p className="text-sm text-muted-foreground">
            Configura cuántas plazas disponibles hay para cada grupo:
          </p>

          {quotas.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No hay cuotas definidas. Añade una para empezar.
            </div>
          ) : (
            <div className="space-y-3">
              {quotas.map((quota, index) => (
                <div 
                  key={index} 
                  className={`flex items-center gap-2 p-3 rounded-lg bg-background border ${
                    getDuplicateWarning(index) ? 'border-amber-500' : 'border-border'
                  }`}
                >
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <Select 
                      value={quota.gender} 
                      onValueChange={(v) => updateQuota(index, 'gender', v)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Género" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableGenders.map((g) => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select 
                      value={quota.ageRange} 
                      onValueChange={(v) => updateQuota(index, 'ageRange', v)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Edad" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableAgeRanges.map((r) => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Input
                      type="number"
                      min={1}
                      max={999}
                      value={quota.maxSlots}
                      onChange={(e) => updateQuota(index, 'maxSlots', Math.max(1, parseInt(e.target.value) || 1))}
                      className="h-9"
                      placeholder="Plazas"
                    />
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => removeQuota(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={addQuota}
          >
            <Plus className="w-4 h-4 mr-2" />
            Añadir cuota
          </Button>

          {quotas.length > 0 && (
            <div className="flex items-center justify-between text-sm pt-2 border-t">
              <span className="text-muted-foreground">Total plazas configuradas:</span>
              <span className="font-semibold">{totalSlots}</span>
            </div>
          )}


          {onWaitlistEnabledChange && (
            <div className="flex items-start justify-between gap-3 p-3 rounded-lg border bg-background">
              <div className="min-w-0">
                <Label htmlFor="quota-waitlist-toggle" className="font-medium cursor-pointer">
                  Lista de espera cuando la cuota esté completa
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Si un grupo llena sus plazas, los nuevos registros se apuntan a la lista de espera en lugar de ser rechazados.
                </p>
              </div>
              <Switch
                id="quota-waitlist-toggle"
                checked={waitlistEnabled}
                onCheckedChange={onWaitlistEnabledChange}
              />
            </div>
          )}

          {quotas.some((_, i) => getDuplicateWarning(i)) && (
            <p className="text-xs text-destructive">
              ⚠️ Hay combinaciones duplicadas de género y edad
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default EventQuotasEditor;
