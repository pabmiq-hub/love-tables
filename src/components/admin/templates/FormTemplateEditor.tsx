import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Loader2, Copy, History, Pencil, FileText, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganizer } from "@/hooks/useOrganizer";
import { useToast } from "@/hooks/use-toast";
import { VersionHistoryModal } from "./VersionHistoryModal";

interface FormTemplateContent {
  subtype: string;
  fields: {
    name: boolean;
    email: boolean;
    phone: boolean;
    entityType: boolean;
    companyName: boolean;
    sector: boolean;
    companySize: boolean;
    needs: boolean;
    solutions: boolean;
    gender: boolean;
    birthDate: boolean;
    preference: boolean;
    datingPreference: boolean;
    ageRange: boolean;
  };
  sectors: string[];
  companySizes: string[];
  predefinedNeeds: string[];
  predefinedSolutions: string[];
  customTexts?: { subtitle?: string; description?: string };
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  subtype: string | null;
  content: FormTemplateContent;
  is_default: boolean;
  version: number;
  updated_at: string;
  is_platform?: boolean;
}

const DEFAULT_B2B_CONTENT: FormTemplateContent = {
  subtype: "professional",
  fields: { name: true, email: true, phone: true, entityType: true, companyName: true, sector: true, companySize: true, needs: true, solutions: true, gender: false, birthDate: false, preference: false, datingPreference: false, ageRange: false },
  sectors: ["Tecnología", "Consultoría", "Marketing", "Finanzas", "Salud", "Educación", "Industria", "Comercio", "Servicios", "Otro"],
  companySizes: ["1-10", "11-50", "51-200", "201-500", "500+"],
  predefinedNeeds: ["Desarrollo de software", "Marketing digital", "Consultoría estratégica", "Financiación", "Talento / RRHH", "Logística", "Otro"],
  predefinedSolutions: ["Desarrollo de software", "Marketing digital", "Consultoría estratégica", "Financiación", "Talento / RRHH", "Logística", "Otro"],
};

const DEFAULT_SOCIAL_CONTENT: FormTemplateContent = {
  subtype: "social",
  fields: { name: true, email: true, phone: true, entityType: false, companyName: false, sector: false, companySize: false, needs: false, solutions: false, gender: true, birthDate: true, preference: true, datingPreference: true, ageRange: true },
  sectors: [], companySizes: [], predefinedNeeds: [], predefinedSolutions: [],
};

const PLATFORM_FORM_TEMPLATES: Template[] = [
  {
    id: "platform-b2b-standard",
    name: "B2B Networking Estándar",
    description: "Formulario profesional con datos de empresa, sector, necesidades y soluciones. Ideal para eventos de networking B2B.",
    subtype: "professional",
    content: DEFAULT_B2B_CONTENT,
    is_default: true,
    version: 1,
    updated_at: "",
    is_platform: true,
  },
  {
    id: "platform-social-standard",
    name: "Speed Dating Social",
    description: "Formulario social con género, fecha de nacimiento, preferencias y rango de edad. Para eventos de citas rápidas.",
    subtype: "social",
    content: DEFAULT_SOCIAL_CONTENT,
    is_default: true,
    version: 1,
    updated_at: "",
    is_platform: true,
  },
  {
    id: "platform-b2b-simple",
    name: "B2B Simplificado",
    description: "Formulario profesional simplificado: solo datos de contacto, empresa y sector, sin necesidades/soluciones.",
    subtype: "professional",
    content: {
      ...DEFAULT_B2B_CONTENT,
      fields: { ...DEFAULT_B2B_CONTENT.fields, needs: false, solutions: false },
      predefinedNeeds: [],
      predefinedSolutions: [],
    },
    is_default: true,
    version: 1,
    updated_at: "",
    is_platform: true,
  },
];

