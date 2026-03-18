import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Calendar, CheckCircle2, XCircle, Heart, ArrowRightLeft } from "lucide-react";
import { type CRMUserDetail, useCRM } from "@/hooks/useCRM";

interface UserDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  onUpdated: () => void;
}

export function UserDetailModal({ open, onOpenChange, userId, onUpdated }: UserDetailModalProps) {
  const { getUserDetail, updateUser } = useCRM();
  const [detail, setDetail] = useState<CRMUserDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editStatus, setEditStatus] = useState("active");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && userId) {
      setLoading(true);
      getUserDetail(userId).then(d => {
        setDetail(d);
        if (d) {
          setEditName(d.display_name);
          setEditEmail(d.email || "");
          setEditPhone(d.phone || "");
          setEditStatus(d.status);
          setEditNotes(d.source_notes || "");
        }
        setLoading(false);
      });
    }
  }, [open, userId, getUserDetail]);

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    const ok = await updateUser(userId, {
      display_name: editName,
      email: editEmail || null,
      phone: editPhone || null,
      status: editStatus,
      source_notes: editNotes || null,
    });
    setSaving(false);
    if (ok) {
      onUpdated();
      onOpenChange(false);
    }
  };

  const statusLabels: Record<string, string> = {
    active: "Activo",
    removed: "Eliminado",
    no_show: "No-show",
    waitlisted: "En lista de espera",
  };

  const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    removed: "bg-red-100 text-red-800",
    no_show: "bg-orange-100 text-orange-800",
    waitlisted: "bg-yellow-100 text-yellow-800",
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalle de usuario</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">Cargando...</div>
        ) : detail ? (
          <Tabs defaultValue="profile" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile">Perfil</TabsTrigger>
              <TabsTrigger value="history">Historial ({detail.eventHistory.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nombre</Label>
                  <Input value={editName} onChange={e => setEditName(e.target.value)} />
                </div>
                <div>
                  <Label>Estado</Label>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={editEmail} onChange={e => setEditEmail(e.target.value)} type="email" />
                </div>
                <div>
                  <Label>Teléfono</Label>
                  <Input value={editPhone} onChange={e => setEditPhone(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Notas</Label>
                <Textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Notas internas sobre este usuario..." rows={3} />
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>Eventos asistidos: {detail.events_attended}</span>
                <span className="mx-2">·</span>
                <span>Registrado: {new Date(detail.created_at).toLocaleDateString("es-ES")}</span>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Guardando..." : "Guardar cambios"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="history">
              {detail.eventHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Sin historial de eventos</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Evento</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Check-in</TableHead>
                      <TableHead className="text-center">
                        <ArrowRightLeft className="w-4 h-4 inline" />
                      </TableHead>
                      <TableHead className="text-center">
                        <Heart className="w-4 h-4 inline" />
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.eventHistory.map(eh => (
                      <TableRow key={eh.participant_id}>
                        <TableCell className="font-medium">
                          <div>{eh.event_name}</div>
                          {eh.event_module && (
                            <Badge variant="outline" className="text-xs mt-1">{eh.event_module}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{new Date(eh.event_date).toLocaleDateString("es-ES")}</TableCell>
                        <TableCell>
                          {eh.checked_in ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          {eh.selections_sent} / {eh.selections_received}
                        </TableCell>
                        <TableCell className="text-center text-sm font-medium">
                          {eh.mutual_matches}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">No se encontró el usuario</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
