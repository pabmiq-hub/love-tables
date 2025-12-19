import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Eye, RotateCcw, Mail, Heart, Users } from "lucide-react";

export interface EmailTemplate {
  withMatches: {
    subject: string;
    greeting: string;
    intro: string;
    friendshipTitle: string;
    datingTitle: string;
    closing: string;
    signature: string;
  };
  withoutMatches: {
    subject: string;
    greeting: string;
    message: string;
    closing: string;
    signature: string;
  };
  primaryColor: string;
}

const DEFAULT_TEMPLATE: EmailTemplate = {
  withMatches: {
    subject: "¡Tienes matches en {{evento}}! 🎉",
    greeting: "¡Hola {{nombre}}! 🎉",
    intro: "¡Gracias por participar en nuestro evento de speed dating! Tenemos buenas noticias: ¡has hecho match con otros participantes!",
    friendshipTitle: "🤝 Tus matches de amistad:",
    datingTitle: "❤️ Tus matches de ligue:",
    closing: "¡No dudes en contactarles! Los mejores momentos empiezan con una simple conversación.",
    signature: "Con cariño,\nEl equipo de SpeedMatch 💕",
  },
  withoutMatches: {
    subject: "Gracias por participar en {{evento}}",
    greeting: "¡Hola {{nombre}}! 👋",
    message: "¡Gracias por participar en nuestro evento de speed dating!\n\nAunque en esta ocasión no hubo matches mutuos, ¡no te desanimes! Las conexiones a veces tardan en llegar, y estamos seguros de que en el próximo evento tendrás más suerte.\n\nRecuerda que cada evento es una oportunidad para conocer gente increíble. ¡Esperamos verte muy pronto!",
    closing: "¡Nos vemos en el próximo evento!",
    signature: "Con cariño,\nEl equipo de SpeedMatch 💕",
  },
  primaryColor: "#e11d48",
};

interface EmailTemplateEditorProps {
  template: EmailTemplate | null;
  eventName: string;
  onSave: (template: EmailTemplate) => void;
  onClose: () => void;
}

