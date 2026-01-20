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
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import konektumLogo from "@/assets/konektum-logo.png";

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
    loadOrganizers,
    loadPlans,
    loadModules,
    loadMetrics,
    updateOrganizerStatus,
    updateOrganizerPlan,
    updateOrganizerModules,
    setTrialPeriod,
  } = useSuperAdmin();

  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    if (!loading && !isSuperAdmin) {
      navigate("/admin");
    }
  }, [loading, isSuperAdmin, navigate]);

  useEffect(() => {
    if (isSuperAdmin) {
      loadOrganizers();
      loadPlans();
      loadModules();
      loadMetrics();
    }
  }, [isSuperAdmin]);

  const handleLogout = async () => {
    await signOut();
    navigate("/admin");
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

        {/* Tabs */}
        <Tabs defaultValue="organizers" className="space-y-4">
          <TabsList>
            <TabsTrigger value="organizers">
              <Building2 className="h-4 w-4 mr-2" />
              Organizadores
            </TabsTrigger>
            <TabsTrigger value="plans">
              <Settings className="h-4 w-4 mr-2" />
              Planes
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
                          <div className="flex gap-1">
                            {modules.map((mod) => (
                              <Badge
                                key={mod.code}
                                variant={
                                  org.active_modules.includes(mod.code)
                                    ? "default"
                                    : "outline"
                                }
                                className="cursor-pointer"
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

          <TabsContent value="plans" className="space-y-4">
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
        </Tabs>
      </main>
    </div>
  );
}
