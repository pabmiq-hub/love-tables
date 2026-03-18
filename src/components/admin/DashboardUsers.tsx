import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Search, Trash2, Eye, Merge, Send, Users, AlertTriangle, RefreshCw } from "lucide-react";
import { useCRM, type CRMUser, type DuplicateGroup } from "@/hooks/useCRM";
import { UserDetailModal } from "./UserDetailModal";
import { RemarketingCampaignModal } from "./RemarketingCampaignModal";

export function DashboardUsers() {
  const {
    users, loading, duplicates,
    loadUsers, deleteUser, findDuplicates, mergeUsers, getOrganizerEvents,
  } = useCRM();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [eventFilter, setEventFilter] = useState("all");
  const [events, setEvents] = useState<Array<{ id: string; name: string; date: string; status: string }>>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [showRemarketing, setShowRemarketing] = useState(false);
  const [showDuplicates, setShowDuplicates] = useState(false);

  const refresh = useCallback(() => {
    loadUsers({
      status: statusFilter,
      eventId: eventFilter !== "all" ? eventFilter : undefined,
      search: search || undefined,
    });
  }, [loadUsers, statusFilter, eventFilter, search]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    getOrganizerEvents().then(setEvents);
    findDuplicates();
  }, [getOrganizerEvents, findDuplicates]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === users.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(users.map(u => u.id)));
    }
  };

  const statusLabels: Record<string, string> = {
    active: "Activo",
    removed: "Eliminado",
    no_show: "No-show",
    waitlisted: "Lista espera",
  };

  const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    removed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    no_show: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    waitlisted: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  };

  const selectedUsers = users.filter(u => selectedIds.has(u.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Usuarios</h2>
          <p className="text-sm text-muted-foreground">Base de datos de participantes históricos</p>
        </div>
        <div className="flex gap-2">
          {duplicates.length > 0 && (
            <Button variant="outline" onClick={() => setShowDuplicates(!showDuplicates)}>
              <AlertTriangle className="w-4 h-4 mr-2 text-amber-500" />
              {duplicates.length} duplicados
            </Button>
          )}
          <Button onClick={() => setShowRemarketing(true)} disabled={selectedIds.size === 0}>
            <Send className="w-4 h-4 mr-2" />
            Enviar campaña {selectedIds.size > 0 && `(${selectedIds.size})`}
          </Button>
        </div>
      </div>

      {/* Duplicate warnings */}
      {showDuplicates && duplicates.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Posibles duplicados detectados
            </CardTitle>
            <CardDescription>Revisa y fusiona usuarios que podrían ser la misma persona</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {duplicates.map(group => (
              <DuplicateRow key={group.key} group={group} onMerge={async (primary, dup) => {
                await mergeUsers(primary, dup);
                findDuplicates();
                refresh();
              }} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, email o teléfono..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(statusLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={eventFilter} onValueChange={setEventFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Evento" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los eventos</SelectItem>
            {events.map(e => (
              <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" onClick={refresh}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-2xl font-bold">{users.length}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total usuarios</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <span className="text-2xl font-bold">{users.filter(u => u.status === 'active').length}</span>
            <p className="text-xs text-muted-foreground mt-1">Activos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <span className="text-2xl font-bold">{users.filter(u => u.events_attended > 1).length}</span>
            <p className="text-xs text-muted-foreground mt-1">Recurrentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <span className="text-2xl font-bold">{selectedIds.size}</span>
            <p className="text-xs text-muted-foreground mt-1">Seleccionados</p>
          </CardContent>
        </Card>
      </div>

      {/* Users table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={users.length > 0 && selectedIds.size === users.length}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead className="text-center">Eventos</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Cargando...</TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No se encontraron usuarios</TableCell>
                </TableRow>
              ) : (
                users.map(user => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(user.id)}
                        onCheckedChange={() => toggleSelect(user.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{user.display_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{user.email || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{user.phone || "—"}</TableCell>
                    <TableCell className="text-center">{user.events_attended}</TableCell>
                    <TableCell>
                      <Badge className={`${statusColors[user.status] || ""} text-xs`} variant="secondary">
                        {statusLabels[user.status] || user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setDetailUserId(user.id)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Se eliminará {user.display_name} de tu base de datos. Los registros en eventos se mantendrán pero se desvinculará del perfil global.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteUser(user.id)}>Eliminar</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <UserDetailModal
        open={!!detailUserId}
        onOpenChange={open => !open && setDetailUserId(null)}
        userId={detailUserId}
        onUpdated={refresh}
      />

      <RemarketingCampaignModal
        open={showRemarketing}
        onOpenChange={setShowRemarketing}
        selectedUsers={selectedUsers}
        allUsers={users}
        events={events}
      />
    </div>
  );
}

function DuplicateRow({ group, onMerge }: { group: DuplicateGroup; onMerge: (primaryId: string, dupId: string) => Promise<void> }) {
  const [merging, setMerging] = useState(false);

  const handleMerge = async (primaryIdx: number) => {
    setMerging(true);
    const primary = group.participants[primaryIdx];
    for (let i = 0; i < group.participants.length; i++) {
      if (i !== primaryIdx) {
        await onMerge(primary.id, group.participants[i].id);
      }
    }
    setMerging(false);
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
      <Badge variant="outline" className="text-xs shrink-0">
        {group.type === 'email' ? '📧' : '📱'} {group.value}
      </Badge>
      <div className="flex-1 flex flex-wrap gap-2">
        {group.participants.map((p, i) => (
          <div key={p.id} className="flex items-center gap-1">
            <span className="text-sm">{p.display_name}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              disabled={merging}
              onClick={() => handleMerge(i)}
            >
              <Merge className="w-3 h-3 mr-1" />
              Mantener
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
