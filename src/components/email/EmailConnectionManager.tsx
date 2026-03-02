import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganizer } from "@/hooks/useOrganizer";
import { useToast } from "@/hooks/use-toast";
import { Mail, Link2, Unlink, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface EmailConnection {
  id: string;
  provider: string;
  email_address: string;
  is_active: boolean;
  created_at: string;
}

export function EmailConnectionManager() {
  const { session } = useAuth();
  const { organizer } = useOrganizer();
  const { toast } = useToast();
  const [connection, setConnection] = useState<EmailConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (organizer?.id) {
      loadConnection();
    }
  }, [organizer?.id]);

  // Check URL for OAuth callback results
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthSuccess = params.get("oauth_success");
    const oauthError = params.get("oauth_error");
    const email = params.get("email");

    if (oauthSuccess) {
      toast({
        title: "Gmail conectado",
        description: `Los emails se enviarán desde ${email || "tu cuenta de Gmail"}`,
      });
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
      loadConnection();
    } else if (oauthError) {
      toast({
        title: "Error al conectar Gmail",
        description: getErrorMessage(oauthError),
        variant: "destructive",
      });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const getErrorMessage = (error: string) => {
    switch (error) {
      case "access_denied": return "Has denegado el acceso. Inténtalo de nuevo.";
      case "expired": return "La sesión ha expirado. Inténtalo de nuevo.";
      case "token_exchange_failed": return "Error al conectar con Google. Inténtalo de nuevo.";
      default: return "Error inesperado. Inténtalo de nuevo.";
    }
  };

  const loadConnection = async () => {
    if (!organizer?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("organizer_email_connections" as any)
        .select("id, provider, email_address, is_active, created_at")
        .eq("organizer_id", organizer.id)
        .eq("provider", "gmail")
        .maybeSingle();

      if (!error && data) {
        setConnection(data as any);
      } else {
        setConnection(null);
      }
    } catch {
      setConnection(null);
    }
    setLoading(false);
  };

  const handleConnectGmail = async () => {
    if (!session?.access_token) return;
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("initiate-oauth", {
        body: { provider: "gmail" },
      });

      if (error) throw error;

      if (data?.auth_url) {
        window.location.href = data.auth_url;
      } else {
        throw new Error("No auth URL returned");
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "No se pudo iniciar la conexión con Gmail",
        variant: "destructive",
      });
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!connection?.id) return;
    try {
      const { error } = await supabase
        .from("organizer_email_connections" as any)
        .delete()
        .eq("id", connection.id);

      if (error) throw error;

      setConnection(null);
      toast({
        title: "Gmail desconectado",
        description: "Los emails se enviarán desde la dirección por defecto del sistema",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: "No se pudo desconectar",
        variant: "destructive",
      });
    }
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
              Conecta tu cuenta de Gmail para enviar emails de resultados desde tu propia dirección
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {connection?.is_active ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-accent/5 border border-accent/20">
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-sm">Conectado como</p>
                <p className="text-primary font-semibold">{connection.email_address}</p>
              </div>
              <Badge variant="secondary" className="bg-accent/10 text-accent-foreground">
                Activo
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Los emails de resultados y conexiones profesionales se enviarán desde tu cuenta de Gmail. 
              Las respuestas de los participantes llegarán directamente a tu bandeja de entrada.
            </p>
            <Button variant="outline" size="sm" onClick={handleDisconnect} className="text-destructive hover:text-destructive">
              <Unlink className="w-4 h-4 mr-2" />
              Desconectar Gmail
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border">
              <AlertCircle className="w-5 h-5 text-muted-foreground shrink-0" />
              <div>
                <p className="font-medium text-sm">No conectado</p>
                <p className="text-sm text-muted-foreground">
                  Los emails se envían desde noreply@konektum.com
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Al conectar tu Gmail, los emails de resultados se enviarán desde tu propia cuenta. 
              Los participantes podrán responder directamente a ti.
            </p>
            <Button onClick={handleConnectGmail} disabled={connecting}>
              {connecting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Link2 className="w-4 h-4 mr-2" />
              )}
              Conectar Gmail
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
