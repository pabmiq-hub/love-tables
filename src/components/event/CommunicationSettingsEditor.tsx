import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Mail, UserCheck, Bell, Heart, RotateCcw, Eye, Upload, X, Star } from "lucide-react";
import { supabase as supabaseClient } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  CommunicationTemplates,
  TemplateKey,
  StructuredTemplate,
  MatchesWithoutTemplate,
  DEFAULT_TEMPLATES_ES,
  DEFAULT_TEMPLATES_EN,
} from "./communication/types";
import TemplateEditor from "./communication/TemplateEditor";
import EmailPreview from "./communication/EmailPreview";

const TABS_CONFIG: { key: TemplateKey; label: string; icon: typeof Mail; description: string; socialOnly?: boolean }[] = [
  { key: "registration_confirmation", label: "Confirmación", icon: Mail, description: "Email al inscribirse" },
  { key: "reminder", label: "Recordatorio", icon: Bell, description: "Email pre-evento" },
  { key: "matches", label: "Resultados", icon: Heart, description: "Email de matches" },
  { key: "checkin_code", label: "Check-in", icon: UserCheck, description: "Código de acceso" },
  { key: "super_like", label: "Super Like", icon: Star, description: "Notificación de Super Like", socialOnly: true },
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
        const merged = {
          ...defaults,
          ...stored.communication_templates_v2,
        } as CommunicationTemplates;

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

  const handleReset = (key: TemplateKey) => {
    setTemplates(prev => ({
      ...prev,
      [key]: defaults[key],
      ...(key === "matches" ? { matches_without: defaults.matches_without } : {}),
    }));
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
          headerTitle: templates.headerTitle?.trim() || defaults.headerTitle,
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

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Editor */}
                <div>
                  <TemplateEditor
                    template={templates[tab.key]}
                    templateKey={tab.key}
                    matchesVariant={tab.key === "matches" ? matchesVariant : undefined}
                    matchesWithoutTemplate={tab.key === "matches" ? templates.matches_without : undefined}
                    onChange={(field, value) => updateTemplate(tab.key, field, value)}
                    onChangeWithout={tab.key === "matches" ? updateMatchesWithout : undefined}
                    onChangeExtraField={tab.key === "matches" ? updateMatchesExtraField : undefined}
                  />
                </div>

                {/* Preview */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium text-sm">Vista Previa</span>
                  </div>
                  <EmailPreview
                    template={templates[tab.key]}
                    templateKey={tab.key}
                    primaryColor={templates.primaryColor}
                    logoUrl={templates.logoUrl}
                    logoHeight={templates.logoHeight}
                    brandName={templates.brandName}
                    headerTitle={templates.headerTitle}
                    eventName={eventName}
                    matchesVariant={tab.key === "matches" ? matchesVariant : undefined}
                    matchesWithoutTemplate={tab.key === "matches" ? templates.matches_without : undefined}
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
