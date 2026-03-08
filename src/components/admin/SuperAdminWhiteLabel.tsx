import { useState, useEffect } from "react";
import { Palette, Check, X, Building2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface OrganizerWithBranding {
  id: string;
  company_name: string | null;
  contact_email: string;
  status: string;
  logo_url: string | null;
  branding: {
    is_white_label: boolean;
    primary_color: string | null;
    secondary_color: string | null;
  } | null;
}

export function SuperAdminWhiteLabel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [organizers, setOrganizers] = useState<OrganizerWithBranding[]>([]);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load organizers
      const { data: orgs } = await supabase
        .from("organizers")
        .select("id, company_name, contact_email, status, logo_url")
        .order("company_name");

      // Load branding records
      const { data: brandingData } = await supabase
        .from("organizer_branding")
        .select("organizer_id, is_white_label, primary_color, secondary_color");

      const brandingMap = new Map(brandingData?.map(b => [b.organizer_id, b]) || []);

      setOrganizers(
        (orgs || []).map(org => ({
          ...org,
          branding: brandingMap.get(org.id) ? {
            is_white_label: brandingMap.get(org.id)!.is_white_label,
            primary_color: brandingMap.get(org.id)!.primary_color,
            secondary_color: brandingMap.get(org.id)!.secondary_color,
          } : null,
        }))
      );
    } catch (err) {
      console.error("Error loading white label data:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleWhiteLabel = async (organizerId: string, enable: boolean) => {
    setTogglingId(organizerId);
    try {
      if (enable) {
        // Upsert branding record
        const { error } = await supabase
          .from("organizer_branding")
          .upsert({
            organizer_id: organizerId,
            is_white_label: true,
          }, { onConflict: "organizer_id" });

        if (error) throw error;

        // Also enable custom_branding feature
        await supabase
          .from("organizer_features")
          .upsert({
            organizer_id: organizerId,
            feature_code: "custom_branding",
            is_enabled: true,
          }, { onConflict: "organizer_id,feature_code" });
      } else {
        // Disable white label
        const { error } = await supabase
          .from("organizer_branding")
          .update({ is_white_label: false })
          .eq("organizer_id", organizerId);

        if (error) throw error;
      }

      toast({
        title: enable ? "Marca blanca activada" : "Marca blanca desactivada",
        description: `La marca blanca ha sido ${enable ? "activada" : "desactivada"} para este organizador.`,
      });

      await loadData();
    } catch (err) {
      console.error("Error toggling white label:", err);
      toast({ title: "Error", description: "No se pudo actualizar.", variant: "destructive" });
    } finally {
      setTogglingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const whitelabelCount = organizers.filter(o => o.branding?.is_white_label).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Gestión de Marca Blanca
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Activa o desactiva la personalización de marca para cada organizador
          </p>
        </div>
        <Badge variant="outline">{whitelabelCount} activos</Badge>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organizador</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Logo</TableHead>
              <TableHead>Colores</TableHead>
              <TableHead className="text-center">Marca Blanca</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {organizers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No hay organizadores registrados
                </TableCell>
              </TableRow>
            ) : (
              organizers.map((org) => {
                const isEnabled = org.branding?.is_white_label || false;
                const isToggling = togglingId === org.id;

                return (
                  <TableRow key={org.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {org.company_name || "Sin nombre"}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{org.contact_email}</TableCell>
                    <TableCell>
                      <Badge variant={org.status === "active" ? "default" : "secondary"} className="text-xs">
                        {org.status === "active" ? "Activo" : org.status === "pending" ? "Pendiente" : org.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {org.logo_url ? (
                        <img src={org.logo_url} alt="" className="h-6 w-auto max-w-[80px] object-contain" />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {org.branding?.primary_color ? (
                        <div className="flex gap-1">
                          <div
                            className="w-5 h-5 rounded-full border"
                            style={{ backgroundColor: org.branding.primary_color }}
                            title={`Primario: ${org.branding.primary_color}`}
                          />
                          {org.branding.secondary_color && (
                            <div
                              className="w-5 h-5 rounded-full border"
                              style={{ backgroundColor: org.branding.secondary_color }}
                              title={`Secundario: ${org.branding.secondary_color}`}
                            />
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {isToggling ? (
                        <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                      ) : (
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={(checked) => toggleWhiteLabel(org.id, checked)}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
