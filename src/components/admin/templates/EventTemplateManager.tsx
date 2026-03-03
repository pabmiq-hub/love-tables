import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Loader2, Copy, History, Pencil, Calendar, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganizer } from "@/hooks/useOrganizer";
import { useToast } from "@/hooks/use-toast";
import { VersionHistoryModal } from "./VersionHistoryModal";

interface EventTemplateContent {
  module: string;
  rounds: number;
  table_size: number;
  round_duration: number;
  rotation_mode: string;
  gender_parity: boolean;
  avoid_previous_encounters: boolean;
  avoid_encounters_mode: string;
  professional_config?: any;
  language: string;
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  subtype: string | null;
  content: EventTemplateContent;
  is_default: boolean;
  version: number;
  updated_at: string;
  is_platform?: boolean;
}

const DEFAULT_EVENT_CONTENT: EventTemplateContent = {
  module: "social",
  rounds: 5,
  table_size: 2,
  round_duration: 300,
  rotation_mode: "fixed_host",
  gender_parity: false,
  avoid_previous_encounters: false,
  avoid_encounters_mode: "preference",
  language: "es",
};

const PLATFORM_EVENT_TEMPLATES: Template[] = [
  {
    id: "platform-event-speed-dating",
    name: "Speed Dating Clásico",
    description: "5 rondas de 5 minutos, mesas de 2 personas, rotación estándar. El formato más popular para citas rápidas.",
    subtype: "social",
    content: {
      module: "social",
      rounds: 5,
      table_size: 2,
      round_duration: 300,
      rotation_mode: "fixed_host",
      gender_parity: true,
      avoid_previous_encounters: true,
      avoid_encounters_mode: "preference",
      language: "es",
    },
    is_default: true, version: 1, updated_at: "", is_platform: true,
  },
  {
    id: "platform-event-networking-social",
    name: "Networking Social Grupal",
    description: "4 rondas de 10 minutos, mesas de 4 personas. Ideal para socializar en grupos pequeños.",
    subtype: "social",
    content: {
      module: "social",
      rounds: 4,
      table_size: 4,
      round_duration: 600,
      rotation_mode: "fixed_host",
      gender_parity: false,
      avoid_previous_encounters: true,
      avoid_encounters_mode: "strict",
      language: "es",
    },
    is_default: true, version: 1, updated_at: "", is_platform: true,
  },
  {
    id: "platform-event-b2b-standard",
    name: "B2B Networking 1:1",
    description: "6 rondas de 8 minutos, mesas de 2 personas, rotación cliente/proveedor. Formato estándar para encuentros profesionales.",
    subtype: "professional",
    content: {
      module: "professional",
      rounds: 6,
      table_size: 2,
      round_duration: 480,
      rotation_mode: "fixed_host",
      gender_parity: false,
      avoid_previous_encounters: true,
      avoid_encounters_mode: "strict",
      professional_config: {
        rotation_type: "client_fixed",
        sectors: ["Tecnología", "Consultoría", "Marketing", "Finanzas", "Salud", "Educación"],
        predefined_needs: ["Desarrollo de software", "Marketing digital", "Consultoría estratégica"],
        predefined_solutions: ["Desarrollo de software", "Marketing digital", "Consultoría estratégica"],
      },
      language: "es",
    },
    is_default: true, version: 1, updated_at: "", is_platform: true,
  },
];

