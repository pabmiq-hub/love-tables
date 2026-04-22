import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Mail, UserCheck, Bell, Heart, RotateCcw, Eye, Upload, X, Star, Clock, Repeat2 } from "lucide-react";
import { supabase as supabaseClient } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  CommunicationTemplates,
  TemplateKey,
  StructuredTemplate,
  MatchesWithoutTemplate,
  ReminderOptions,
  DEFAULT_TEMPLATES_ES,
  DEFAULT_TEMPLATES_EN,
} from "./communication/types";
import { normalizeCommunicationTemplates } from "./communication/normalizeTemplates";
import TemplateEditor from "./communication/TemplateEditor";
import EmailPreview from "./communication/EmailPreview";

const TABS_CONFIG: { key: TemplateKey; label: string; icon: typeof Mail; description: string; socialOnly?: boolean; hasVariant?: boolean; isMatchesWithout?: boolean }[] = [
  { key: "registration_confirmation", label: "Confirmación", icon: Mail, description: "Email al inscribirse", hasVariant: true },
  { key: "reminder", label: "Recordatorio", icon: Bell, description: "Recordatorio pre-evento" },
  { key: "selection_reminder", label: "Rec. selecciones", icon: Clock, description: "Recordatorio para enviar selecciones" },
  { key: "matches", label: "Resultados", icon: Heart, description: "Email de matches" },
  { key: "checkin_code", label: "Código de acceso", icon: UserCheck, description: "Email con el código personal" },
  { key: "super_like", label: "Super Like", icon: Star, description: "Notificación de Super Like", socialOnly: true },
  { key: "no_show", label: "No-show", icon: UserCheck, description: "Email a participantes que no asistieron", isMatchesWithout: true },
  { key: "repeat_request_received", label: "Repetir: recibido", icon: Repeat2, description: "Email al destinatario de la solicitud", socialOnly: true },
  { key: "repeat_request_accepted", label: "Repetir: aceptada", icon: Repeat2, description: "Email al solicitante cuando aceptan", socialOnly: true },
  { key: "repeat_request_declined", label: "Repetir: rechazada", icon: Repeat2, description: "Email al solicitante cuando rechazan o caduca", socialOnly: true },
];

interface CommunicationSettingsEditorProps {
  eventId: string;
  eventName: string;
  language: "es" | "en";
  module?: string | null;
  onUpdate: (updates: Record<string, any>) => void;
}

