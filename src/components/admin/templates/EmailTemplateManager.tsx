import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Loader2, Copy, History, Pencil, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganizer } from "@/hooks/useOrganizer";
import { useToast } from "@/hooks/use-toast";
import { VersionHistoryModal } from "./VersionHistoryModal";

const EMAIL_SUBTYPES = [
  { value: "match_results", label: "Resultados de matches" },
  { value: "registration_confirmation", label: "Confirmación de registro" },
  { value: "access_code", label: "Código de acceso" },
  { value: "reminder", label: "Recordatorio" },
];

interface Template {
  id: string;
  name: string;
  description: string | null;
  subtype: string | null;
  content: any;
  is_default: boolean;
  version: number;
  updated_at: string;
}

export function EmailTemplateManager() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Template | null>(null);
  const [historyTemplate, setHistoryTemplate] = useState<Template | null>(null);
  const { organizer } = useOrganizer();
  const { toast } = useToast();

  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSubtype, setEditSubtype] = useState("match_results");
  const [editContent, setEditContent] = useState<any>({
    subject: "",
    greeting: "",
    intro: "",
    closing: "",
    signature: "",
    primaryColor: "#e11d48",
  });

  useEffect(() => { if (organizer) loadTemplates(); }, [organizer]);

  const loadTemplates = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("organizer_templates")
      .select("*")
      .eq("organizer_id", organizer!.id)
      .eq("type", "email")
      .order("updated_at", { ascending: false });
    setTemplates((data as Template[]) || []);
    setLoading(false);
  };

  const startCreate = () => {
    setEditing({ id: "", name: "", description: null, subtype: "match_results", content: {}, is_default: false, version: 1, updated_at: "" });
    setEditName("");
    setEditDescription("");
    setEditSubtype("match_results");
    setEditContent({ subject: "", greeting: "", intro: "", closing: "", signature: "", primaryColor: "#e11d48" });
  };

  const startEdit = (t: Template) => {
    setEditing(t);
    setEditName(t.name);
    setEditDescription(t.description || "");
    setEditSubtype(t.subtype || "match_results");
    setEditContent(t.content || {});
  };

  const handleSave = async () => {
    if (!editName.trim()) { toast({ title: "Error", description: "El nombre es obligatorio", variant: "destructive" }); return; }

    if (editing?.id) {
      await supabase.from("template_versions").insert({
        template_id: editing.id,
        version: editing.version,
        content: editing.content,
        changed_by: "Edición manual",
      });

      const { error } = await supabase.from("organizer_templates").update({
        name: editName.trim(),
        description: editDescription.trim() || null,
        subtype: editSubtype,
        content: editContent,
        version: editing.version + 1,
      }).eq("id", editing.id);

      if (error) { toast({ title: "Error", description: "No se pudo guardar", variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("organizer_templates").insert({
        organizer_id: organizer!.id,
        type: "email",
        subtype: editSubtype,
        name: editName.trim(),
        description: editDescription.trim() || null,
        content: editContent,
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
      type: "email",
      subtype: t.subtype,
      name: `${t.name} (copia)`,
      description: t.description,
      content: t.content,
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
          <h3 className="text-lg font-semibold">{editing.id ? "Editar plantilla de email" : "Nueva plantilla de email"}</h3>
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
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Ej: Matches formales" />
            </div>
            <div className="space-y-2">
              <Label>Tipo de email</Label>
              <select className="flex h-11 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm" value={editSubtype} onChange={(e) => setEditSubtype(e.target.value)}>
                {EMAIL_SUBTYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Descripción</Label>
            <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Asunto</Label>
            <Input value={editContent.subject || ""} onChange={(e) => setEditContent({ ...editContent, subject: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Saludo</Label>
            <Input value={editContent.greeting || ""} onChange={(e) => setEditContent({ ...editContent, greeting: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Introducción / Mensaje</Label>
            <Textarea value={editContent.intro || ""} onChange={(e) => setEditContent({ ...editContent, intro: e.target.value })} rows={4} />
          </div>
          <div className="space-y-2">
            <Label>Cierre</Label>
            <Input value={editContent.closing || ""} onChange={(e) => setEditContent({ ...editContent, closing: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Firma</Label>
            <Textarea value={editContent.signature || ""} onChange={(e) => setEditContent({ ...editContent, signature: e.target.value })} rows={2} />
          </div>
          <div className="space-y-2">
            <Label>Color principal</Label>
            <Input type="color" value={editContent.primaryColor || "#e11d48"} onChange={(e) => setEditContent({ ...editContent, primaryColor: e.target.value })} className="w-20 h-10 p-1" />
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
        <Plus className="h-4 w-4 mr-1" /> Nueva plantilla de email
      </Button>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Mail className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>No hay plantillas de email. Crea la primera.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {templates.map((t) => (
            <Card key={t.id} className="hover:bg-muted/30 transition-colors">
              <CardContent className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">{t.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-xs">{EMAIL_SUBTYPES.find(s => s.value === t.subtype)?.label || t.subtype}</Badge>
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
      )}

      {historyTemplate && (
        <VersionHistoryModal open={!!historyTemplate} onOpenChange={() => setHistoryTemplate(null)} templateId={historyTemplate.id} templateName={historyTemplate.name} onRestore={() => {}} />
      )}
    </div>
  );
}
