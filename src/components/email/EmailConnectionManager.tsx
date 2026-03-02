import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useOrganizer } from "@/hooks/useOrganizer";
import { useToast } from "@/hooks/use-toast";
import { Mail, Loader2, CheckCircle2, AlertCircle, Globe, Trash2, RefreshCw, Copy, Check } from "lucide-react";

interface DnsRecord {
  type: string;
  name: string;
  value: string;
  status?: string;
  ttl?: string;
  priority?: number;
}

interface VerifiedDomain {
  id: string;
  domain: string;
  resend_domain_id: string;
  status: string;
  dns_records: DnsRecord[];
  sender_email: string | null;
  sender_name: string | null;
}

export function EmailConnectionManager() {
  const { organizer } = useOrganizer();
  const { toast } = useToast();
  const [domain, setDomain] = useState<VerifiedDomain | null>(null);
  const [loading, setLoading] = useState(true);
  const [domainInput, setDomainInput] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [senderName, setSenderName] = useState("");
  const [adding, setAdding] = useState(false);
  const [checking, setChecking] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (organizer?.id) loadDomain();
  }, [organizer?.id]);

  const loadDomain = async () => {
    if (!organizer?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("organizer_verified_domains" as any)
        .select("*")
        .eq("organizer_id", organizer.id)
        .maybeSingle();

      if (!error && data) {
        setDomain(data as any);
        setSenderEmail((data as any).sender_email || "");
        setSenderName((data as any).sender_name || "");
      } else {
        setDomain(null);
      }
    } catch {
      setDomain(null);
    }
    setLoading(false);
  };

  const handleAddDomain = async () => {
    if (!domainInput.trim()) return;
    setAdding(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-domain", {
        body: { 
          action: "add", 
          domain: domainInput.trim(),
          sender_email: `noreply@${domainInput.trim()}`,
          sender_name: organizer?.company_name || null,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "Dominio registrado", description: "Configura los registros DNS que se muestran a continuación" });
      setDomainInput("");
      await loadDomain();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "No se pudo registrar el dominio", variant: "destructive" });
    }
    setAdding(false);
  };

  const handleCheckStatus = async () => {
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-domain", {
        body: { action: "check" },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const statusMsg = data.status === "verified" ? "¡Dominio verificado correctamente!" 
        : data.status === "failed" ? "La verificación ha fallado. Revisa los registros DNS."
        : "Dominio pendiente de verificación. Los cambios DNS pueden tardar hasta 48h.";

      toast({ 
        title: data.status === "verified" ? "✅ Verificado" : data.status === "failed" ? "❌ Fallido" : "⏳ Pendiente",
        description: statusMsg 
      });
      await loadDomain();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "No se pudo verificar", variant: "destructive" });
    }
    setChecking(false);
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-domain", {
        body: { action: "remove" },
      });

      if (error) throw error;
      setDomain(null);
      toast({ title: "Dominio eliminado", description: "Los emails se enviarán desde la dirección por defecto" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "No se pudo eliminar", variant: "destructive" });
    }
    setRemoving(false);
  };

  const handleUpdateSender = async () => {
    try {
      const { error } = await supabase.functions.invoke("manage-domain", {
        body: { action: "update_sender", sender_email: senderEmail, sender_name: senderName },
      });

      if (error) throw error;
      toast({ title: "Remitente actualizado" });
      await loadDomain();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
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
              Verifica tu dominio para enviar emails desde tu propia dirección profesional
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {domain ? (
          <div className="space-y-4">
            {/* Domain status */}
            <div className="flex items-center gap-3 p-4 rounded-lg bg-accent/5 border border-accent/20">
              <Globe className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-sm">Dominio</p>
                <p className="text-primary font-semibold">{domain.domain}</p>
              </div>
              <Badge 
                variant="secondary" 
                className={
                  domain.status === "verified" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                  : domain.status === "failed" ? "bg-destructive/10 text-destructive" 
                  : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                }
              >
                {domain.status === "verified" ? "Verificado" : domain.status === "failed" ? "Fallido" : "Pendiente"}
              </Badge>
            </div>

            {/* DNS Records */}
            {domain.status !== "verified" && domain.dns_records && domain.dns_records.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium">Registros DNS a configurar:</p>
                <p className="text-xs text-muted-foreground">
                  Añade estos registros en la configuración DNS de tu dominio. Los cambios pueden tardar hasta 48 horas en propagarse.
                </p>
                <div className="space-y-2">
                  {domain.dns_records.map((record: DnsRecord, idx: number) => (
                    <div key={idx} className="p-3 rounded-lg bg-muted/50 border text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">{record.type}</Badge>
                        {record.status && (
                          <span className={`text-xs ${record.status === 'verified' ? 'text-green-600' : 'text-yellow-600'}`}>
                            {record.status === 'verified' ? '✓' : '⏳'} {record.status}
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Nombre: </span>
                        <code className="bg-background px-1 rounded break-all">{record.name}</code>
                      </div>
                      <div className="flex items-start gap-1">
                        <div className="flex-1">
                          <span className="text-muted-foreground">Valor: </span>
                          <code className="bg-background px-1 rounded break-all text-[10px]">{record.value}</code>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 shrink-0" 
                          onClick={() => copyToClipboard(record.value, idx)}
                        >
                          {copiedIndex === idx ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                        </Button>
                      </div>
                      {record.priority !== undefined && (
                        <div>
                          <span className="text-muted-foreground">Prioridad: </span>
                          <code className="bg-background px-1 rounded">{record.priority}</code>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Verified: sender config */}
            {domain.status === "verified" && (
              <div className="space-y-3 p-4 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">Dominio verificado</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Los emails de resultados se enviarán desde tu dominio. Configura el remitente:
                </p>
                <div className="grid gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Email remitente</Label>
                    <Input 
                      value={senderEmail} 
                      onChange={(e) => setSenderEmail(e.target.value)} 
                      placeholder={`noreply@${domain.domain}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Nombre remitente</Label>
                    <Input 
                      value={senderName} 
                      onChange={(e) => setSenderName(e.target.value)} 
                      placeholder={organizer?.company_name || "Tu empresa"}
                    />
                  </div>
                  <Button size="sm" onClick={handleUpdateSender}>
                    Guardar remitente
                  </Button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 flex-wrap">
              {domain.status !== "verified" && (
                <Button variant="outline" size="sm" onClick={handleCheckStatus} disabled={checking}>
                  {checking ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                  Verificar estado
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleRemove} disabled={removing} className="text-destructive hover:text-destructive">
                {removing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                Eliminar dominio
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border">
              <AlertCircle className="w-5 h-5 text-muted-foreground shrink-0" />
              <div>
                <p className="font-medium text-sm">Sin dominio verificado</p>
                <p className="text-sm text-muted-foreground">
                  Los emails se envían desde noreply@konektum.com
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Verifica tu dominio para que los emails de resultados se envíen desde tu propia dirección profesional (ej: noreply@tuempresa.com). 
              Necesitarás acceso a la configuración DNS de tu dominio.
            </p>
            <div className="space-y-2">
              <Label>Tu dominio</Label>
              <div className="flex gap-2">
                <Input 
                  value={domainInput} 
                  onChange={(e) => setDomainInput(e.target.value)} 
                  placeholder="tuempresa.com" 
                />
                <Button onClick={handleAddDomain} disabled={adding || !domainInput.trim()}>
                  {adding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Globe className="w-4 h-4 mr-2" />}
                  Verificar
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
