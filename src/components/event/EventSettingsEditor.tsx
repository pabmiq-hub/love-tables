import { useState, useEffect } from "react";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Eye, ClipboardList, Lock, KeyRound, Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import EventPreferencesEditor, { EventPreferences } from "./EventPreferencesEditor";
import EventQuotasEditor, { SlotQuota } from "./EventQuotasEditor";
import GroupRoundsEditor, { GroupRound } from "./GroupRoundsEditor";
import RegistrationFormEditor, { FormField, getDefaultFields } from "./RegistrationFormEditor";
import RegistrationFormPreviewModal from "./RegistrationFormPreviewModal";
import GameModeEditor from "./GameModeEditor";
import { GameModeConfig, EMPTY_GAME_MODE, normalizeGameMode } from "@/lib/gameMode";
import { FeatureGate } from "@/components/FeatureGate";
import { useFeatures } from "@/hooks/useFeatures";
import CustomTableLayoutDialog from "./CustomTableLayoutDialog";
import { CustomTableLayout, isCustomTablesEnabled } from "@/lib/customTableLayout";
import { Settings2 } from "lucide-react";

interface EventSettingsEditorProps {
  eventId: string;
  name: string;
  date: string;
  eventTime: string | null;
  eventLocation: string | null;
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
  module?: string | null;
  professionalConfig?: any;
  groupRounds?: GroupRound[] | null;
  checkinOpensMinutesBefore?: number;
  superLikeEnabled?: boolean;
  repeatRequestEnabled?: boolean;
  crushEnabled?: boolean;
  codeSendMode?: string;
  eventStatus?: string;
  preliminaryRoundEnabled?: boolean;
  reminderMode?: string;
  reminderScheduledAt?: string | null;
  gameMode?: any;
  participantsCount?: number;
  tablesGenerationMode?: string;
  registrationRequirementsEnabled?: boolean;
  slotQuotas?: SlotQuota[] | null;
  paymentTrackingEnabled?: boolean;
  paymentRemindersEnabled?: boolean;
  paymentReminderFirstHours?: number;
  paymentReminderSecondHours?: number | null;
  customTables?: CustomTableLayout | null;
  onUpdate: (updates: Record<string, any>) => void;
}