export function FormTemplateEditor() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Template | null>(null);
  const [historyTemplate, setHistoryTemplate] = useState<Template | null>(null);
  const { organizer } = useOrganizer();
  const { toast } = useToast();

  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editContent, setEditContent] = useState<FormTemplateContent>(DEFAULT_B2B_CONTENT);

  useEffect(() => { if (organizer) loadTemplates(); }, [organizer]);

  const loadTemplates = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("organizer_templates")
      .select("*")
      .eq("organizer_id", organizer!.id)
      .eq("type", "registration_form")
      .order("updated_at", { ascending: false });
    setTemplates((data as unknown as Template[]) || []);
    setLoading(false);
  };

  const startCreate = (subtype: string) => {
    const content = subtype === "professional" ? { ...DEFAULT_B2B_CONTENT } : { ...DEFAULT_SOCIAL_CONTENT };
    setEditing({ id: "", name: "", description: null, subtype, content, is_default: false, version: 1, updated_at: "" });
    setEditName("");
    setEditDescription("");
    setEditContent(content);
  };

  const startEdit = (t: Template) => {
    setEditing(t);
    setEditName(t.name);
    setEditDescription(t.description || "");
    setEditContent(t.content);
  };

  const handleCustomizePlatform = async (t: Template) => {
    const { error } = await supabase.from("organizer_templates").insert({
      organizer_id: organizer!.id,
      type: "registration_form",
      subtype: t.subtype,
      name: `${t.name} (personalizada)`,
      description: t.description,
      content: t.content as any,
    });
    if (error) { toast({ title: "Error", description: "No se pudo crear la copia", variant: "destructive" }); return; }
    toast({ title: "Plantilla personalizada creada", description: "Ya puedes editarla a tu gusto" });
    loadTemplates();
  };

  const handleSave = async () => {
    if (!editName.trim()) { toast({ title: "Error", description: "El nombre es obligatorio", variant: "destructive" }); return; }
    
    if (editing?.id) {
      await supabase.from("template_versions").insert({
        template_id: editing.id,
        version: editing.version,
        content: editing.content as any,
        changed_by: "Edición manual",
      });
      
      const { error } = await supabase.from("organizer_templates").update({
        name: editName.trim(),
        description: editDescription.trim() || null,
        content: editContent as any,
        version: editing.version + 1,
      }).eq("id", editing.id);
      
      if (error) { toast({ title: "Error", description: "No se pudo guardar", variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("organizer_templates").insert({
        organizer_id: organizer!.id,
        type: "registration_form",
        subtype: editContent.subtype,
        name: editName.trim(),
        description: editDescription.trim() || null,
        content: editContent as any,
      });
      if (error) { toast({ title: "Error", description: "No se pudo crear", variant: "destructive" }); return; }
    }

    toast({ title: "Guardado", description: "Plantilla guardada correctamente" });
    setEditing(null);
    loadTemplates();
  };

  const handleDuplicate = async (t: Template) => {
    await supabase.from("organizer_templates").insert({
      organizer_id: organizer!.id,
      type: "registration_form",
      subtype: t.subtype,
      name: `${t.name} (copia)`,
      description: t.description,
      content: t.content as any,
    });
    toast({ title: "Duplicada" });
    loadTemplates();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("organizer_templates").delete().eq("id", id);
    toast({ title: "Eliminada" });
    loadTemplates();
  };

  const handleRestoreVersion = (content: any) => {
    setEditContent(content);
    toast({ title: "Versión restaurada", description: "Guarda para aplicar los cambios" });
  };

  const updateArrayField = (field: "sectors" | "companySizes" | "predefinedNeeds" | "predefinedSolutions", value: string) => {
    setEditContent({ ...editContent, [field]: value.split("\n").filter(Boolean) });
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  if (editing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{editing.id ? "Editar plantilla" : "Nueva plantilla"}</h3>
          <div className="flex gap-2">
            {editing.id && (
              <Button variant="outline" size="sm" onClick={() => setHistoryTemplate(editing)}>
                <History className="h-4 w-4 mr-1" /> Historial
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button size="sm" onClick={handleSave}>Guardar</Button>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Ej: B2B Estándar" />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Badge variant="secondary">{editContent.subtype === "professional" ? "Profesional" : "Social"}</Badge>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Descripción</Label>
            <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Descripción opcional" />
          </div>

          {editContent.subtype === "professional" && (
            <>
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm">Sectores disponibles</CardTitle></CardHeader>
                <CardContent>
                  <Textarea value={editContent.sectors.join("\n")} onChange={(e) => updateArrayField("sectors", e.target.value)} rows={5} placeholder="Un sector por línea" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm">Tamaños de empresa</CardTitle></CardHeader>
                <CardContent>
                  <Textarea value={editContent.companySizes.join("\n")} onChange={(e) => updateArrayField("companySizes", e.target.value)} rows={3} placeholder="Un tamaño por línea" />
                </CardContent>
              </Card>
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-sm">Necesidades predefinidas</CardTitle></CardHeader>
                  <CardContent>
                    <Textarea value={editContent.predefinedNeeds.join("\n")} onChange={(e) => updateArrayField("predefinedNeeds", e.target.value)} rows={5} placeholder="Una necesidad por línea" />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-sm">Soluciones predefinidas</CardTitle></CardHeader>
                  <CardContent>
                    <Textarea value={editContent.predefinedSolutions.join("\n")} onChange={(e) => updateArrayField("predefinedSolutions", e.target.value)} rows={5} placeholder="Una solución por línea" />
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>

        {historyTemplate && (
          <VersionHistoryModal
            open={!!historyTemplate}
            onOpenChange={() => setHistoryTemplate(null)}
            templateId={historyTemplate.id}
            templateName={historyTemplate.name}
            onRestore={handleRestoreVersion}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Button size="sm" onClick={() => startCreate("professional")}>
          <Plus className="h-4 w-4 mr-1" /> Profesional
        </Button>
        <Button size="sm" variant="outline" onClick={() => startCreate("social")}>
          <Plus className="h-4 w-4 mr-1" /> Social
        </Button>
      </div>

      {/* Platform default templates */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold text-foreground">Plantillas de la plataforma</h4>
        </div>
        <p className="text-xs text-muted-foreground">Estas son las plantillas que la plataforma usa por defecto. Puedes personalizarlas para adaptarlas a tus eventos.</p>
        <div className="space-y-2">
          {PLATFORM_FORM_TEMPLATES.map((t) => (
            <Card key={t.id} className="border-dashed border-primary/30 bg-primary/5">
              <CardContent className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{t.name}</p>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Plataforma</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 max-w-md">{t.description}</p>
                    <Badge variant="outline" className="text-xs mt-1">{t.subtype === "professional" ? "Profesional" : "Social"}</Badge>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleCustomizePlatform(t)}>
                  <Copy className="h-3.5 w-3.5 mr-1" /> Personalizar
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* User templates */}
      {templates.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Tus plantillas</h4>
          <div className="space-y-2">
            {templates.map((t) => (
              <Card key={t.id} className="hover:bg-muted/30 transition-colors">
                <CardContent className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{t.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-xs">{t.subtype === "professional" ? "Profesional" : "Social"}</Badge>
                        <span className="text-xs text-muted-foreground">v{t.version} · {new Date(t.updated_at).toLocaleDateString("es-ES")}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDuplicate(t)}><Copy className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setHistoryTemplate(t)}><History className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {historyTemplate && (
        <VersionHistoryModal
          open={!!historyTemplate}
          onOpenChange={() => setHistoryTemplate(null)}
          templateId={historyTemplate.id}
          templateName={historyTemplate.name}
          onRestore={handleRestoreVersion}
        />
      )}
    </div>
  );
}
