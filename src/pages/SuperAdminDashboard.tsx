import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Calendar,
  UserCheck,
  Building2,
  MoreVertical,
  CheckCircle,
  XCircle,
  Clock,
  Ban,
  Shield,
  LogOut,
  BarChart3,
  Settings,
  Loader2,
  Sliders,
  AlertCircle,
  Mail,
  Phone,
  UserPlus,
  Trash2,
  UserX,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import konektumLogo from "@/assets/konektum-logo.png";
import { OrganizerFeaturesModal } from "@/components/admin/OrganizerFeaturesModal";
import { CreateOrganizerModal } from "@/components/admin/CreateOrganizerModal";
import { SuperAdminWhiteLabel } from "@/components/admin/SuperAdminWhiteLabel";

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signOut } = useAuth();
  const {
    isSuperAdmin,
    loading,
    organizers,
    plans,
    modules,
    metrics,
    features,
    organizerFeatures,
    planFeatures,
    authUsers,
    loadOrganizers,
    loadPlans,
    loadModules,
    loadMetrics,
    loadFeatures,
    loadPlanFeatures,
    loadOrganizerFeatures,
    loadAuthUsers,
    updateOrganizerStatus,
    updateOrganizerPlan,
    updateOrganizerModules,
    setTrialPeriod,
    updateOrganizerFeature,
    removeOrganizerFeatureOverride,
    deleteAuthUser,
    createOrganizerForUser,
    createNewOrganizer,
  } = useSuperAdmin();

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrganizer, setSelectedOrganizer] = useState<typeof organizers[0] | null>(null);
  const [featuresModalOpen, setFeaturesModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  useEffect(() => {
    if (!loading && !isSuperAdmin) {
      navigate("/super-admin/login", { replace: true });
    }
  }, [loading, isSuperAdmin, navigate]);

  useEffect(() => {
    if (isSuperAdmin) {
      loadOrganizers();
      loadPlans();
      loadModules();
      loadMetrics();
      loadFeatures();
      loadPlanFeatures();
      loadOrganizerFeatures();
      loadAuthUsers();
    }
  }, [isSuperAdmin]);

  const handleLogout = async () => {
    await signOut();
    navigate("/super-admin/login", { replace: true });
  };

  const handleStatusChange = async (organizerId: string, status: string) => {
    const success = await updateOrganizerStatus(organizerId, status);
    if (success) {
      toast({
        title: "Estado actualizado",
        description: `El organizador ha sido ${status === "active" ? "activado" : status === "suspended" ? "suspendido" : "actualizado"}.`,
      });
    } else {
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado.",
        variant: "destructive",
      });
    }
  };

  const handlePlanChange = async (organizerId: string, planId: string) => {
    const success = await updateOrganizerPlan(organizerId, planId);
    if (success) {
      toast({
        title: "Plan actualizado",
        description: "El plan del organizador ha sido actualizado.",
      });
    }
  };

  const handleSetTrial = async (organizerId: string, days: number) => {
    const success = await setTrialPeriod(organizerId, days);
    if (success) {
      toast({
        title: "Trial activado",
        description: `Se ha activado un período de prueba de ${days} días.`,
      });
    }
  };

  const handleModuleToggle = async (organizerId: string, moduleCode: string, currentModules: string[]) => {
    const newModules = currentModules.includes(moduleCode)
      ? currentModules.filter((m) => m !== moduleCode)
      : [...currentModules, moduleCode];
    
    const success = await updateOrganizerModules(organizerId, newModules);
    if (success) {
      toast({
        title: "Módulos actualizados",
        description: "Los módulos del organizador han sido actualizados.",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-500/20 text-green-700 border-green-500/30">
            <CheckCircle className="h-3 w-3 mr-1" />
            Activo
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30">
            <Clock className="h-3 w-3 mr-1" />
            Pendiente
          </Badge>
        );
      case "suspended":
        return (
          <Badge className="bg-red-500/20 text-red-700 border-red-500/30">
            <Ban className="h-3 w-3 mr-1" />
            Suspendido
          </Badge>
        );
      case "cancelled":
        return (
          <Badge className="bg-gray-500/20 text-gray-700 border-gray-500/30">
            <XCircle className="h-3 w-3 mr-1" />
            Cancelado
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredOrganizers = organizers.filter((org) =>
    statusFilter === "all" ? true : org.status === statusFilter
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={konektumLogo} alt="Konektum" className="h-8" />
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span className="font-semibold">Super Admin</span>
            </div>
          </div>
          <Button variant="ghost" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar sesión
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Organizadores
              </CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics?.totalOrganizers || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {metrics?.activeOrganizers || 0} activos,{" "}
                {metrics?.pendingOrganizers || 0} pendientes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Eventos</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics?.totalEvents || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {metrics?.activeEvents || 0} activos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Participantes
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics?.totalParticipants || 0}
              </div>
              <p className="text-xs text-muted-foreground">Total registrados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">MRR</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€0</div>
              <p className="text-xs text-muted-foreground">
                Stripe no conectado
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Pending Requests Section */}
        {organizers.filter(org => org.status === "pending").length > 0 && (
          <Card className="mb-8 border-yellow-500/30 bg-yellow-500/5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <CardTitle className="text-lg">
                    Solicitudes Pendientes ({organizers.filter(org => org.status === "pending").length})
                  </CardTitle>
                </div>
              </div>
              <CardDescription>
                Estos organizadores están esperando aprobación para acceder a la plataforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {organizers
                  .filter(org => org.status === "pending")
                  .map(org => (
                    <Card key={org.id} className="border-muted">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div>
                            <h4 className="font-semibold text-base">
                              {org.company_name || "Sin nombre de empresa"}
                            </h4>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                              <Mail className="h-3 w-3" />
                              {org.contact_email}
                            </div>
                            {org.contact_phone && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                {org.contact_phone}
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Registrado: {format(new Date(org.created_at), "dd MMM yyyy, HH:mm", { locale: es })}
                          </div>
                          <div className="flex items-center gap-2">
                            <Select
                              value={org.plan_id || "none"}
                              onValueChange={(value) => handlePlanChange(org.id, value)}
                            >
                              <SelectTrigger className="h-8 text-xs flex-1">
                                <SelectValue placeholder="Asignar plan" />
                              </SelectTrigger>
                              <SelectContent>
                                {plans.map((plan) => (
                                  <SelectItem key={plan.id} value={plan.id}>
                                    {plan.display_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Módulos:</span>
                            {modules.map((mod) => (
                              <Badge
                                key={mod.code}
                                variant={
                                  org.active_modules.includes(mod.code)
                                    ? "default"
                                    : "outline"
                                }
                                className="cursor-pointer text-xs"
                                title={`${mod.code === "social" ? "Conexión Social" : "Networking B2B"} - Click para ${org.active_modules.includes(mod.code) ? "desactivar" : "activar"}`}
                                onClick={() =>
                                  handleModuleToggle(org.id, mod.code, org.active_modules)
                                }
                              >
                                {mod.code === "social" ? "S" : "P"}
                              </Badge>
                            ))}
                          </div>
                          <div className="flex gap-2 pt-2">
                            <Button
                              size="sm"
                              className="flex-1"
                              onClick={() => handleStatusChange(org.id, "active")}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Aprobar
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="flex-1"
                              onClick={() => handleStatusChange(org.id, "cancelled")}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Rechazar
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="organizers" className="space-y-4">
          <TabsList>
            <TabsTrigger value="organizers">
              <Building2 className="h-4 w-4 mr-2" />
              Organizadores
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="h-4 w-4 mr-2" />
              Usuarios Auth
            </TabsTrigger>
            <TabsTrigger value="plans">
              <Settings className="h-4 w-4 mr-2" />
              Planes
            </TabsTrigger>
            <TabsTrigger value="whitelabel">
              <Palette className="h-4 w-4 mr-2" />
              Marca Blanca
            </TabsTrigger>
          </TabsList>

          <TabsContent value="organizers" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-semibold">
                  Gestión de organizadores
                </h2>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Filtrar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pending">Pendientes</SelectItem>
                    <SelectItem value="active">Activos</SelectItem>
                    <SelectItem value="suspended">Suspendidos</SelectItem>
                    <SelectItem value="cancelled">Cancelados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => setCreateModalOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Crear organizador
              </Button>
            </div>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Módulos</TableHead>
                    <TableHead>Fecha registro</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrganizers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <p className="text-muted-foreground">
                          No hay organizadores registrados
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrganizers.map((org) => (
                      <TableRow key={org.id}>
                        <TableCell className="font-medium">
                          {org.company_name || "-"}
                        </TableCell>
                        <TableCell>{org.contact_email}</TableCell>
                        <TableCell>{getStatusBadge(org.status)}</TableCell>
                        <TableCell>
                          <Select
                            value={org.plan_id || "none"}
                            onValueChange={(value) =>
                              handlePlanChange(org.id, value)
                            }
                          >
                            <SelectTrigger className="w-[130px]">
                              <SelectValue placeholder="Sin plan" />
                            </SelectTrigger>
                            <SelectContent>
                              {plans.map((plan) => (
                                <SelectItem key={plan.id} value={plan.id}>
                                  {plan.display_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {org.active_modules.length === 0 && (
                              <span className="text-xs text-destructive mr-1" title="Sin módulos asignados">⚠️</span>
                            )}
                            {modules.map((mod) => (
                              <Badge
                                key={mod.code}
                                variant={
                                  org.active_modules.includes(mod.code)
                                    ? "default"
                                    : "outline"
                                }
                                className="cursor-pointer"
                                title={`${mod.code === "social" ? "Conexión Social" : "Networking B2B"} - Click para ${org.active_modules.includes(mod.code) ? "desactivar" : "activar"}`}
                                onClick={() =>
                                  handleModuleToggle(
                                    org.id,
                                    mod.code,
                                    org.active_modules
                                  )
                                }
                              >
                                {mod.code === "social" ? "S" : "P"}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(org.created_at), "dd MMM yyyy", {
                            locale: es,
                          })}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {org.status === "pending" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleStatusChange(org.id, "active")
                                  }
                                >
                                  <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                                  Aprobar
                                </DropdownMenuItem>
                              )}
                              {org.status !== "active" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleStatusChange(org.id, "active")
                                  }
                                >
                                  <UserCheck className="h-4 w-4 mr-2" />
                                  Activar
                                </DropdownMenuItem>
                              )}
                              {org.status === "active" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleStatusChange(org.id, "suspended")
                                  }
                                >
                                  <Ban className="h-4 w-4 mr-2 text-red-600" />
                                  Suspender
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedOrganizer(org);
                                  setFeaturesModalOpen(true);
                                }}
                              >
                                <Sliders className="h-4 w-4 mr-2" />
                                Gestionar Features
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleSetTrial(org.id, 7)}
                              >
                                <Clock className="h-4 w-4 mr-2" />
                                Trial 7 días
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleSetTrial(org.id, 14)}
                              >
                                <Clock className="h-4 w-4 mr-2" />
                                Trial 14 días
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleSetTrial(org.id, 30)}
                              >
                                <Clock className="h-4 w-4 mr-2" />
                                Trial 30 días
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Usuarios del sistema de autenticación</h2>
              <Badge variant="outline">{authUsers.length} usuarios</Badge>
            </div>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Fecha registro</TableHead>
                    <TableHead>Último login</TableHead>
                    <TableHead className="w-[100px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {authUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <p className="text-muted-foreground">Cargando usuarios...</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    authUsers.map((authUser) => (
                      <TableRow key={authUser.id}>
                        <TableCell className="font-medium">{authUser.email}</TableCell>
                        <TableCell>
                          {authUser.has_organizer ? (
                            <Badge className="bg-green-500/20 text-green-700 border-green-500/30">
                              <UserCheck className="h-3 w-3 mr-1" />
                              {authUser.organizer_status === "active" ? "Activo" : 
                               authUser.organizer_status === "pending" ? "Pendiente" : 
                               authUser.organizer_status || "Con perfil"}
                            </Badge>
                          ) : (
                            <Badge className="bg-red-500/20 text-red-700 border-red-500/30">
                              <UserX className="h-3 w-3 mr-1" />
                              Sin perfil
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{authUser.company_name || "-"}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(authUser.created_at), "dd MMM yyyy", { locale: es })}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {authUser.last_sign_in_at 
                            ? format(new Date(authUser.last_sign_in_at), "dd MMM yyyy HH:mm", { locale: es })
                            : "Nunca"}
                        </TableCell>
                        <TableCell>
                          {!authUser.has_organizer && (
                            <div className="flex gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                title="Crear perfil de organizador"
                                onClick={async () => {
                                  const success = await createOrganizerForUser(authUser.id, authUser.email);
                                  toast({
                                    title: success ? "Perfil creado" : "Error",
                                    description: success 
                                      ? "Se ha creado el perfil de organizador." 
                                      : "No se pudo crear el perfil.",
                                    variant: success ? "default" : "destructive",
                                  });
                                }}
                              >
                                <UserPlus className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                title="Eliminar usuario"
                                onClick={async () => {
                                  if (!confirm(`¿Eliminar al usuario ${authUser.email}? Esta acción no se puede deshacer.`)) return;
                                  const success = await deleteAuthUser(authUser.id);
                                  toast({
                                    title: success ? "Usuario eliminado" : "Error",
                                    description: success 
                                      ? "El usuario ha sido eliminado del sistema." 
                                      : "No se pudo eliminar el usuario.",
                                    variant: success ? "default" : "destructive",
                                  });
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
            <h2 className="text-xl font-semibold">Planes de suscripción</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plans.map((plan) => (
                <Card key={plan.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {plan.display_name}
                      {plan.is_default && (
                        <Badge variant="secondary">Por defecto</Badge>
                      )}
                    </CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Precio mensual
                        </span>
                        <span className="font-medium">
                          {plan.price_monthly === 0
                            ? "Gratis"
                            : `€${plan.price_monthly}`}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Eventos activos
                        </span>
                        <span className="font-medium">
                          {plan.max_active_events || "∞"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Participantes/evento
                        </span>
                        <span className="font-medium">
                          {plan.max_participants_per_event || "∞"}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="whitelabel">
            <SuperAdminWhiteLabel />
          </TabsContent>
        </Tabs>
      </main>

      {/* Features Modal */}
      {selectedOrganizer && (
        <OrganizerFeaturesModal
          open={featuresModalOpen}
          onOpenChange={setFeaturesModalOpen}
          organizer={selectedOrganizer}
          features={features}
          planFeatures={planFeatures}
          organizerOverrides={organizerFeatures[selectedOrganizer.id] || []}
          onUpdateFeature={updateOrganizerFeature}
          onRemoveOverride={removeOrganizerFeatureOverride}
        />
      )}

      {/* Create Organizer Modal */}
      <CreateOrganizerModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        plans={plans}
        modules={modules}
        onCreateOrganizer={createNewOrganizer}
      />
    </div>
  );
}