const EventSettingsEditor = ({
  eventId,
  name,
  date,
  eventTime,
  eventLocation,
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
  module: eventModule,
  professionalConfig,
  groupRounds: initialGroupRounds,
  checkinOpensMinutesBefore = 60,
  superLikeEnabled: initialSuperLikeEnabled = false,
  repeatRequestEnabled: initialRepeatRequestEnabled = false,
  crushEnabled: initialCrushEnabled = false,
  codeSendMode: initialCodeSendMode = "on_registration",
  eventStatus = "pending",
  preliminaryRoundEnabled: initialPreliminaryRoundEnabled = false,
  reminderMode: initialReminderMode = "manual",
  reminderScheduledAt: initialReminderScheduledAt = null,
  gameMode: initialGameMode = null,
  participantsCount = 0,
  tablesGenerationMode: initialTablesGenerationMode = "upfront",
  registrationRequirementsEnabled: initialRegRequirementsEnabled = false,
  slotQuotas: initialSlotQuotas = null,
  paymentTrackingEnabled: initialPaymentTrackingEnabled = false,
  paymentRemindersEnabled: initialPaymentRemindersEnabled = false,
  paymentReminderFirstHours: initialPaymentReminderFirstHours = 24,
  paymentReminderSecondHours: initialPaymentReminderSecondHours = null,
  customTables: initialCustomTables = null,
  onUpdate,
}: EventSettingsEditorProps) => {
  const { toast } = useToast();
  const { hasFeature, isSuperAdmin } = useFeatures();
  const [isSaving, setIsSaving] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const [formName, setFormName] = useState(name);
  const [formDate, setFormDate] = useState(date);
  const [formEventTime, setFormEventTime] = useState(eventTime || "");
  const [formEventLocation, setFormEventLocation] = useState(eventLocation || "");
  const [formRounds, setFormRounds] = useState(rounds);
  const [formTableSize, setFormTableSize] = useState(tableSize);
  const [formRoundDuration, setFormRoundDuration] = useState(roundDuration);
  const [formRotationMode, setFormRotationMode] = useState(rotationMode);
  const [formGenderParity, setFormGenderParity] = useState(genderParity);
  const [formLanguage, setFormLanguage] = useState<"es" | "en">(language as "es" | "en");
  const [formRegSubtitle, setFormRegSubtitle] = useState(registrationSubtitle || "");
  const [formRegDescription, setFormRegDescription] = useState(registrationDescription || "");
  const [formB2BRotation, setFormB2BRotation] = useState<string>(
    professionalConfig?.rotation_type || "client_fixed"
  );
  const [formGroupRoundsEnabled, setFormGroupRoundsEnabled] = useState(
    Array.isArray(initialGroupRounds) && initialGroupRounds.length > 0
  );
  const [formGroupRounds, setFormGroupRounds] = useState<GroupRound[]>(
    (initialGroupRounds as GroupRound[]) || []
  );
  const [formSuperLikeEnabled, setFormSuperLikeEnabled] = useState(initialSuperLikeEnabled);
  const [formRepeatRequestEnabled, setFormRepeatRequestEnabled] = useState(initialRepeatRequestEnabled);
  const [formCrushEnabled, setFormCrushEnabled] = useState(initialCrushEnabled);
  const [formCheckinMinutes, setFormCheckinMinutes] = useState(checkinOpensMinutesBefore);
  const [formCodeSendMode, setFormCodeSendMode] = useState(initialCodeSendMode);
  const [formPreliminaryRoundEnabled, setFormPreliminaryRoundEnabled] = useState(initialPreliminaryRoundEnabled);
  const [formReminderMode, setFormReminderMode] = useState(initialReminderMode);
  const [formReminderScheduledAt, setFormReminderScheduledAt] = useState(initialReminderScheduledAt || "");
  const [formGameMode, setFormGameMode] = useState<GameModeConfig>(
    normalizeGameMode(initialGameMode) || { ...EMPTY_GAME_MODE }
  );
  const [formTablesGenerationMode, setFormTablesGenerationMode] = useState<string>(
    initialTablesGenerationMode || "upfront"
  );
  const canUseGameMode = hasFeature("game_mode") || isSuperAdmin;
  const [formRegRequirementsEnabled, setFormRegRequirementsEnabled] = useState(initialRegRequirementsEnabled);
  const [formSlotQuotas, setFormSlotQuotas] = useState<SlotQuota[]>(
    Array.isArray(initialSlotQuotas) ? (initialSlotQuotas as SlotQuota[]) : []
  );
  const [formPaymentTrackingEnabled, setFormPaymentTrackingEnabled] = useState(initialPaymentTrackingEnabled);
  const [formPaymentRemindersEnabled, setFormPaymentRemindersEnabled] = useState(initialPaymentRemindersEnabled);
  const [formPaymentReminderFirstHours, setFormPaymentReminderFirstHours] = useState<number>(initialPaymentReminderFirstHours || 24);
  const [formPaymentReminderSecondEnabled, setFormPaymentReminderSecondEnabled] = useState<boolean>(
    initialPaymentReminderSecondHours != null
  );
  const [formCustomTables, setFormCustomTables] = useState<CustomTableLayout | null>(
    initialCustomTables && isCustomTablesEnabled(initialCustomTables) ? initialCustomTables : null
  );
  const [showCustomTablesDialog, setShowCustomTablesDialog] = useState(false);
  const [formPaymentReminderSecondHours, setFormPaymentReminderSecondHours] = useState<number>(
    initialPaymentReminderSecondHours ?? 48
  );
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

  // Registration form customization
  const [customFormEnabled, setCustomFormEnabled] = useState(false);
  const [customFormFields, setCustomFormFields] = useState<FormField[]>([]);

  const isProfessional = eventModule === "professional";
  const isLocked = eventStatus !== "pending";
  const canUseCustomTables = (hasFeature("custom_table_layout") || isSuperAdmin) && !isProfessional;
  const customTablesActive = isCustomTablesEnabled(formCustomTables);

  // Sync super like prop
  useEffect(() => {
    setFormSuperLikeEnabled(initialSuperLikeEnabled);
  }, [initialSuperLikeEnabled]);

  // Sync repeat request prop
  useEffect(() => {
    setFormRepeatRequestEnabled(initialRepeatRequestEnabled);
  }, [initialRepeatRequestEnabled]);

  // Sync crush prop
  useEffect(() => {
    setFormCrushEnabled(initialCrushEnabled);
  }, [initialCrushEnabled]);

  // Load custom registration form from DB
  useEffect(() => {
    const loadCustomForm = async () => {
      const { data } = await supabase
        .from("events")
        .select("custom_registration_form")
        .eq("id", eventId)
        .single();

      if (data?.custom_registration_form) {
        const formConfig = data.custom_registration_form as any;
        if (formConfig.fields && formConfig.formMode === "custom") {
          setCustomFormEnabled(true);
          setCustomFormFields(formConfig.fields);
        }
      }
    };
    loadCustomForm();
  }, [eventId]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates: Record<string, any> = {
        name: formName,
        date: formDate,
        event_time: formEventTime.trim() || null,
        event_location: formEventLocation.trim() || null,
        rounds: formRounds,
        table_size: formTableSize,
        custom_tables: canUseCustomTables && customTablesActive ? formCustomTables : null,
        round_duration: formRoundDuration,
        rotation_mode: formRotationMode,
        gender_parity: isProfessional ? false : formGenderParity,
        language: formLanguage,
        registration_subtitle: formRegSubtitle.trim() || null,
        registration_description: formRegDescription.trim() || null,
        custom_age_ranges: formPreferences.ageRanges,
        custom_genders: formPreferences.genders,
        custom_preferences: formPreferences.preferences,
        custom_dating_preferences: formPreferences.datingPreferences,
        group_rounds: formGroupRoundsEnabled && formGroupRounds.length > 0 ? formGroupRounds : null,
        custom_registration_form: customFormEnabled && customFormFields.length > 0
          ? { fields: customFormFields, formMode: "custom" }
          : null,
        super_like_enabled: !isProfessional ? formSuperLikeEnabled : false,
        repeat_request_enabled: !isProfessional ? formRepeatRequestEnabled : false,
        crush_enabled: !isProfessional ? formCrushEnabled : false,
        checkin_opens_minutes_before: formCheckinMinutes,
        code_send_mode: formCodeSendMode,
        reminder_mode: formReminderMode,
        reminder_scheduled_at: formReminderMode === "custom" && formReminderScheduledAt ? formReminderScheduledAt : null,
        tables_generation_mode: formTablesGenerationMode,
        registration_requirements_enabled: !isProfessional ? formRegRequirementsEnabled : false,
        slot_quotas: !isProfessional && formRegRequirementsEnabled ? formSlotQuotas : null,
        payment_tracking_enabled: formPaymentTrackingEnabled,
        payment_reminders_enabled: formPaymentTrackingEnabled && formPaymentRemindersEnabled,
        payment_reminder_first_hours: Math.max(1, Number(formPaymentReminderFirstHours) || 24),
        payment_reminder_second_hours: formPaymentReminderSecondEnabled
          ? Math.max(
              Math.max(1, Number(formPaymentReminderFirstHours) || 24) + 1,
              Number(formPaymentReminderSecondHours) || 48
            )
          : null,
      };

      // Handle preliminary round
      if (!isProfessional && formPreliminaryRoundEnabled) {
        updates.preliminary_round = { enabled: true, tables: [], started_at: null };
      } else if (!formPreliminaryRoundEnabled) {
        updates.preliminary_round = null;
      }

      // Handle game mode (Modo lúdico) — Enterprise + Social only
      if (!isProfessional && canUseGameMode && formGameMode.enabled && formGameMode.dynamics.length > 0) {
        // Preserve existing 'played' map so live preliminary state is not lost
        const existingPlayed =
          (initialGameMode && typeof initialGameMode === "object" && (initialGameMode as any).played) || {};
        updates.game_mode = {
          enabled: true,
          dynamics: formGameMode.dynamics,
          played: existingPlayed,
        };
      } else if (!formGameMode.enabled) {
        updates.game_mode = null;
      }

      if (isProfessional) {
        const updatedProfConfig = {
          ...(professionalConfig || {}),
          rotation_type: formB2BRotation,
        };
        updates.professional_config = updatedProfConfig;
      }

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

  // Determine which fields to show in the preview
  const previewFields = customFormEnabled && customFormFields.length > 0
    ? customFormFields
    : getDefaultFields(isProfessional ? "professional" : "social");

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Ajustes del evento</CardTitle>
          <CardDescription>
            {isLocked 
              ? "Algunos ajustes estructurales están bloqueados porque el evento ya ha comenzado"
              : "Modifica la configuración del evento antes de iniciarlo"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="event-name">Nombre del evento</Label>
              <Input
                id="event-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-date">Fecha</Label>
              <Input
                id="event-date"
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-time">Hora</Label>
              <Input
                id="event-time"
                type="time"
                value={formEventTime}
                onChange={(e) => setFormEventTime(e.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="event-location">Ubicación</Label>
              <Input
                id="event-location"
                placeholder="Ej: Restaurante El Encuentro, C/ Gran Vía 12"
                value={formEventLocation}
                onChange={(e) => setFormEventLocation(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-rounds">Número de rondas {isLocked && <Lock className="w-3 h-3 inline text-muted-foreground" />}</Label>
              <Input
                id="event-rounds"
                type="number"
                min={1}
                max={20}
                value={formRounds}
                onChange={(e) => setFormRounds(parseInt(e.target.value) || 1)}
                disabled={isLocked}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-table-size">Tamaño de mesa {isLocked && <Lock className="w-3 h-3 inline text-muted-foreground" />}</Label>
              {customTablesActive ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2 rounded-md border bg-muted/40 text-sm">
                    Personalizado · {formCustomTables!.tables.length} mesas · {formCustomTables!.tables.reduce((a, t) => a + (t.capacity || 0), 0)} plazas
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={() => setShowCustomTablesDialog(true)} disabled={isLocked}>
                    Editar
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setFormCustomTables(null)} disabled={isLocked}>
                    Quitar
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Input
                    id="event-table-size"
                    type="number"
                    min={2}
                    max={12}
                    value={formTableSize}
                    onChange={(e) => setFormTableSize(parseInt(e.target.value) || 2)}
                    disabled={isLocked}
                    className="flex-1"
                  />
                  {canUseCustomTables && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setShowCustomTablesDialog(true)}
                      disabled={isLocked}
                      title="Configurar mesas con capacidades individuales"
                    >
                      <Settings2 className="w-4 h-4 mr-1" />
                      Personalizar
                    </Button>
                  )}
                </div>
              )}
            </div>
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
            <div className="space-y-2">
              <Label>Modo de rotación {isLocked && <Lock className="w-3 h-3 inline text-muted-foreground" />}</Label>
              <Select value={formRotationMode} onValueChange={(v) => setFormRotationMode(v as "fixed_host" | "all_rotate")} disabled={isLocked}>
                <SelectTrigger disabled={isLocked}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed_host">Anfitrión fijo</SelectItem>
                  <SelectItem value="all_rotate">Todos rotan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isProfessional && (
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label className="text-base">Tipo de rotación B2B</Label>
                <p className="text-sm text-muted-foreground">
                  Define quién permanece fijo en la mesa y quién rota entre mesas
                </p>
              </div>
              <Select value={formB2BRotation} onValueChange={setFormB2BRotation}>
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client_fixed">Clientes fijos – Proveedores rotan</SelectItem>
                  <SelectItem value="provider_fixed">Proveedores fijos – Clientes rotan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {!isProfessional && (
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
          )}

          {!isProfessional && (
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label className="text-base">⭐ Super Like</Label>
                <p className="text-sm text-muted-foreground">
                  Permite a cada participante enviar 1 Super Like por evento. El destinatario recibirá un email anónimo animándole a enviar sus selecciones.
                </p>
              </div>
              <Switch
                checked={formSuperLikeEnabled}
                onCheckedChange={setFormSuperLikeEnabled}
              />
            </div>
          )}

          {!isProfessional && (
            <FeatureGate feature="repeat_request" showUpgrade={false}>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1 pr-4">
                  <Label className="text-base">🔁 Función "Repetir"</Label>
                  <p className="text-sm text-muted-foreground">
                    Permite a cada participante solicitar una vez por evento volver a coincidir con un compañero de mesa anterior. Si el destinatario acepta, se crea una inclusión automática para la siguiente ronda generada.
                  </p>
                </div>
                <Switch
                  checked={formRepeatRequestEnabled}
                  onCheckedChange={setFormRepeatRequestEnabled}
                />
              </div>
            </FeatureGate>
          )}

          {!isProfessional && (
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1 pr-4">
                <Label className="text-base">💘 Función "Flechazo"</Label>
                <p className="text-sm text-muted-foreground">
                  Permite a cada participante enviar 1 Flechazo directo por evento. El destinatario recibe un email para aceptar o rechazar. Si acepta, ambos reciben los datos de contacto del otro y, si aún quedan rondas, se sentarán en la misma mesa.
                </p>
              </div>
              <Switch
                checked={formCrushEnabled}
                onCheckedChange={setFormCrushEnabled}
              />
            </div>
          )}

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

          {!isProfessional && (
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1 pr-4">
                <Label className="text-base">Generación de rondas</Label>
                <p className="text-sm text-muted-foreground">
                  <strong>Anticipada:</strong> todas las rondas se generan al iniciar el evento.<br />
                  <strong>Justo a tiempo:</strong> cada ronda se genera al finalizar la anterior, excluyendo bajas/cancelaciones.
                </p>
              </div>
              <Select value={formTablesGenerationMode} onValueChange={setFormTablesGenerationMode}>
                <SelectTrigger className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upfront">Anticipada (al iniciar)</SelectItem>
                  <SelectItem value="per_round">Justo a tiempo (por ronda)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Check-in timing */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label className="text-base">Apertura del check-in</Label>
              <p className="text-sm text-muted-foreground">
                Tiempo antes del evento en que los participantes pueden hacer check-in
              </p>
            </div>
            <Select value={String(formCheckinMinutes)} onValueChange={(v) => setFormCheckinMinutes(Number(v))}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Solo manualmente</SelectItem>
                <SelectItem value="30">30 minutos antes</SelectItem>
                <SelectItem value="60">1 hora antes</SelectItem>
                <SelectItem value="120">2 horas antes</SelectItem>
                <SelectItem value="180">3 horas antes</SelectItem>
                <SelectItem value="360">6 horas antes</SelectItem>
                <SelectItem value="720">12 horas antes</SelectItem>
                <SelectItem value="1440">24 horas antes</SelectItem>
                <SelectItem value="2880">48 horas antes</SelectItem>
                <SelectItem value="99999">Siempre abierto</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Code send mode */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex-1 mr-4">
              <Label className="text-base flex items-center gap-2">
                <KeyRound className="w-4 h-4" />
                Envío de códigos de acceso
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                {formCodeSendMode === "on_registration"
                  ? "El código se envía automáticamente junto con la confirmación de inscripción"
                  : formCodeSendMode === "automatic"
                    ? "El código se envía automáticamente 24h antes del evento. Si alguien se inscribe con menos de 24h, lo recibe al momento"
                    : "Tú decides cuándo enviar los códigos manualmente desde el panel de participantes"}
              </p>
            </div>
            <Select value={formCodeSendMode} onValueChange={setFormCodeSendMode}>
              <SelectTrigger className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="on_registration">Al registrarse</SelectItem>
                <SelectItem value="automatic">Automático (24h antes)</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reminder mode */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex-1 mr-4">
              <Label className="text-base flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Recordatorio del evento
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                {formReminderMode === "manual"
                  ? "Envía recordatorios manualmente desde el panel del evento"
                  : formReminderMode === "24h"
                    ? "Se enviará un recordatorio automáticamente 24h antes del evento"
                    : formReminderMode === "48h"
                      ? "Se enviará un recordatorio automáticamente 48h antes del evento"
                      : "Se enviará un recordatorio en la fecha y hora configurada"}
              </p>
            </div>
            <Select value={formReminderMode} onValueChange={setFormReminderMode}>
              <SelectTrigger className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="24h">24h antes del evento</SelectItem>
                <SelectItem value="48h">48h antes del evento</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formReminderMode === "custom" && (
            <div className="ml-4 p-4 border rounded-lg bg-muted/30">
              <Label className="text-sm">Fecha y hora del recordatorio</Label>
              <Input
                type="datetime-local"
                value={formReminderScheduledAt}
                onChange={(e) => setFormReminderScheduledAt(e.target.value)}
                className="mt-2 w-64"
              />
            </div>
          )}

          {/* Preliminary Round - Social only, Enterprise feature */}
          {!isProfessional && (
            <FeatureGate feature="preliminary_round">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label className="text-base">🎯 Ronda Preliminar</Label>
                  <p className="text-sm text-muted-foreground">
                    Crea mesas de relleno mientras los participantes llegan, sin tener en cuenta preferencias. 
                    Ideal para que nadie espere sentado antes de iniciar el evento.
                  </p>
                </div>
                <Switch
                  checked={formPreliminaryRoundEnabled}
                  onCheckedChange={setFormPreliminaryRoundEnabled}
                />
              </div>
            </FeatureGate>
          )}

          {/* Game Mode (Modo lúdico) — Enterprise + Social only */}
          {!isProfessional && canUseGameMode && (
            <GameModeEditor
              value={formGameMode}
              onChange={setFormGameMode}
              estimatedTables={Math.max(1, Math.ceil(Math.max(participantsCount || 0, formTableSize) / Math.max(formTableSize, 1)))}
              totalRounds={formRounds}
              participantsCount={participantsCount || 0}
            />
          )}

          {/* Registration Form Customization */}
          <div className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Personalización del formulario de inscripción</Label>
                <p className="text-sm text-muted-foreground">
                  Personaliza el subtítulo, la descripción y los campos del formulario
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowPreviewModal(true)}>
                <Eye className="w-4 h-4 mr-1" />
                Vista previa
              </Button>
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
              <RichTextEditor
                value={formRegDescription}
                onChange={setFormRegDescription}
                placeholder={formLanguage === "en" ? "e.g. Additional event info, dress code, location details..." : "Ej: Información adicional del evento, código de vestimenta, ubicación..."}
                minHeight="120px"
              />
            </div>

            {/* Custom Registration Form Fields */}
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Campos personalizados del formulario</Label>
                </div>
                <Switch
                  checked={customFormEnabled}
                  onCheckedChange={(checked) => {
                    setCustomFormEnabled(checked);
                    if (checked && customFormFields.length === 0) {
                      setCustomFormFields(getDefaultFields(isProfessional ? "professional" : "social"));
                    }
                  }}
                />
              </div>
              {customFormEnabled && (
                <RegistrationFormEditor
                  fields={customFormFields}
                  onChange={setCustomFormFields}
                  eventModule={isProfessional ? "professional" : "social"}
                />
              )}
            </div>
          </div>

          {!isProfessional && (
            <GroupRoundsEditor
              enabled={formGroupRoundsEnabled}
              onEnabledChange={setFormGroupRoundsEnabled}
              groupRounds={formGroupRounds}
              onGroupRoundsChange={setFormGroupRounds}
              totalRounds={formRounds}
              defaultTableSize={formTableSize}
            />
          )}

          {!isProfessional && (
            <EventPreferencesEditor
              value={formPreferences}
              onChange={setFormPreferences}
            />
          )}

          {!isProfessional && (
            <EventQuotasEditor
              enabled={formRegRequirementsEnabled}
              onEnabledChange={setFormRegRequirementsEnabled}
              quotas={formSlotQuotas}
              onQuotasChange={setFormSlotQuotas}
              availableGenders={formPreferences.genders}
              availableAgeRanges={formPreferences.ageRanges}
            />
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Seguimiento de pagos</CardTitle>
              <CardDescription>
                Activa esta opción si cobras la entrada del evento desde otra plataforma. Podrás marcar manualmente qué participantes han pagado desde la lista de participantes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="payment-tracking-toggle" className="cursor-pointer">
                  Habilitar seguimiento de pagos
                </Label>
                <Switch
                  id="payment-tracking-toggle"
                  checked={formPaymentTrackingEnabled}
                  onCheckedChange={setFormPaymentTrackingEnabled}
                />
              </div>

              {formPaymentTrackingEnabled && (
                <div className="space-y-3 pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="payment-reminders-toggle" className="cursor-pointer">
                        Recordatorios automáticos de pago
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Envía un email a los participantes con la inscripción aún pendiente de pago. Personaliza la plantilla en "Ajustes de comunicación → Recordatorio pago".
                      </p>
                    </div>
                    <Switch
                      id="payment-reminders-toggle"
                      checked={formPaymentRemindersEnabled}
                      onCheckedChange={setFormPaymentRemindersEnabled}
                    />
                  </div>

                  {formPaymentRemindersEnabled && (
                    <div className="space-y-3 ml-1">
                      <div className="flex items-center gap-3">
                        <Label className="text-sm w-44 shrink-0">1.º recordatorio (horas)</Label>
                        <Input
                          type="number"
                          min={1}
                          max={720}
                          value={formPaymentReminderFirstHours}
                          onChange={(e) => setFormPaymentReminderFirstHours(Number(e.target.value) || 24)}
                          className="w-24"
                        />
                        <span className="text-xs text-muted-foreground">tras la inscripción</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 w-44 shrink-0">
                          <Switch
                            id="second-reminder-toggle"
                            checked={formPaymentReminderSecondEnabled}
                            onCheckedChange={setFormPaymentReminderSecondEnabled}
                          />
                          <Label htmlFor="second-reminder-toggle" className="text-sm cursor-pointer">
                            2.º recordatorio
                          </Label>
                        </div>
                        <Input
                          type="number"
                          min={formPaymentReminderFirstHours + 1}
                          max={720}
                          value={formPaymentReminderSecondHours}
                          onChange={(e) => setFormPaymentReminderSecondHours(Number(e.target.value) || 48)}
                          disabled={!formPaymentReminderSecondEnabled}
                          className="w-24"
                        />
                        <span className="text-xs text-muted-foreground">horas tras la inscripción</span>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        Los recordatorios se detienen automáticamente al marcar al participante como pagado.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

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

      {/* Registration Form Preview Modal */}
      <RegistrationFormPreviewModal
        open={showPreviewModal}
        onOpenChange={setShowPreviewModal}
        fields={previewFields}
        eventName={formName}
        eventDate={formDate}
        eventTime={formEventTime || null}
        eventLocation={formEventLocation || null}
        registrationSubtitle={formRegSubtitle || null}
        registrationDescription={formRegDescription || null}
        eventLang={formLanguage}
      />
    </>
  );
};

export default EventSettingsEditor;