const EmailTemplateEditor = ({ template, eventName, onSave, onClose }: EmailTemplateEditorProps) => {
  const [currentTemplate, setCurrentTemplate] = useState<EmailTemplate>(template || DEFAULT_TEMPLATE);
  const [previewTab, setPreviewTab] = useState<"with" | "without">("with");

  useEffect(() => {
    if (template) {
      setCurrentTemplate(template);
    }
  }, [template]);

  const handleReset = () => {
    setCurrentTemplate(DEFAULT_TEMPLATE);
  };

  const handleSave = () => {
    onSave(currentTemplate);
    onClose();
  };

  const replaceVariables = (text: string, hasMatches: boolean = true) => {
    return text
      .replace(/\{\{nombre\}\}/g, "María García")
      .replace(/\{\{evento\}\}/g, eventName || "Speed Dating");
  };

  const renderPreviewWithMatches = () => {
    const t = currentTemplate.withMatches;
    return (
      <div className="bg-background rounded-lg p-6 border space-y-4">
        <div className="text-center pb-4 border-b">
          <Heart className="w-8 h-8 mx-auto mb-2" style={{ color: currentTemplate.primaryColor }} />
          <h2 className="font-bold text-lg">SpeedMatch</h2>
        </div>
        <h1 className="text-xl font-bold">{replaceVariables(t.greeting)}</h1>
        <p className="text-muted-foreground">{replaceVariables(t.intro)}</p>
        
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <h3 className="font-semibold">{t.friendshipTitle}</h3>
          <ul className="list-disc list-inside text-sm text-muted-foreground">
            <li>Carlos López - 📞 +34 612 345 678</li>
            <li>Ana Martínez - 📞 +34 698 765 432</li>
          </ul>
        </div>
        
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <h3 className="font-semibold">{t.datingTitle}</h3>
          <ul className="list-disc list-inside text-sm text-muted-foreground">
            <li>Pablo Ruiz - 📞 +34 654 321 987</li>
          </ul>
        </div>
        
        <p className="text-muted-foreground">{replaceVariables(t.closing)}</p>
        <p className="text-sm text-muted-foreground whitespace-pre-line">{t.signature}</p>
      </div>
    );
  };

  const renderPreviewWithoutMatches = () => {
    const t = currentTemplate.withoutMatches;
    return (
      <div className="bg-background rounded-lg p-6 border space-y-4">
        <div className="text-center pb-4 border-b">
          <Heart className="w-8 h-8 mx-auto mb-2" style={{ color: currentTemplate.primaryColor }} />
          <h2 className="font-bold text-lg">SpeedMatch</h2>
        </div>
        <h1 className="text-xl font-bold">{replaceVariables(t.greeting, false)}</h1>
        <p className="text-muted-foreground whitespace-pre-line">{replaceVariables(t.message, false)}</p>
        <p className="text-muted-foreground">{replaceVariables(t.closing, false)}</p>
        <p className="text-sm text-muted-foreground whitespace-pre-line">{t.signature}</p>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-scale-in">
        <CardHeader className="relative border-b">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>Personalizar Plantilla de Email</CardTitle>
              <CardDescription>Variables disponibles: {"{{nombre}}"}, {"{{evento}}"}</CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Editor */}
            <div className="space-y-6">
              <Tabs defaultValue="with" className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="with" className="flex-1">
                    <Heart className="w-4 h-4 mr-2" />
                    Con Matches
                  </TabsTrigger>
                  <TabsTrigger value="without" className="flex-1">
                    <Users className="w-4 h-4 mr-2" />
                    Sin Matches
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="with" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Asunto</Label>
                    <Input
                      value={currentTemplate.withMatches.subject}
                      onChange={(e) => setCurrentTemplate({
                        ...currentTemplate,
                        withMatches: { ...currentTemplate.withMatches, subject: e.target.value }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Saludo</Label>
                    <Input
                      value={currentTemplate.withMatches.greeting}
                      onChange={(e) => setCurrentTemplate({
                        ...currentTemplate,
                        withMatches: { ...currentTemplate.withMatches, greeting: e.target.value }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Introducción</Label>
                    <Textarea
                      value={currentTemplate.withMatches.intro}
                      onChange={(e) => setCurrentTemplate({
                        ...currentTemplate,
                        withMatches: { ...currentTemplate.withMatches, intro: e.target.value }
                      })}
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Título Amistad</Label>
                      <Input
                        value={currentTemplate.withMatches.friendshipTitle}
                        onChange={(e) => setCurrentTemplate({
                          ...currentTemplate,
                          withMatches: { ...currentTemplate.withMatches, friendshipTitle: e.target.value }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Título Ligue</Label>
                      <Input
                        value={currentTemplate.withMatches.datingTitle}
                        onChange={(e) => setCurrentTemplate({
                          ...currentTemplate,
                          withMatches: { ...currentTemplate.withMatches, datingTitle: e.target.value }
                        })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Cierre</Label>
                    <Textarea
                      value={currentTemplate.withMatches.closing}
                      onChange={(e) => setCurrentTemplate({
                        ...currentTemplate,
                        withMatches: { ...currentTemplate.withMatches, closing: e.target.value }
                      })}
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Firma</Label>
                    <Textarea
                      value={currentTemplate.withMatches.signature}
                      onChange={(e) => setCurrentTemplate({
                        ...currentTemplate,
                        withMatches: { ...currentTemplate.withMatches, signature: e.target.value }
                      })}
                      rows={2}
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="without" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Asunto</Label>
                    <Input
                      value={currentTemplate.withoutMatches.subject}
                      onChange={(e) => setCurrentTemplate({
                        ...currentTemplate,
                        withoutMatches: { ...currentTemplate.withoutMatches, subject: e.target.value }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Saludo</Label>
                    <Input
                      value={currentTemplate.withoutMatches.greeting}
                      onChange={(e) => setCurrentTemplate({
                        ...currentTemplate,
                        withoutMatches: { ...currentTemplate.withoutMatches, greeting: e.target.value }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Mensaje</Label>
                    <Textarea
                      value={currentTemplate.withoutMatches.message}
                      onChange={(e) => setCurrentTemplate({
                        ...currentTemplate,
                        withoutMatches: { ...currentTemplate.withoutMatches, message: e.target.value }
                      })}
                      rows={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cierre</Label>
                    <Input
                      value={currentTemplate.withoutMatches.closing}
                      onChange={(e) => setCurrentTemplate({
                        ...currentTemplate,
                        withoutMatches: { ...currentTemplate.withoutMatches, closing: e.target.value }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Firma</Label>
                    <Textarea
                      value={currentTemplate.withoutMatches.signature}
                      onChange={(e) => setCurrentTemplate({
                        ...currentTemplate,
                        withoutMatches: { ...currentTemplate.withoutMatches, signature: e.target.value }
                      })}
                      rows={2}
                    />
                  </div>
                </TabsContent>
              </Tabs>
              
              <div className="space-y-2">
                <Label>Color Principal</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={currentTemplate.primaryColor}
                    onChange={(e) => setCurrentTemplate({
                      ...currentTemplate,
                      primaryColor: e.target.value
                    })}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={currentTemplate.primaryColor}
                    onChange={(e) => setCurrentTemplate({
                      ...currentTemplate,
                      primaryColor: e.target.value
                    })}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            
            {/* Preview */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Vista Previa</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={previewTab === "with" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPreviewTab("with")}
                  >
                    Con matches
                  </Button>
                  <Button
                    variant={previewTab === "without" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPreviewTab("without")}
                  >
                    Sin matches
                  </Button>
                </div>
              </div>
              
              <div className="bg-muted/30 rounded-lg p-4 min-h-[400px]">
                {previewTab === "with" ? renderPreviewWithMatches() : renderPreviewWithoutMatches()}
              </div>
            </div>
          </div>
        </CardContent>
        
        <div className="border-t p-4 flex justify-between">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Restablecer
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button variant="hero" onClick={handleSave}>
              Guardar Plantilla
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default EmailTemplateEditor;
