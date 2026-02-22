import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import EventPreferencesEditor, { EventPreferences } from "./EventPreferencesEditor";

interface EventSettingsEditorProps {
  eventId: string;
  name: string;
  date: string;
  rounds: number;
  tableSize: number;
  roundDuration: number;
  rotationMode: "fixed_host" | "all_rotate";
  genderParity: boolean;
  language: string;
  registrationSubtitle: string | null;
  registrationDescription: string | null;
  customAgeRanges: string[] | null;
  customGenders: string[] | null;
  customPreferences: string[] | null;
  customDatingPreferences: string[] | null;
  onUpdate: (updates: Record<string, any>) => void;
}

const EventSettingsEditor = ({
  eventId,
  name,
  date,
  rounds,
  tableSize,
  roundDuration,
  rotationMode,
  genderParity,
  language,
  registrationSubtitle,
  registrationDescription,
  customAgeRanges,
  customGenders,
  customPreferences,
  customDatingPreferences,
  onUpdate,
}: EventSettingsEditorProps) => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const [formName, setFormName] = useState(name);
  const [formDate, setFormDate] = useState(date);
  const [formRounds, setFormRounds] = useState(rounds);
  const [formTableSize, setFormTableSize] = useState(tableSize);
  const [formRoundDuration, setFormRoundDuration] = useState(roundDuration);
  const [formRotationMode, setFormRotationMode] = useState(rotationMode);
  const [formGenderParity, setFormGenderParity] = useState(genderParity);
  const [formLanguage, setFormLanguage] = useState<"es" | "en">(language as "es" | "en");
  const [formRegSubtitle, setFormRegSubtitle] = useState(registrationSubtitle || "");
  const [formRegDescription, setFormRegDescription] = useState(registrationDescription || "");
  const [formPreferences, setFormPreferences] = useState<EventPreferences>({
    ageRanges: customAgeRanges || ["18-24", "25-32", "33-40", "41-50", "50+"],
    genders: customGenders || ["Hombre", "Mujer", "No binario"],
    preferences: customPreferences || ["Sólo amistad", "Amistad y ligue"],
    datingPreferences: customDatingPreferences || [
      "Soy un hombre y busco una mujer",
      "Soy una mujer y busco un hombre",
      "Soy un hombre y busco un hombre",
      "Soy una mujer y busco una mujer",
      "Estoy abierto a todo",
    ],
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates = {
        name: formName,
        date: formDate,
        rounds: formRounds,
        table_size: formTableSize,
        round_duration: formRoundDuration,
        rotation_mode: formRotationMode,
        gender_parity: formGenderParity,
        language: formLanguage,
        registration_subtitle: formRegSubtitle.trim() || null,
        registration_description: formRegDescription.trim() || null,
        custom_age_ranges: formPreferences.ageRanges,
        custom_genders: formPreferences.genders,
        custom_preferences: formPreferences.preferences,
        custom_dating_preferences: formPreferences.datingPreferences,
      };

      const { error } = await supabase
        .from("events")
        .update(updates)
        .eq("id", eventId);

      if (error) throw error;

      onUpdate({
        ...updates,
        rotation_mode: formRotationMode as string,
      });

      toast({
        title: "Ajustes guardados",
        description: "La configuración del evento se ha actualizado correctamente",
      });
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: "No se pudieron guardar los ajustes",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ajustes del Evento</CardTitle>
        <CardDescription>
          Modifica la configuración del evento antes de iniciarlo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Event Name */}
          <div className="space-y-2">
            <Label htmlFor="event-name">Nombre del evento</Label>
            <Input
              id="event-name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="event-date">Fecha</Label>
            <Input
              id="event-date"
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
            />
          </div>

          {/* Rounds */}
          <div className="space-y-2">
            <Label htmlFor="event-rounds">Número de rondas</Label>
            <Input
              id="event-rounds"
              type="number"
              min={1}
              max={20}
              value={formRounds}
              onChange={(e) => setFormRounds(parseInt(e.target.value) || 1)}
            />
          </div>

          {/* Table Size */}
          <div className="space-y-2">
            <Label htmlFor="event-table-size">Tamaño de mesa</Label>
            <Input
              id="event-table-size"
              type="number"
              min={2}
              max={12}
              value={formTableSize}
              onChange={(e) => setFormTableSize(parseInt(e.target.value) || 2)}
            />
          </div>

          {/* Round Duration */}
          <div className="space-y-2">
            <Label htmlFor="event-duration">Duración de ronda (segundos)</Label>
            <Input
              id="event-duration"
              type="number"
              min={60}
              max={3600}
              step={30}
              value={formRoundDuration}
              onChange={(e) => setFormRoundDuration(parseInt(e.target.value) || 300)}
            />
            <p className="text-xs text-muted-foreground">
              {Math.floor(formRoundDuration / 60)} min {formRoundDuration % 60 > 0 ? `${formRoundDuration % 60} seg` : ""}
            </p>
          </div>

          {/* Rotation Mode */}
          <div className="space-y-2">
            <Label>Modo de rotación</Label>
            <Select value={formRotationMode} onValueChange={(v) => setFormRotationMode(v as "fixed_host" | "all_rotate")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed_host">Anfitrión fijo</SelectItem>
                <SelectItem value="all_rotate">Todos rotan</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Gender Parity */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <Label className="text-base">Paridad de género</Label>
            <p className="text-sm text-muted-foreground">
              Intentar equilibrar hombres y mujeres en cada mesa
            </p>
          </div>
          <Switch
            checked={formGenderParity}
            onCheckedChange={setFormGenderParity}
          />
        </div>

        {/* Event Language */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <Label className="text-base">Idioma del evento</Label>
            <p className="text-sm text-muted-foreground">
              Idioma del formulario de inscripción y las comunicaciones con participantes
            </p>
          </div>
          <Select value={formLanguage} onValueChange={(v) => setFormLanguage(v as "es" | "en")}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="es">🇪🇸 Español</SelectItem>
              <SelectItem value="en">🇬🇧 English</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Registration Form Customization */}
        <div className="space-y-4 p-4 border rounded-lg">
          <div>
            <Label className="text-base">Personalización del formulario de inscripción</Label>
            <p className="text-sm text-muted-foreground">
              Personaliza el subtítulo y la descripción que ven los participantes al registrarse
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reg-subtitle">Subtítulo del formulario</Label>
            <Input
              id="reg-subtitle"
              value={formRegSubtitle}
              onChange={(e) => setFormRegSubtitle(e.target.value)}
              placeholder={formLanguage === "en" ? "e.g. Fill in your details to participate" : "Ej: Completa tus datos para participar"}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reg-description">Descripción adicional</Label>
            <Textarea
              id="reg-description"
              value={formRegDescription}
              onChange={(e) => setFormRegDescription(e.target.value)}
              placeholder={formLanguage === "en" ? "e.g. Additional event info, dress code, location details..." : "Ej: Información adicional del evento, código de vestimenta, ubicación..."}
              rows={3}
            />
          </div>
        </div>

        <EventPreferencesEditor
          value={formPreferences}
          onChange={setFormPreferences}
        />

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Guardar cambios
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default EventSettingsEditor;
