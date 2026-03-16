import { useRef, useState, useEffect } from "react";
import { Upload, Loader2, Briefcase, Shield, Globe, Check, X, Pencil, Crown, ExternalLink, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { useFeatures } from "@/hooks/useFeatures";

interface DashboardSettingsProps {
  user: { id: string; email?: string } | null;
  organizer: {
    id: string;
    company_name: string | null;
    contact_email: string;
    contact_phone: string | null;
    status: string;
    logo_url: string | null;
    trial_ends_at?: string | null;
    subscription_starts_at?: string | null;
    subscription_ends_at?: string | null;
  } | null;
  plan: { id: string; name: string; display_name: string; description: string | null; max_events: number | null; max_participants_per_event: number | null; max_active_events: number | null } | null;
  limits: { maxEvents: number | null; maxParticipantsPerEvent: number | null; maxActiveEvents: number | null; currentActiveEvents: number } | null;
  branding: {
    logoUrl: string | null;
    companyName: string | null;
    isProfessionalOnly: boolean;
    isWhiteLabel: boolean;
  };
  onRefresh: () => void;
}

export function DashboardSettings({ user, organizer, plan, limits, branding, onRefresh }: DashboardSettingsProps) {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    company_name: organizer?.company_name || "",
    contact_email: organizer?.contact_email || "",
    contact_phone: organizer?.contact_phone || "",
  });
  const { toast } = useToast();
  const { language, setLanguage } = useLanguage();
  const { allFeatures, hasFeature, isSuperAdmin } = useFeatures();

  // Plan features from DB
  const [planFeatureCodes, setPlanFeatureCodes] = useState<string[]>([]);

  useEffect(() => {
    if (plan?.id) {
      supabase
        .from("plan_features")
        .select("feature_code")
        .eq("plan_id", plan.id)
        .then(({ data }) => {
          if (data) setPlanFeatureCodes(data.map((d) => d.feature_code));
        });
    }
  }, [plan?.id]);

  useEffect(() => {
    if (organizer) {
      setEditForm({
        company_name: organizer.company_name || "",
        contact_email: organizer.contact_email || "",
        contact_phone: organizer.contact_phone || "",
      });
    }
  }, [organizer]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("organizers")
        .update({
          company_name: editForm.company_name || null,
          contact_email: editForm.contact_email,
          contact_phone: editForm.contact_phone || null,
        })
        .eq("user_id", user.id);

      if (error) throw error;
      onRefresh();
      setIsEditing(false);
      toast({ title: "Datos actualizados", description: "Los datos del organizador se han guardado correctamente" });
    } catch (err) {
      console.error("Error saving profile:", err);
      toast({ title: "Error", description: "No se pudieron guardar los datos", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

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

  const statusLabel = (status: string) => {
    const map: Record<string, string> = { active: "Activo", pending: "Pendiente", suspended: "Suspendido", cancelled: "Cancelado" };
    return map[status] || status;
  };

  const formatDate = (d: string | null | undefined) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString(language === "es" ? "es-ES" : "en-US", { year: "numeric", month: "long", day: "numeric" });
  };

  // Get included features for this plan
  const includedFeatures = allFeatures.filter((f) => planFeatureCodes.includes(f.code));
  const excludedFeatures = allFeatures.filter((f) => !planFeatureCodes.includes(f.code));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold mb-1">
          {language === "es" ? "Configuración" : "Settings"}
        </h1>
        <p className="text-muted-foreground">
          {language === "es" ? "Gestiona tu perfil, idioma y suscripción" : "Manage your profile, language and subscription"}
        </p>
      </div>

      {/* ─── Profile / Organizer Data ─── */}
      <Card>
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">
              {language === "es" ? "Datos del organizador" : "Organizer details"}
            </h2>
            {!isEditing ? (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Pencil className="w-4 h-4 mr-2" />
                {language === "es" ? "Editar" : "Edit"}
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} disabled={isSaving}>
                  <X className="w-4 h-4 mr-1" />
                  {language === "es" ? "Cancelar" : "Cancel"}
                </Button>
                <Button size="sm" onClick={handleSaveProfile} disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                  {language === "es" ? "Guardar" : "Save"}
                </Button>
              </div>
            )}
          </div>

          {isEditing ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{language === "es" ? "Empresa" : "Company"}</Label>
                <Input
                  value={editForm.company_name}
                  onChange={(e) => setEditForm((p) => ({ ...p, company_name: e.target.value }))}
                  placeholder={language === "es" ? "Nombre de la empresa" : "Company name"}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{language === "es" ? "Email de contacto" : "Contact email"}</Label>
                <Input
                  type="email"
                  value={editForm.contact_email}
                  onChange={(e) => setEditForm((p) => ({ ...p, contact_email: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{language === "es" ? "Teléfono" : "Phone"}</Label>
                <Input
                  value={editForm.contact_phone}
                  onChange={(e) => setEditForm((p) => ({ ...p, contact_phone: e.target.value }))}
                  placeholder="+34 600 000 000"
                />
              </div>
              <div className="space-y-1.5">
                <Label>{language === "es" ? "Estado" : "Status"}</Label>
                <div className="flex items-center h-11">
                  <Badge variant={organizer?.status === "active" ? "default" : "secondary"}>
                    {statusLabel(organizer?.status || "")}
                  </Badge>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">{language === "es" ? "Empresa" : "Company"}</p>
                <p className="font-medium">{organizer?.company_name || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">{language === "es" ? "Email de contacto" : "Contact email"}</p>
                <p className="font-medium">{organizer?.contact_email || user?.email || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">{language === "es" ? "Teléfono" : "Phone"}</p>
                <p className="font-medium">{organizer?.contact_phone || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">{language === "es" ? "Estado" : "Status"}</p>
                <Badge variant={organizer?.status === "active" ? "default" : "secondary"}>
                  {statusLabel(organizer?.status || "")}
                </Badge>
              </div>
            </div>
          )}

          {/* Logo inline */}
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {branding.logoUrl ? (
                <img src={branding.logoUrl} alt="Logo" className="h-12 w-auto max-w-[160px] object-contain rounded" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                  <Briefcase className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
              <div>
                <p className="font-medium text-sm">
                  {branding.logoUrl
                    ? (language === "es" ? "Logo de tu empresa" : "Your company logo")
                    : (language === "es" ? "Sube tu logo" : "Upload your logo")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {language === "es"
                    ? "Se mostrará en las páginas de tus eventos y correos"
                    : "Displayed on your event pages and emails"}
                </p>
              </div>
            </div>
            <div>
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} disabled={isUploading}>
                {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                {branding.logoUrl ? (language === "es" ? "Cambiar" : "Change") : (language === "es" ? "Subir logo" : "Upload logo")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Language ─── */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="w-5 h-5 text-primary" />
            <h2 className="font-display text-lg font-semibold">
              {language === "es" ? "Idioma de la plataforma" : "Platform language"}
            </h2>
          </div>
          <div className="flex gap-3">
            <Button
              variant={language === "es" ? "default" : "outline"}
              size="sm"
              onClick={() => setLanguage("es")}
            >
              🇪🇸 Español
            </Button>
            <Button
              variant={language === "en" ? "default" : "outline"}
              size="sm"
              onClick={() => setLanguage("en")}
            >
              🇬🇧 English
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {language === "es"
              ? "Este ajuste cambia el idioma de todo el panel de administración"
              : "This setting changes the language of the entire admin dashboard"}
          </p>
        </CardContent>
      </Card>

      {/* ─── Plan ─── */}
      <Card>
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <Crown className="w-5 h-5 text-primary" />
            <h2 className="font-display text-lg font-semibold">
              {language === "es" ? "Plan actual" : "Current plan"}
            </h2>
          </div>

          {plan ? (
            <>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold">{plan.display_name}</span>
                <Badge variant="outline" className="text-xs">
                  {statusLabel(organizer?.status || "")}
                </Badge>
              </div>
              {plan.description && (
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              )}

              {/* Subscription dates */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                {organizer?.trial_ends_at && (
                  <div>
                    <p className="text-muted-foreground">{language === "es" ? "Trial hasta" : "Trial until"}</p>
                    <p className="font-medium">{formatDate(organizer.trial_ends_at)}</p>
                  </div>
                )}
                {organizer?.subscription_starts_at && (
                  <div>
                    <p className="text-muted-foreground">{language === "es" ? "Inicio suscripción" : "Subscription start"}</p>
                    <p className="font-medium">{formatDate(organizer.subscription_starts_at)}</p>
                  </div>
                )}
                {organizer?.subscription_ends_at && (
                  <div>
                    <p className="text-muted-foreground">{language === "es" ? "Vencimiento" : "Expiration"}</p>
                    <p className="font-medium">{formatDate(organizer.subscription_ends_at)}</p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Limits & usage */}
              <div>
                <h3 className="font-semibold text-sm mb-3">
                  {language === "es" ? "Límites y uso" : "Limits & usage"}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <div className="rounded-lg border p-3">
                    <p className="text-muted-foreground text-xs mb-1">
                      {language === "es" ? "Eventos activos" : "Active events"}
                    </p>
                    <p className="text-lg font-bold">
                      {limits?.currentActiveEvents ?? 0}
                      <span className="text-muted-foreground font-normal text-sm">
                        {" / "}{limits?.maxActiveEvents ?? "∞"}
                      </span>
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-muted-foreground text-xs mb-1">
                      {language === "es" ? "Participantes / evento" : "Participants / event"}
                    </p>
                    <p className="text-lg font-bold">
                      {limits?.maxParticipantsPerEvent ?? "∞"}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-muted-foreground text-xs mb-1">
                      {language === "es" ? "Eventos totales" : "Total events"}
                    </p>
                    <p className="text-lg font-bold">
                      {limits?.maxEvents ?? "∞"}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Included features */}
              <div>
                <h3 className="font-semibold text-sm mb-3">
                  {language === "es" ? "Funcionalidades incluidas" : "Included features"}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {includedFeatures.map((f) => (
                    <div key={f.code} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                      <span>{f.name}</span>
                    </div>
                  ))}
                </div>
                {excludedFeatures.length > 0 && (
                  <>
                    <h3 className="font-semibold text-sm mt-5 mb-3">
                      {language === "es" ? "No incluidas en tu plan" : "Not included in your plan"}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {excludedFeatures.map((f) => (
                        <div key={f.code} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <XCircle className="w-4 h-4 shrink-0" />
                          <span>{f.name}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <Separator />

              <Button variant="outline" onClick={() => window.open("/#pricing", "_blank")}>
                <ExternalLink className="w-4 h-4 mr-2" />
                {language === "es" ? "Cambiar de plan" : "Change plan"}
              </Button>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">
              {language === "es" ? "Sin plan asignado" : "No plan assigned"}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
