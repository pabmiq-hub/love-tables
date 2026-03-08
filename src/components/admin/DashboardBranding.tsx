import { useState, useEffect } from "react";
import { Palette, Eye, Type, MessageSquare, Save, Loader2, Link as LinkIcon, Copy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useOrganizer } from "@/hooks/useOrganizer";
import { supabase } from "@/integrations/supabase/client";

const FONT_OPTIONS = [
  { value: "Outfit", label: "Outfit" },
  { value: "Inter", label: "Inter" },
  { value: "Poppins", label: "Poppins" },
  { value: "Montserrat", label: "Montserrat" },
  { value: "Plus Jakarta Sans", label: "Plus Jakarta Sans" },
  { value: "DM Sans", label: "DM Sans" },
];

interface BrandingConfig {
  primary_color: string;
  secondary_color: string;
  background_color: string;
  font_family: string;
  custom_welcome_text: string;
  custom_footer_text: string;
  hide_konektum_branding: boolean;
}

export function DashboardBranding() {
  const { organizer, branding } = useOrganizer();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<BrandingConfig>({
    primary_color: "#8B5CF6",
    secondary_color: "#EC4899",
    background_color: "#FFFFFF",
    font_family: "Outfit",
    custom_welcome_text: "",
    custom_footer_text: "",
    hide_konektum_branding: false,
  });

  useEffect(() => {
    if (!organizer) return;
    loadBranding();
  }, [organizer]);

  const loadBranding = async () => {
    if (!organizer) return;
    try {
      const { data } = await supabase
        .from("organizer_branding")
        .select("*")
        .eq("organizer_id", organizer.id)
        .maybeSingle();

      if (data) {
        setConfig({
          primary_color: data.primary_color || "#8B5CF6",
          secondary_color: data.secondary_color || "#EC4899",
          background_color: data.background_color || "#FFFFFF",
          font_family: data.font_family || "Outfit",
          custom_welcome_text: data.custom_welcome_text || "",
          custom_footer_text: data.custom_footer_text || "",
          hide_konektum_branding: data.hide_konektum_branding || false,
        });
      }
    } catch (err) {
      console.error("Error loading branding:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!organizer) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("organizer_branding")
        .update({
          primary_color: config.primary_color,
          secondary_color: config.secondary_color,
          background_color: config.background_color,
          font_family: config.font_family,
          custom_welcome_text: config.custom_welcome_text || null,
          custom_footer_text: config.custom_footer_text || null,
          hide_konektum_branding: config.hide_konektum_branding,
        })
        .eq("organizer_id", organizer.id);

      if (error) throw error;
      toast({ title: "Branding guardado", description: "Tu configuración de marca se ha actualizado." });
    } catch (err) {
      console.error("Error saving branding:", err);
      toast({ title: "Error", description: "No se pudo guardar la configuración.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!branding.isWhiteLabel) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold mb-1">Marca blanca</h1>
          <p className="text-muted-foreground">Personaliza la experiencia con tu marca</p>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Palette className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-display text-xl font-semibold mb-2">Marca blanca no activada</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              La marca blanca debe ser activada por el administrador de la plataforma. Contacta con soporte para solicitar esta funcionalidad.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold mb-1">Marca blanca</h1>
          <p className="text-muted-foreground">Personaliza la experiencia de tus participantes</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Guardar cambios
        </Button>
      </div>

      {/* Slug URL info */}
      {organizer?.slug && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <LinkIcon className="h-5 w-5" />
              URL personalizada
            </CardTitle>
            <CardDescription>Los participantes accederán a tus eventos desde esta URL única</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 bg-muted rounded-lg p-3">
              <code className="text-sm flex-1 font-mono">
                {window.location.origin}/o/{organizer.slug}/join/[evento-id]
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/o/${organizer.slug}`);
                  toast({ title: "Copiado", description: "URL base copiada al portapapeles" });
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Slug: <strong>{organizer.slug}</strong> — se genera automáticamente desde el nombre de tu empresa.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration */}
        <div className="space-y-6">
          {/* Colors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Palette className="h-5 w-5" />
                Colores
              </CardTitle>
              <CardDescription>Define los colores de tu marca</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primary">Color primario</Label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      id="primary"
                      value={config.primary_color}
                      onChange={(e) => setConfig(c => ({ ...c, primary_color: e.target.value }))}
                      className="w-10 h-10 rounded cursor-pointer border-0"
                    />
                    <Input
                      value={config.primary_color}
                      onChange={(e) => setConfig(c => ({ ...c, primary_color: e.target.value }))}
                      className="flex-1 text-xs font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondary">Color secundario</Label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      id="secondary"
                      value={config.secondary_color}
                      onChange={(e) => setConfig(c => ({ ...c, secondary_color: e.target.value }))}
                      className="w-10 h-10 rounded cursor-pointer border-0"
                    />
                    <Input
                      value={config.secondary_color}
                      onChange={(e) => setConfig(c => ({ ...c, secondary_color: e.target.value }))}
                      className="flex-1 text-xs font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bg">Color fondo</Label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      id="bg"
                      value={config.background_color}
                      onChange={(e) => setConfig(c => ({ ...c, background_color: e.target.value }))}
                      className="w-10 h-10 rounded cursor-pointer border-0"
                    />
                    <Input
                      value={config.background_color}
                      onChange={(e) => setConfig(c => ({ ...c, background_color: e.target.value }))}
                      className="flex-1 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Typography */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Type className="h-5 w-5" />
                Tipografía
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={config.font_family} onValueChange={(v) => setConfig(c => ({ ...c, font_family: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      <span style={{ fontFamily: f.value }}>{f.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Custom Texts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageSquare className="h-5 w-5" />
                Textos personalizados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Mensaje de bienvenida</Label>
                <Textarea
                  placeholder="Ej: ¡Bienvenido a nuestro evento de networking!"
                  value={config.custom_welcome_text}
                  onChange={(e) => setConfig(c => ({ ...c, custom_welcome_text: e.target.value }))}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Texto del pie de página</Label>
                <Input
                  placeholder="Ej: © 2026 Tu Empresa"
                  value={config.custom_footer_text}
                  onChange={(e) => setConfig(c => ({ ...c, custom_footer_text: e.target.value }))}
                />
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <Label>Ocultar marca Konektum</Label>
                  <p className="text-xs text-muted-foreground">Elimina "Powered by Konektum" de las páginas</p>
                </div>
                <Switch
                  checked={config.hide_konektum_branding}
                  onCheckedChange={(v) => setConfig(c => ({ ...c, hide_konektum_branding: v }))}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Preview */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Eye className="h-5 w-5" />
                Preview en vivo
              </CardTitle>
              <CardDescription>Así verán tus participantes la experiencia</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className="rounded-lg border overflow-hidden"
                style={{ backgroundColor: config.background_color, fontFamily: config.font_family }}
              >
                {/* Fake header */}
                <div className="px-4 py-3 border-b flex items-center justify-center" style={{ backgroundColor: config.primary_color + "10" }}>
                  {branding.logoUrl ? (
                    <img src={branding.logoUrl} alt="Logo" className="h-8 w-auto max-w-[140px] object-contain" />
                  ) : (
                    <span className="font-semibold" style={{ color: config.primary_color }}>
                      {branding.companyName || "Tu Empresa"}
                    </span>
                  )}
                </div>

                {/* Fake content */}
                <div className="p-6 space-y-4">
                  {config.custom_welcome_text && (
                    <p className="text-sm text-center" style={{ color: config.primary_color }}>
                      {config.custom_welcome_text}
                    </p>
                  )}
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-semibold" style={{ color: "#1a1a1a" }}>
                      Evento de ejemplo
                    </h3>
                    <p className="text-sm" style={{ color: "#666" }}>
                      Introduce tus datos para participar
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="h-9 rounded-md border bg-white/80" />
                    <div className="h-9 rounded-md border bg-white/80" />
                    <button
                      className="w-full h-9 rounded-md text-sm font-medium text-white"
                      style={{ backgroundColor: config.primary_color }}
                    >
                      Registrarme
                    </button>
                  </div>
                </div>

                {/* Fake footer */}
                <div className="px-4 py-2 border-t text-center">
                  {config.custom_footer_text ? (
                    <span className="text-xs" style={{ color: "#999" }}>{config.custom_footer_text}</span>
                  ) : !config.hide_konektum_branding ? (
                    <span className="text-xs" style={{ color: "#999" }}>Powered by Konektum</span>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">
                💡 <strong>Consejo:</strong> Sube tu logo desde la sección "Mi cuenta" para que aparezca en todas las páginas de tus participantes.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
