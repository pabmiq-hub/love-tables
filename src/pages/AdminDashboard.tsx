import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganizer } from "@/hooks/useOrganizer";
import { useFeatures } from "@/hooks/useFeatures";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar, type DashboardSection } from "@/components/admin/AdminSidebar";
import { DashboardHome } from "@/components/admin/DashboardHome";
import { DashboardEvents } from "@/components/admin/DashboardEvents";
import { DashboardAnalytics } from "@/components/admin/DashboardAnalytics";
import { DashboardEmail } from "@/components/admin/DashboardEmail";
import { DashboardAccount } from "@/components/admin/DashboardAccount";
import { DashboardBranding } from "@/components/admin/DashboardBranding";

interface Event {
  id: string;
  name: string;
  date: string;
  participants_count: number;
  status: string;
  module: string | null;
}

const AdminDashboard = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<DashboardSection>("home");
  const [stats, setStats] = useState({
    uniqueParticipants: 0,
    totalConnections: 0,
    returningParticipants: 0,
    selectionRate: 0,
  });
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading, signOut } = useAuth();
  const { organizer, plan, limits, loading: orgLoading, isActive, isPending, isSuspended, branding, refresh: refreshOrganizer } = useOrganizer();
  const { isSuperAdmin } = useFeatures();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/admin/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!orgLoading && organizer) {
      if (isPending) {
        navigate("/admin/pending-approval");
        return;
      }
      if (isSuspended) {
        toast({ title: "Cuenta suspendida", description: "Tu cuenta ha sido suspendida. Contacta con soporte.", variant: "destructive" });
        signOut();
      }
    }
  }, [organizer, orgLoading, isPending, isSuspended, navigate]);

  const loadEvents = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("organizer_id", user.id)
      .order("created_at", { ascending: false });
    if (!error && data) setEvents(data);
    setIsLoading(false);
  };

  const loadStats = async () => {
    const { count: uniqueCount } = await supabase.from("global_participants").select("*", { count: "exact", head: true });
    const { count: connectionsCount } = await supabase.from("participant_encounters").select("*", { count: "exact", head: true });
    const { count: returningCount } = await supabase.from("global_participants").select("*", { count: "exact", head: true }).gt("events_attended", 1);
    const { count: totalParticipants } = await supabase.from("participants").select("*", { count: "exact", head: true });
    const { count: submittedCount } = await supabase.from("participants").select("*", { count: "exact", head: true }).not("selection_submitted_at", "is", null);

    setStats({
      uniqueParticipants: uniqueCount || 0,
      totalConnections: connectionsCount || 0,
      returningParticipants: returningCount || 0,
      selectionRate: totalParticipants ? Math.round(((submittedCount || 0) / totalParticipants) * 100) : 0,
    });
  };

  useEffect(() => {
    if (user && (isActive || isSuperAdmin)) {
      loadEvents();
      loadStats();
    }
  }, [user, isActive, isSuperAdmin]);

  const handleLogout = async () => {
    await signOut();
    toast({ title: "Sesión cerrada", description: "Has cerrado sesión correctamente" });
    navigate("/admin/login");
  };

  const handleDeleteEvent = async (eventId: string) => {
    const { error } = await supabase.from("events").delete().eq("id", eventId);
    if (error) {
      toast({ title: "Error", description: "No se pudo eliminar el evento", variant: "destructive" });
      return;
    }
    setEvents(events.filter((e) => e.id !== eventId));
    toast({ title: "Evento eliminado", description: "El evento ha sido eliminado correctamente" });
  };

  const isPro = branding.isProfessionalOnly;

  if (authLoading || orgLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderSection = () => {
    switch (activeSection) {
      case "home":
        return <DashboardHome events={events} stats={stats} isPro={isPro} onNavigate={setActiveSection} />;
      case "events":
        return <DashboardEvents events={events} isPro={isPro} onDeleteEvent={handleDeleteEvent} />;
      case "analytics":
        return <DashboardAnalytics events={events} stats={stats} isPro={isPro} />;
      case "email":
        return <DashboardEmail />;
      case "account":
        return <DashboardAccount user={user} organizer={organizer} plan={plan} branding={branding} onRefresh={refreshOrganizer} />;
      case "branding":
        return <DashboardBranding />;
      default:
        return null;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar
          activeSection={activeSection}
          onSelect={setActiveSection}
          branding={branding}
          onLogout={handleLogout}
        />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <header className="h-14 border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40 flex items-center px-4 gap-3">
            <SidebarTrigger />
            <span className="text-sm text-muted-foreground truncate">
              {organizer?.company_name || user?.email}
            </span>
          </header>

          {/* Content */}
          <main className="flex-1 p-6 md:p-8 max-w-5xl">
            {renderSection()}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminDashboard;