export function EventTemplateManager() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Template | null>(null);
  const [historyTemplate, setHistoryTemplate] = useState<Template | null>(null);
  const { organizer } = useOrganizer();
  const { toast } = useToast();

  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editContent, setEditContent] = useState<EventTemplateContent>(DEFAULT_EVENT_CONTENT);

  useEffect(() => { if (organizer) loadTemplates(); }, [organizer]);

  const loadTemplates = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("organizer_templates")
      .select("*")
      .eq("organizer_id", organizer!.id)
      .eq("type", "event")
      .order("updated_at", { ascending: false });
    setTemplates((data as unknown as Template[]) || []);
    setLoading(false);
  };

  const startCreate = () => {
    setEditing({ id: "", name: "", description: null, subtype: null, content: { ...DEFAULT_EVENT_CONTENT }, is_default: false, version: 1, updated_at: "" });
    setEditName("");
    setEditDescription("");
    setEditContent({ ...DEFAULT_EVENT_CONTENT });
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
      type: "event",
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
        subtype: editContent.module,
        content: editContent as any,
        version: editing.version + 1,
      }).eq("id", editing.id);

      if (error) { toast({ title: "Error", description: "No se pudo guardar", variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("organizer_templates").insert({
        organizer_id: organizer!.id,
        type: "event",
        subtype: editContent.module,
        name: editName.trim(),
        description: editDescription.trim() || null,
        content: editContent as any,
      });
      if (error) { toast({ title: "Error", description: "No se pudo crear", variant: "destructive" }); return; }
    }

    toast({ title: "Guardado" });
    setEditing(null);
    loadTemplates();
  };

  const handleDuplicate = async (t: Template) => {
    await supabase.from("organizer_templates").insert({
      organizer_id: organizer!.id,
      type: "event",
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

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  if (editing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{editing.id ? "Editar plantilla de evento" : "Nueva plantilla de evento"}</h3>
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
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Ej: Networking mensual" />
            </div>
            <div className="space-y-2">
              <Label>Módulo</Label>
              <select className="flex h-11 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm" value={editContent.module} onChange={(e) => setEditContent({ ...editContent, module: e.target.value })}>
                <option value="social">Social</option>
                <option value="professional">Profesional</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Descripción</Label>
            <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Rondas</Label>
              <Input type="number" min={1} max={20} value={editContent.rounds} onChange={(e) => setEditContent({ ...editContent, rounds: parseInt(e.target.value) || 5 })} />
            </div>
            <div className="space-y-2">
              <Label>Tamaño de mesa</Label>
              <Input type="number" min={2} max={10} value={editContent.table_size} onChange={(e) => setEditContent({ ...editContent, table_size: parseInt(e.target.value) || 2 })} />
            </div>
            <div className="space-y-2">
              <Label>Duración ronda (seg)</Label>
              <Input type="number" min={60} value={editContent.round_duration} onChange={(e) => setEditContent({ ...editContent, round_duration: parseInt(e.target.value) || 300 })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Idioma</Label>
            <select className="flex h-11 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm" value={editContent.language} onChange={(e) => setEditContent({ ...editContent, language: e.target.value })}>
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>

        {historyTemplate && (
          <VersionHistoryModal open={!!historyTemplate} onOpenChange={() => setHistoryTemplate(null)} templateId={historyTemplate.id} templateName={historyTemplate.name} onRestore={(c) => { setEditContent(c); toast({ title: "Versión restaurada" }); }} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button size="sm" onClick={startCreate}>
        <Plus className="h-4 w-4 mr-1" /> Nueva plantilla de evento
      </Button>

      {/* Platform default templates */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold text-foreground">Plantillas de la plataforma</h4>
        </div>
        <p className="text-xs text-muted-foreground">Configuraciones de evento predefinidas. Personalízalas para crear eventos más rápido.</p>
        <div className="space-y-2">
          {PLATFORM_EVENT_TEMPLATES.map((t) => (
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
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{t.content.module === "professional" ? "Profesional" : "Social"}</Badge>
                      <span className="text-xs text-muted-foreground">{t.content.rounds} rondas · {Math.floor(t.content.round_duration / 60)} min · Mesa de {t.content.table_size}</span>
                    </div>
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
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{t.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-xs">{t.content.module === "professional" ? "Profesional" : "Social"}</Badge>
                        <span className="text-xs text-muted-foreground">v{t.version} · {t.content.rounds} rondas · {new Date(t.updated_at).toLocaleDateString("es-ES")}</span>
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
        <VersionHistoryModal open={!!historyTemplate} onOpenChange={() => setHistoryTemplate(null)} templateId={historyTemplate.id} templateName={historyTemplate.name} onRestore={() => {}} />
      )}
    </div>
  );
}
