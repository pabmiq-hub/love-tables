import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useOrganizer } from "@/hooks/useOrganizer";
import { useToast } from "@/hooks/use-toast";
import { Mail, Loader2, CheckCircle2, AlertCircle, Trash2, Send, Eye, EyeOff, ExternalLink } from "lucide-react";

interface ResendConfig {
  id: string;
  resend_api_key: string;
  sender_email: string;
  sender_name: string | null;
  is_verified: boolean;
}

export function EmailConnectionManager() {
  const { organizer } = useOrganizer();
  const { toast } = useToast();
  const [config, setConfig] = useState<ResendConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [senderName, setSenderName] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    if (organizer?.id) loadConfig();
  }, [organizer?.id]);

  const loadConfig = async () => {
    if (!organizer?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("organizer_resend_config" as any)
        .select("*")
        .eq("organizer_id", organizer.id)
        .maybeSingle();

      if (!error && data) {
        const d = data as any;
        setConfig(d);
        setApiKey(d.resend_api_key || "");
        setSenderEmail(d.sender_email || "");
        setSenderName(d.sender_name || "");
      } else {
        setConfig(null);
      }
    } catch {
      setConfig(null);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!apiKey.trim() || !senderEmail.trim()) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-domain", {
        body: { action: "save", resend_api_key: apiKey.trim(), sender_email: senderEmail.trim(), sender_name: senderName.trim() || null },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Configuración guardada", description: "Tu cuenta de Resend ha sido vinculada correctamente" });
      await loadConfig();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "No se pudo guardar la configuración", variant: "destructive" });
    }
    setSaving(false);
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-domain", {
        body: { action: "test" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "✅ Email de prueba enviado", description: `Se ha enviado un email de prueba a ${data.sent_to}` });
    } catch (err: any) {
      toast({ title: "Error al enviar prueba", description: err.message || "Verifica tu configuración", variant: "destructive" });
    }
    setTesting(false);
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      const { error } = await supabase.functions.invoke("manage-domain", {
        body: { action: "remove" },
      });
      if (error) throw error;
      setConfig(null);
      setApiKey("");
      setSenderEmail("");
      setSenderName("");
      toast({ title: "Configuración eliminada", description: "Los emails se enviarán desde la dirección por defecto" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setRemoving(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Mail className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Configuración de email</CardTitle>
            <CardDescription>
              Conecta tu cuenta de Resend para enviar emails desde tu propia dirección
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {config?.is_verified ? (
          <div className="space-y-4">
            {/* Active config */}
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <p className="text-sm font-medium text-green-700 dark:text-green-400">Cuenta de Resend conectada</p>
              </div>
              <div className="grid gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Remitente: </span>
                  <span className="font-medium">{config.sender_name ? `${config.sender_name} <${config.sender_email}>` : config.sender_email}</span>
                </div>
              </div>
            </div>

            {/* Edit form */}
            <div className="grid gap-3">
              <div className="space-y-1">
                <Label className="text-xs">API Key de Resend</Label>
                <div className="relative">
                  <Input
                    type={showApiKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="re_xxxxxxxx..."
                  />
                  <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowApiKey(!showApiKey)}>
                    {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email remitente</Label>
                <Input value={senderEmail} onChange={(e) => setSenderEmail(e.target.value)} placeholder="noreply@tuempresa.com" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Nombre remitente</Label>
                <Input value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder={organizer?.company_name || "Tu empresa"} />
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button size="sm" onClick={handleSave} disabled={saving || !apiKey.trim() || !senderEmail.trim()}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Guardar cambios
              </Button>
              <Button variant="outline" size="sm" onClick={handleTest} disabled={testing}>
                {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Enviar email de prueba
              </Button>
              <Button variant="outline" size="sm" onClick={handleRemove} disabled={removing} className="text-destructive hover:text-destructive">
                {removing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                Desconectar
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border">
              <AlertCircle className="w-5 h-5 text-muted-foreground shrink-0" />
              <div>
                <p className="font-medium text-sm">Sin cuenta de Resend conectada</p>
                <p className="text-sm text-muted-foreground">
                  Los emails se envían desde noreply@konektum.com
                </p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-accent/5 border border-accent/20 space-y-2">
              <p className="text-sm font-medium">¿Cómo configurarlo?</p>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Crea una cuenta gratuita en <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-1">resend.com <ExternalLink className="w-3 h-3" /></a></li>
                <li>Verifica tu dominio en el panel de Resend</li>
                <li>Genera una API Key con permisos de envío</li>
                <li>Pega la API Key y configura tu remitente aquí</li>
              </ol>
            </div>

            <div className="grid gap-3">
              <div className="space-y-1">
                <Label>API Key de Resend</Label>
                <div className="relative">
                  <Input
                    type={showApiKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="re_xxxxxxxx..."
                  />
                  <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowApiKey(!showApiKey)}>
                    {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Email remitente</Label>
                <Input value={senderEmail} onChange={(e) => setSenderEmail(e.target.value)} placeholder="noreply@tuempresa.com" />
              </div>
              <div className="space-y-1">
                <Label>Nombre remitente (opcional)</Label>
                <Input value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder={organizer?.company_name || "Tu empresa"} />
              </div>
              <Button onClick={handleSave} disabled={saving || !apiKey.trim() || !senderEmail.trim()}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                Conectar cuenta de Resend
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
