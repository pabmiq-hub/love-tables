import { useRef, useState } from "react";
import { Upload, Loader2, Briefcase, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DashboardAccountProps {
  user: { id: string; email?: string } | null;
  organizer: {
    company_name: string | null;
    contact_email: string;
    contact_phone: string | null;
    status: string;
    logo_url: string | null;
  } | null;
  plan: { display_name: string; description: string | null } | null;
  branding: {
    logoUrl: string | null;
    companyName: string | null;
    isProfessionalOnly: boolean;
    isWhiteLabel: boolean;
  };
  onRefresh: () => void;
}

export function DashboardAccount({ user, organizer, plan, branding, onRefresh }: DashboardAccountProps) {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Error", description: "Solo se permiten archivos de imagen", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Error", description: "El archivo no puede superar 2MB", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${user.id}/logo.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("organizer-logos")
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("organizer-logos").getPublicUrl(filePath);
      const logoUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("organizers")
        .update({ logo_url: logoUrl })
        .eq("user_id", user.id);
      if (updateError) throw updateError;

      onRefresh();
      toast({ title: "Logo actualizado", description: "Tu logo se ha subido correctamente" });
    } catch (err) {
      console.error("Error uploading logo:", err);
      toast({ title: "Error", description: "No se pudo subir el logo", variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold mb-1">Mi Cuenta</h1>
        <p className="text-muted-foreground">Configuración de tu perfil y suscripción</p>
      </div>

      {/* Profile info */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold">Datos del organizador</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground mb-1">Empresa</p>
              <p className="font-medium">{organizer?.company_name || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Email de contacto</p>
              <p className="font-medium">{organizer?.contact_email || user?.email || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Teléfono</p>
              <p className="font-medium">{organizer?.contact_phone || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Estado</p>
              <Badge variant={organizer?.status === "active" ? "default" : "secondary"}>
                {organizer?.status === "active" ? "Activo" : organizer?.status || "—"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="font-display text-lg font-semibold">Plan actual</h2>
          </div>
          {plan ? (
            <div>
              <p className="text-xl font-bold">{plan.display_name}</p>
              {plan.description && <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Sin plan asignado</p>
          )}
        </CardContent>
      </Card>

      {/* Logo */}
      <Card>
        <CardContent className="p-6">
          <h2 className="font-display text-lg font-semibold mb-4">Logo</h2>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {branding.logoUrl ? (
                <img src={branding.logoUrl} alt="Tu logo" className="h-12 w-auto max-w-[160px] object-contain rounded" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                  <Briefcase className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
              <div>
                <p className="font-medium text-sm">{branding.logoUrl ? "Logo de tu empresa" : "Sube tu logo"}</p>
                <p className="text-xs text-muted-foreground">
                  Se mostrará en las páginas de tus eventos y correos
                </p>
              </div>
            </div>
            <div>
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} disabled={isUploading}>
                {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                {branding.logoUrl ? "Cambiar" : "Subir logo"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
