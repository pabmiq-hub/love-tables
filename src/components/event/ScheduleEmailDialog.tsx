import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CalendarIcon, Clock, X } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ScheduleEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSchedule: (date: Date) => void;
  onCancel: () => void;
  currentSchedule: Date | null;
  isLoading: boolean;
}

const ScheduleEmailDialog = ({
  open,
  onOpenChange,
  onSchedule,
  onCancel,
  currentSchedule,
  isLoading,
}: ScheduleEmailDialogProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    currentSchedule || undefined
  );
  const [selectedHour, setSelectedHour] = useState<string>(
    currentSchedule ? format(currentSchedule, "HH") : "12"
  );
  const [selectedMinute, setSelectedMinute] = useState<string>(
    currentSchedule ? format(currentSchedule, "mm") : "00"
  );

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
  const minutes = ["00", "15", "30", "45"];

  const handleSchedule = () => {
    if (!selectedDate) return;
    
    const scheduledDate = new Date(selectedDate);
    scheduledDate.setHours(parseInt(selectedHour), parseInt(selectedMinute), 0, 0);
    
    onSchedule(scheduledDate);
  };

  const isValidSchedule = selectedDate && new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    selectedDate.getDate(),
    parseInt(selectedHour),
    parseInt(selectedMinute)
  ) > new Date();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Programar envío de emails
          </AlertDialogTitle>
          <AlertDialogDescription>
            Selecciona la fecha y hora en la que se enviarán automáticamente los emails con los resultados de matches.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {/* Date Picker */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Fecha</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? (
                    format(selectedDate, "PPP", { locale: es })
                  ) : (
                    "Selecciona una fecha"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time Picker */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Hora</label>
            <div className="flex gap-2">
              <Select value={selectedHour} onValueChange={setSelectedHour}>
                <SelectTrigger className="w-24">
                  <SelectValue placeholder="Hora" />
                </SelectTrigger>
                <SelectContent>
                  {hours.map((hour) => (
                    <SelectItem key={hour} value={hour}>
                      {hour}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="flex items-center text-lg">:</span>
              <Select value={selectedMinute} onValueChange={setSelectedMinute}>
                <SelectTrigger className="w-24">
                  <SelectValue placeholder="Min" />
                </SelectTrigger>
                <SelectContent>
                  {minutes.map((minute) => (
                    <SelectItem key={minute} value={minute}>
                      {minute}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Preview */}
          {selectedDate && (
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p className="text-muted-foreground">
                Los emails se enviarán el{" "}
                <span className="font-medium text-foreground">
                  {format(selectedDate, "EEEE d 'de' MMMM 'de' yyyy", { locale: es })}
                </span>{" "}
                a las{" "}
                <span className="font-medium text-foreground">
                  {selectedHour}:{selectedMinute}
                </span>
              </p>
            </div>
          )}

          {!isValidSchedule && selectedDate && (
            <p className="text-sm text-destructive">
              La fecha y hora seleccionada debe ser en el futuro
            </p>
          )}
        </div>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          {currentSchedule && (
            <Button
              variant="ghost"
              onClick={onCancel}
              disabled={isLoading}
              className="text-destructive hover:text-destructive"
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar programación
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <AlertDialogCancel disabled={isLoading}>Cerrar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSchedule}
              disabled={!isValidSchedule || isLoading}
            >
              {isLoading ? "Guardando..." : "Programar envío"}
            </AlertDialogAction>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ScheduleEmailDialog;