const CommunicationSettingsEditor = ({
  eventId,
  eventName,
  language,
  module,
  onUpdate,
}: CommunicationSettingsEditorProps) => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const defaults = language === "en" ? DEFAULT_TEMPLATES_EN : DEFAULT_TEMPLATES_ES;
  const [templates, setTemplates] = useState<CommunicationTemplates>({ ...defaults });
  const [matchesVariant, setMatchesVariant] = useState<"with" | "without">("with");
  const [registrationVariant, setRegistrationVariant] = useState<"without_code" | "with_code">("without_code");

  useEffect(() => {
    loadTemplates();
  }, [eventId]);

  const loadTemplates = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("events")
      .select("email_template")
      .eq("id", eventId)
      .single();

    if (data?.email_template) {
      const stored = data.email_template as any;
      if (stored.communication_templates_v2) {
        const merged = normalizeCommunicationTemplates({
          ...defaults,
          ...stored.communication_templates_v2,
        } as CommunicationTemplates, defaults);

        const parsedLogoHeight = Number(merged.logoHeight);
        merged.logoHeight = Number.isFinite(parsedLogoHeight)
          ? Math.min(120, Math.max(24, parsedLogoHeight))
          : defaults.logoHeight;

        setTemplates(merged);
      }
    }
    setIsLoading(false);
  };

  const updateTemplate = (key: TemplateKey, field: keyof StructuredTemplate, value: string) => {
    setTemplates(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  const updateMatchesExtraField = (fieldName: string, value: string) => {
    setTemplates(prev => ({
      ...prev,
      matches: {
        ...prev.matches,
        extraFields: { ...prev.matches.extraFields, [fieldName]: value },
      },
    }));
  };

  const updateMatchesWithout = (field: keyof MatchesWithoutTemplate, value: string) => {
    setTemplates(prev => ({
      ...prev,
      matches_without: { ...prev.matches_without, [field]: value },
    }));
  };

  const updateNoShow = (field: keyof MatchesWithoutTemplate, value: string) => {
    setTemplates(prev => ({
      ...prev,
      no_show: { ...prev.no_show, [field]: value },
    }));
  };

  const handleReset = (key: TemplateKey) => {
    if (key === "registration_confirmation" && registrationVariant === "with_code") {
      setTemplates(prev => ({
        ...prev,
        registration_with_code: defaults.registration_with_code,
      }));
    } else {
      setTemplates(prev => ({
        ...prev,
        [key]: defaults[key],
        ...(key === "matches" ? { matches_without: defaults.matches_without } : {}),
      }));
    }
    toast({ title: "Plantilla restaurada", description: "Se han restaurado los valores por defecto" });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: current } = await supabase
        .from("events")
        .select("email_template")
        .eq("id", eventId)
        .single();

      const existingTemplate = (current?.email_template as any) || {};
      const sanitizedLogoHeight = Math.min(120, Math.max(24, Number(templates.logoHeight) || defaults.logoHeight));
      const updatedTemplate = {
        ...existingTemplate,
        communication_templates_v2: {
          ...templates,
          logoHeight: sanitizedLogoHeight,
          headerTitle: templates.headerTitle != null ? templates.headerTitle.trim() : defaults.headerTitle,
        },
      };

      const { error } = await supabase
        .from("events")
        .update({ email_template: updatedTemplate })
        .eq("id", eventId);

      if (error) throw error;

      onUpdate({ email_template: updatedTemplate });
      toast({
        title: "Comunicaciones guardadas",
        description: "Las plantillas de comunicación se han actualizado correctamente",
      });
    } catch (error: any) {
      console.error("Error saving communication templates:", error);
      toast({
        title: "Error",
        description: "No se pudieron guardar las plantillas",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary" />
          Ajustes de comunicación
        </CardTitle>
        <CardDescription>
          Personaliza los mensajes que reciben los participantes. Edita los campos a la izquierda y ve la vista previa en tiempo real a la derecha.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Branding controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-6 p-4 bg-muted/30 rounded-lg border">
           <div className="space-y-2">
             <Label className="text-xs font-medium">Logo del email</Label>
             <div className="flex items-center gap-2">
               {templates.logoUrl ? (
                 <div className="flex items-center gap-2 flex-1">
                   <img
                     src={templates.logoUrl}
                     alt="Logo"
                     className="max-w-[120px] object-contain rounded border bg-background p-0.5"
                     style={{ maxHeight: `${Math.min(56, Math.max(24, Number(templates.logoHeight) || 48))}px` }}
                     onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                   />
                   <Button
                     variant="ghost"
                     size="icon"
                     className="h-7 w-7"
                     onClick={() => setTemplates(prev => ({ ...prev, logoUrl: "" }))}
                   >
                     <X className="w-3.5 h-3.5" />
                   </Button>
                 </div>
               ) : (
                 <Button
                   variant="outline"
                   size="sm"
                   className="flex-1 text-xs"
                   disabled={isUploadingLogo}
                   onClick={() => logoInputRef.current?.click()}
                 >
                   {isUploadingLogo ? (
                     <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                   ) : (
                     <Upload className="w-3.5 h-3.5 mr-1.5" />
                   )}
                   Subir logo
                 </Button>
               )}
               <input
                 ref={logoInputRef}
                 type="file"
                 accept="image/*"
                 className="hidden"
                 onChange={async (e) => {
                   const file = e.target.files?.[0];
                   if (!file) return;
                   setIsUploadingLogo(true);
                   try {
                     const ext = file.name.split('.').pop();
                     const { data: { user } } = await supabaseClient.auth.getUser();
                     if (!user) throw new Error('No authenticated user');
                     const path = `${user.id}/email-logo-${eventId}-${Date.now()}.${ext}`;
                     const { error: uploadError } = await supabaseClient.storage
                       .from('organizer-logos')
                       .upload(path, file, { upsert: true });
                     if (uploadError) throw uploadError;
                     const { data: { publicUrl } } = supabaseClient.storage
                       .from('organizer-logos')
                       .getPublicUrl(path);
                     setTemplates(prev => ({ ...prev, logoUrl: publicUrl }));
                     toast({ title: "Logo subido", description: "El logo se ha cargado correctamente" });
                   } catch (err: any) {
                     console.error("Error uploading logo:", err);
                     toast({ title: "Error", description: "No se pudo subir el logo", variant: "destructive" });
                   } finally {
                     setIsUploadingLogo(false);
                     e.target.value = '';
                   }
                 }}
               />
             </div>
           </div>
           <div className="space-y-2">
             <Label className="text-xs font-medium">Nombre de marca</Label>
             <Input
               value={templates.brandName}
               onChange={(e) => setTemplates(prev => ({ ...prev, brandName: e.target.value }))}
               placeholder="Konektum"
               className="text-xs"
             />
           </div>
           <div className="space-y-2">
             <Label className="text-xs font-medium">Cabecera común</Label>
             <Input
               value={templates.headerTitle}
               onChange={(e) => setTemplates(prev => ({ ...prev, headerTitle: e.target.value }))}
               placeholder={language === "en" ? "Welcome to the event!" : "¡Bienvenido/a al evento!"}
               className="text-xs"
             />
           </div>
           <div className="space-y-2">
             <Label className="text-xs font-medium">Tamaño del logo (px)</Label>
             <Input
               type="number"
               min={24}
               max={120}
               value={templates.logoHeight}
               onChange={(e) => {
                 const value = Number(e.target.value);
                 setTemplates(prev => ({
                   ...prev,
                   logoHeight: Number.isFinite(value) ? Math.min(120, Math.max(24, value)) : prev.logoHeight,
                 }));
               }}
               className="text-xs"
             />
           </div>
           <div className="space-y-2">
             <Label className="text-xs font-medium">Color principal</Label>
             <div className="flex gap-2">
               <Input
                 type="color"
                 value={templates.primaryColor}
                 onChange={(e) => setTemplates(prev => ({ ...prev, primaryColor: e.target.value }))}
                 className="w-10 h-9 p-1 cursor-pointer"
               />
               <Input
                 value={templates.primaryColor}
                 onChange={(e) => setTemplates(prev => ({ ...prev, primaryColor: e.target.value }))}
                 className="flex-1 text-xs"
               />
             </div>
           </div>
         </div>

        <Tabs defaultValue="registration_confirmation" className="w-full">
          <TabsList className="w-full flex-wrap h-auto gap-1 p-1">
            {TABS_CONFIG.filter(tab => !tab.socialOnly || module === 'social').map(tab => (
              <TabsTrigger key={tab.key} value={tab.key} className="flex-1 min-w-[120px]">
                <tab.icon className="w-4 h-4 mr-1.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {TABS_CONFIG.map(tab => (
            <TabsContent key={tab.key} value={tab.key} className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-semibold text-sm">{tab.label}</h4>
                  <p className="text-xs text-muted-foreground">{tab.description}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleReset(tab.key)}>
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  Restaurar
                </Button>
              </div>

              {/* Registration variant toggle */}
              {tab.key === "registration_confirmation" && (
                <div className="space-y-2 mb-4">
                  <p className="text-xs text-muted-foreground">
                    <strong>Sin código:</strong> Confirmación básica (el código se envía más tarde). <strong>Al registrarse:</strong> Confirmación con código de acceso incluido. Si se registran en las 24h previas al evento, recibirán automáticamente la versión con código.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant={registrationVariant === "without_code" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setRegistrationVariant("without_code")}
                    >
                      Sin código
                    </Button>
                    <Button
                      variant={registrationVariant === "with_code" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setRegistrationVariant("with_code")}
                    >
                      Al registrarse (con código)
                    </Button>
                  </div>
                </div>
              )}

              {/* Matches variant toggle */}
              {tab.key === "matches" && (
                <div className="flex gap-2 mb-4">
                  <Button
                    variant={matchesVariant === "with" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMatchesVariant("with")}
                  >
                    Con matches
                  </Button>
                  <Button
                    variant={matchesVariant === "without" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMatchesVariant("without")}
                  >
                    Sin matches
                  </Button>
                </div>
              )}

              {/* Reminder options */}
              {tab.key === "reminder" && (
                <div className="space-y-3 mb-4 p-3 border rounded-lg bg-muted/20">
                  <p className="text-xs font-medium">Contenido opcional del recordatorio:</p>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">📅 Enlaces de calendario (Google / iCal)</Label>
                    <Switch
                      checked={templates.reminderOptions?.showCalendarLinks ?? true}
                      onCheckedChange={(v) => setTemplates(prev => ({ ...prev, reminderOptions: { ...prev.reminderOptions!, showCalendarLinks: v } }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">❌ Opción de darse de baja</Label>
                    <Switch
                      checked={templates.reminderOptions?.showUnsubscribe ?? true}
                      onCheckedChange={(v) => setTemplates(prev => ({ ...prev, reminderOptions: { ...prev.reminderOptions!, showUnsubscribe: v } }))}
                    />
                  </div>
                  {templates.reminderOptions?.showUnsubscribe && (
                    <div className="space-y-1 ml-4">
                      <Label className="text-xs">Texto del enlace de baja</Label>
                      <Input
                        value={templates.reminderOptions?.unsubscribeText || ""}
                        onChange={(e) => setTemplates(prev => ({ ...prev, reminderOptions: { ...prev.reminderOptions!, unsubscribeText: e.target.value } }))}
                        className="text-xs h-8"
                        placeholder="Si no puedes asistir, haz clic aquí"
                      />
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">⏱️ Cuenta atrás para el evento</Label>
                    <Switch
                      checked={templates.reminderOptions?.showCountdown ?? false}
                      onCheckedChange={(v) => setTemplates(prev => ({ ...prev, reminderOptions: { ...prev.reminderOptions!, showCountdown: v } }))}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Editor */}
                <div>
                  {tab.key === "no_show" ? (
                    <TemplateEditor
                      template={templates.matches as unknown as StructuredTemplate}
                      templateKey={tab.key}
                      matchesVariant="without"
                      matchesWithoutTemplate={templates.no_show}
                      onChange={() => {}}
                      onChangeWithout={updateNoShow}
                    />
                  ) : (
                    <TemplateEditor
                      template={tab.key === "registration_confirmation" && registrationVariant === "with_code" ? templates.registration_with_code : templates[tab.key] as StructuredTemplate}
                      templateKey={tab.key === "registration_confirmation" && registrationVariant === "with_code" ? "registration_with_code" : tab.key}
                      matchesVariant={tab.key === "matches" ? matchesVariant : undefined}
                      matchesWithoutTemplate={tab.key === "matches" ? templates.matches_without : undefined}
                      onChange={(field, value) => {
                        if (tab.key === "registration_confirmation" && registrationVariant === "with_code") {
                          updateTemplate("registration_with_code" as TemplateKey, field, value);
                        } else {
                          updateTemplate(tab.key, field, value);
                        }
                      }}
                      onChangeWithout={tab.key === "matches" ? updateMatchesWithout : undefined}
                      onChangeExtraField={tab.key === "matches" ? updateMatchesExtraField : undefined}
                    />
                  )}
                </div>

                {/* Preview */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium text-sm">Vista Previa</span>
                  </div>
                  <EmailPreview
                    template={tab.key === "registration_confirmation" && registrationVariant === "with_code" ? templates.registration_with_code : tab.key === "no_show" ? ({ subject: templates.no_show.subject, greeting: templates.no_show.greeting, intro: "", closing: templates.no_show.closing, signature: templates.no_show.signature } as StructuredTemplate) : templates[tab.key] as StructuredTemplate}
                    templateKey={tab.key === "registration_confirmation" && registrationVariant === "with_code" ? "registration_with_code" : tab.key}
                    primaryColor={templates.primaryColor}
                    logoUrl={templates.logoUrl}
                    logoHeight={templates.logoHeight}
                    brandName={templates.brandName}
                    headerTitle={templates.headerTitle}
                    eventName={eventName}
                    matchesVariant={tab.key === "matches" ? matchesVariant : tab.key === "no_show" ? "without" : undefined}
                    matchesWithoutTemplate={tab.key === "matches" ? templates.matches_without : tab.key === "no_show" ? templates.no_show : undefined}
                    reminderOptions={tab.key === "reminder" ? templates.reminderOptions : undefined}
                  />
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        <div className="flex justify-end mt-6">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Guardar comunicaciones
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CommunicationSettingsEditor;
