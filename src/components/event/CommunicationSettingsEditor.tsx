import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Mail, UserCheck, Bell, Heart, RotateCcw, Eye } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  CommunicationTemplates,
  TemplateKey,
  StructuredTemplate,
  DEFAULT_TEMPLATES_ES,
  DEFAULT_TEMPLATES_EN,
} from "./communication/types";
import TemplateEditor from "./communication/TemplateEditor";
import EmailPreview from "./communication/EmailPreview";

const TABS_CONFIG: { key: TemplateKey; label: string; icon: typeof Mail; description: string }[] = [
  { key: "registration_confirmation", label: "Confirmación", icon: Mail, description: "Email al inscribirse" },
  { key: "reminder", label: "Recordatorio", icon: Bell, description: "Email pre-evento" },
  { key: "matches", label: "Resultados", icon: Heart, description: "Email de matches" },
  { key: "checkin_code", label: "Check-in", icon: UserCheck, description: "Código de acceso" },
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
  const defaults = language === "en" ? DEFAULT_TEMPLATES_EN : DEFAULT_TEMPLATES_ES;
  const [templates, setTemplates] = useState<CommunicationTemplates>({ ...defaults });

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
        setTemplates({
          ...defaults,
          ...stored.communication_templates_v2,
        });
      } else if (stored.communication_templates) {
        // Migration from old format - keep defaults but preserve any stored data
        setTemplates({ ...defaults });
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

  const handleReset = (key: TemplateKey) => {
    setTemplates(prev => ({
      ...prev,
      [key]: defaults[key],
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
      const updatedTemplate = {
        ...existingTemplate,
        communication_templates_v2: templates,
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 p-4 bg-muted/30 rounded-lg border">
          <div className="space-y-2">
            <Label className="text-xs font-medium">Logo URL</Label>
            <Input
              value={templates.logoUrl}
              onChange={(e) => setTemplates(prev => ({ ...prev, logoUrl: e.target.value }))}
              placeholder="https://..."
              className="text-xs"
            />
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
            {TABS_CONFIG.map(tab => (
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

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Editor */}
                <div>
                  <TemplateEditor
                    template={templates[tab.key]}
                    templateKey={tab.key}
                    onChange={(field, value) => updateTemplate(tab.key, field, value)}
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
                    brandName={templates.brandName}
                    eventName={eventName}
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
