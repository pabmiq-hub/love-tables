import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, RotateCcw, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface VersionEntry {
  id: string;
  version: number;
  content: any;
  changed_by: string | null;
  created_at: string;
}

interface VersionHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId: string;
  templateName: string;
  onRestore: (content: any) => void;
}

export function VersionHistoryModal({ open, onOpenChange, templateId, templateName, onRestore }: VersionHistoryModalProps) {
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && templateId) loadVersions();
  }, [open, templateId]);

  const loadVersions = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("template_versions")
      .select("*")
      .eq("template_id", templateId)
      .order("version", { ascending: false });
    setVersions((data as VersionEntry[]) || []);
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Historial — {templateName}
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : versions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No hay versiones anteriores.</p>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-3">
              {versions.map((v) => (
                <div key={v.id} className="flex items-center justify-between border rounded-lg p-3">
                  <div>
                    <p className="text-sm font-medium">Versión {v.version}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(v.created_at).toLocaleString("es-ES")}
                    </p>
                    {v.changed_by && <p className="text-xs text-muted-foreground">{v.changed_by}</p>}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => { onRestore(v.content); onOpenChange(false); }}>
                    <RotateCcw className="h-3 w-3 mr-1" /> Restaurar
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
