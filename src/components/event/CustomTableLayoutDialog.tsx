import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, Save } from "lucide-react";
import { CustomTableLayout } from "@/lib/customTableLayout";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCapacity: number;
  initialLayout: CustomTableLayout | null | undefined;
  onSave: (layout: CustomTableLayout) => void;
}

const CustomTableLayoutDialog = ({ open, onOpenChange, defaultCapacity, initialLayout, onSave }: Props) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [numTables, setNumTables] = useState<number>(initialLayout?.tables.length || 5);
  const [capacities, setCapacities] = useState<number[]>(
    initialLayout?.tables.map(t => t.capacity) || []
  );

  useEffect(() => {
    if (open) {
      const initial = initialLayout?.tables.map(t => t.capacity);
      setStep(1);
      setNumTables(initial?.length || 5);
      setCapacities(initial || []);
    }
  }, [open, initialLayout]);

  const goToStep2 = () => {
    const n = Math.max(1, Math.min(50, Math.floor(numTables) || 1));
    // Preserve previous capacities where possible
    const next = Array.from({ length: n }, (_, i) => capacities[i] ?? defaultCapacity ?? 4);
    setCapacities(next);
    setNumTables(n);
    setStep(2);
  };

  const updateCapacity = (idx: number, value: number) => {
    setCapacities(prev => prev.map((c, i) => (i === idx ? value : c)));
  };

  const totalSeats = capacities.reduce((a, b) => a + (Number(b) || 0), 0);

  const handleSave = () => {
    const cleaned = capacities.map(c => Math.max(2, Math.min(20, Math.floor(Number(c) || 0))));
    onSave({ enabled: true, tables: cleaned.map(capacity => ({ capacity })) });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Personalizar mesas</DialogTitle>
          <DialogDescription>
            {step === 1
              ? "¿Cuántas mesas tendrá el evento?"
              : "Define la capacidad de cada mesa. Los participantes se reparten proporcionalmente."}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-2">
            <Label htmlFor="num-tables">Número de mesas</Label>
            <Input
              id="num-tables"
              type="number"
              min={1}
              max={50}
              value={numTables}
              onChange={(e) => setNumTables(parseInt(e.target.value) || 1)}
            />
          </div>
        ) : (
          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
            {capacities.map((cap, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <Label className="w-20 text-sm">Mesa {idx + 1}</Label>
                <Input
                  type="number"
                  min={2}
                  max={20}
                  value={cap}
                  onChange={(e) => updateCapacity(idx, parseInt(e.target.value) || 0)}
                />
              </div>
            ))}
            <p className="text-xs text-muted-foreground pt-1">
              Capacidad total: <strong>{totalSeats}</strong> plazas en {capacities.length} mesas
            </p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          {step === 2 && (
            <Button variant="ghost" onClick={() => setStep(1)} className="mr-auto">
              <ChevronLeft className="w-4 h-4 mr-1" /> Atrás
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          {step === 1 ? (
            <Button onClick={goToStep2}>
              Siguiente <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-1" /> Guardar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CustomTableLayoutDialog;
