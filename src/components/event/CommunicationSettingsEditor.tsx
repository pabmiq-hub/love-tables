import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Loader2, Save, Mail, UserCheck, Bell, Heart, RotateCcw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CommunicationTemplate {
  subject: string;
  body: string;
}

interface CommunicationTemplates {
  registration_confirmation: CommunicationTemplate;
  reminder: CommunicationTemplate;
  matches: CommunicationTemplate;
  checkin_code: CommunicationTemplate;
}

const DEFAULT_TEMPLATES_ES: CommunicationTemplates = {
  registration_confirmation: {
    subject: "¡Confirmación de inscripción a {{evento}}!",
    body: "<p>¡Hola <strong>{{nombre}}</strong>! 🎉</p><p>Tu inscripción al evento <strong>{{evento}}</strong> ha sido confirmada con éxito.</p><p>📅 <strong>Fecha:</strong> {{fecha}}</p><p>📍 <strong>Lugar:</strong> {{ubicacion}}</p><p>🕐 <strong>Hora:</strong> {{hora}}</p><p>Te enviaremos un código de acceso antes del evento. ¡Nos vemos pronto!</p>",
  },
  reminder: {
    subject: "Recordatorio: {{evento}} es pronto",
    body: "<p>¡Hola <strong>{{nombre}}</strong>! 👋</p><p>Te recordamos que el evento <strong>{{evento}}</strong> está a la vuelta de la esquina.</p><p>📅 <strong>Fecha:</strong> {{fecha}}</p><p>📍 <strong>Lugar:</strong> {{ubicacion}}</p><p>🕐 <strong>Hora:</strong> {{hora}}</p><p>No olvides llegar puntual para hacer tu check-in. ¡Te esperamos!</p>",
  },
  matches: {
    subject: "¡Tus resultados de {{evento}}! 🎉",
    body: "<p>¡Hola <strong>{{nombre}}</strong>! 🎉</p><p>¡Gracias por participar en <strong>{{evento}}</strong>! Aquí tienes tus resultados.</p><p>Los matches aparecerán automáticamente en el email según las selecciones mutuas.</p><p>¡No dudes en contactarles! Los mejores momentos empiezan con una simple conversación. 💕</p>",
  },
  checkin_code: {
    subject: "Tu código de acceso para {{evento}}",
    body: "<p>¡Hola <strong>{{nombre}}</strong>!</p><p>Tu código de acceso para el evento <strong>{{evento}}</strong> es:</p><p style=\"text-align:center;font-size:24px;font-weight:bold;letter-spacing:4px;\">{{codigo}}</p><p>Presenta este código al llegar al evento para hacer tu check-in.</p>",
  },
};

const DEFAULT_TEMPLATES_EN: CommunicationTemplates = {
  registration_confirmation: {
    subject: "Registration confirmed for {{evento}}!",
    body: "<p>Hi <strong>{{nombre}}</strong>! 🎉</p><p>Your registration for <strong>{{evento}}</strong> has been confirmed.</p><p>📅 <strong>Date:</strong> {{fecha}}</p><p>📍 <strong>Location:</strong> {{ubicacion}}</p><p>🕐 <strong>Time:</strong> {{hora}}</p><p>We'll send you an access code before the event. See you there!</p>",
  },
  reminder: {
    subject: "Reminder: {{evento}} is coming up",
    body: "<p>Hi <strong>{{nombre}}</strong>! 👋</p><p>Just a reminder that <strong>{{evento}}</strong> is coming up soon.</p><p>📅 <strong>Date:</strong> {{fecha}}</p><p>📍 <strong>Location:</strong> {{ubicacion}}</p><p>🕐 <strong>Time:</strong> {{hora}}</p><p>Don't forget to arrive on time for check-in. See you there!</p>",
  },
  matches: {
    subject: "Your results from {{evento}}! 🎉",
    body: "<p>Hi <strong>{{nombre}}</strong>! 🎉</p><p>Thank you for attending <strong>{{evento}}</strong>! Here are your results.</p><p>Your matches will appear automatically based on mutual selections.</p><p>Don't hesitate to reach out! Great moments start with a simple conversation. 💕</p>",
  },
  checkin_code: {
    subject: "Your access code for {{evento}}",
    body: "<p>Hi <strong>{{nombre}}</strong>!</p><p>Your access code for <strong>{{evento}}</strong> is:</p><p style=\"text-align:center;font-size:24px;font-weight:bold;letter-spacing:4px;\">{{codigo}}</p><p>Show this code at the event to check in.</p>",
  },
};

const TABS_CONFIG = [
  { key: "registration_confirmation" as const, label: "Confirmación", icon: Mail, description: "Email al inscribirse" },
  { key: "reminder" as const, label: "Recordatorio", icon: Bell, description: "Email pre-evento" },
  { key: "matches" as const, label: "Resultados", icon: Heart, description: "Email de matches" },
  { key: "checkin_code" as const, label: "Check-in", icon: UserCheck, description: "Código de acceso" },
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
  const [templates, setTemplates] = useState<CommunicationTemplates>(defaults);

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
      if (stored.communication_templates) {
        setTemplates({
          ...defaults,
          ...stored.communication_templates,
        });
      }
    }
    setIsLoading(false);
  };

  const updateTemplate = (key: keyof CommunicationTemplates, field: "subject" | "body", value: string) => {
    setTemplates(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  const handleReset = (key: keyof CommunicationTemplates) => {
    setTemplates(prev => ({
      ...prev,
      [key]: defaults[key],
    }));
    toast({ title: "Plantilla restaurada", description: "Se han restaurado los valores por defecto" });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Load current email_template to merge
      const { data: current } = await supabase
        .from("events")
        .select("email_template")
        .eq("id", eventId)
        .single();

      const existingTemplate = (current?.email_template as any) || {};
      const updatedTemplate = {
        ...existingTemplate,
        communication_templates: templates,
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
        <CardTitle>Ajustes de comunicación</CardTitle>
        <CardDescription>
          Personaliza los mensajes que reciben los participantes en cada paso del evento. Usa variables como <code className="bg-muted px-1 rounded text-xs">{"{{nombre}}"}</code>, <code className="bg-muted px-1 rounded text-xs">{"{{evento}}"}</code>, <code className="bg-muted px-1 rounded text-xs">{"{{fecha}}"}</code>, <code className="bg-muted px-1 rounded text-xs">{"{{ubicacion}}"}</code>, <code className="bg-muted px-1 rounded text-xs">{"{{hora}}"}</code>.
        </CardDescription>
      </CardHeader>
      <CardContent>
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
            <TabsContent key={tab.key} value={tab.key} className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-sm">{tab.label}</h4>
                  <p className="text-xs text-muted-foreground">{tab.description}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleReset(tab.key)}>
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  Restaurar
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Asunto del email</Label>
                <Input
                  value={templates[tab.key].subject}
                  onChange={(e) => updateTemplate(tab.key, "subject", e.target.value)}
                  placeholder="Asunto..."
                />
              </div>

              <div className="space-y-2">
                <Label>Contenido del email</Label>
                <RichTextEditor
                  value={templates[tab.key].body}
                  onChange={(val) => updateTemplate(tab.key, "body", val)}
                  placeholder="Escribe el contenido del email..."
                  minHeight="200px"
                />
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
