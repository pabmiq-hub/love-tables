import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Loader2, Copy, History, Pencil, Calendar } from "lucide-react";
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

  const saveFromEvent = async (eventId: string) => {
    const { data: event } = await supabase.from("events").select("*").eq("id", eventId).single();
    if (!event) return;

    const content: EventTemplateContent = {
      module: event.module || "social",
      rounds: event.rounds,
      table_size: event.table_size,
      round_duration: event.round_duration,
      rotation_mode: event.rotation_mode,
      gender_parity: event.gender_parity || false,
      avoid_previous_encounters: event.avoid_previous_encounters,
      avoid_encounters_mode: event.avoid_encounters_mode,
      professional_config: event.professional_config,
      language: event.language,
    };

    await supabase.from("organizer_templates").insert({
      organizer_id: organizer!.id,
      type: "event",
      subtype: event.module,
      name: `Plantilla de ${event.name}`,
      content: content as any,
    });
    toast({ title: "Plantilla creada desde evento" });
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
    <div className="space-y-4">
      <Button size="sm" onClick={startCreate}>
        <Plus className="h-4 w-4 mr-1" /> Nueva plantilla de evento
      </Button>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Calendar className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>No hay plantillas de evento. Crea la primera.</p>
          </CardContent>
        </Card>
      ) : (
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
      )}

      {historyTemplate && (
        <VersionHistoryModal open={!!historyTemplate} onOpenChange={() => setHistoryTemplate(null)} templateId={historyTemplate.id} templateName={historyTemplate.name} onRestore={() => {}} />
      )}
    </div>
  );
}
