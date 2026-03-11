import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganizer } from "@/hooks/useOrganizer";
import { useFeatures } from "@/hooks/useFeatures";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar, type DashboardSection } from "@/components/admin/AdminSidebar";
import { DashboardHome } from "@/components/admin/DashboardHome";
import { DashboardEvents } from "@/components/admin/DashboardEvents";
import { DashboardAnalytics } from "@/components/admin/DashboardAnalytics";
import { DashboardEmail } from "@/components/admin/DashboardEmail";
import { DashboardAccount } from "@/components/admin/DashboardAccount";
import { DashboardBranding } from "@/components/admin/DashboardBranding";
import { DashboardTemplates } from "@/components/admin/DashboardTemplates";

interface Event {
  id: string;
  name: string;
  date: string;
  participants_count: number;
  status: string;
  module: string | null;
  tables: any;
  rounds: number;
}

export interface ParticipantRecord {
  id: string;
  event_id: string;
  name: string;
  checked_in: boolean | null;
  selection_submitted_at: string | null;
  gender: string | null;
  age_range: string | null;
  birth_date: string | null;
  global_participant_id: string | null;
  preference: string | null;
  dating_preference: string | null;
  entity_type: string | null;
  sector: string | null;
  needs: string[] | null;
  solutions: string[] | null;
}

export interface EncounterRecord {
  event_id: string;
}

export interface SelectionRecord {
  event_id: string;
  selector_id: string;
  selected_id: string;
  selection_type: string | null;
}

export interface AnalyticsData {
  events: Event[];
  stats: {
    uniqueParticipants: number;
    totalConnections: number;
    returningParticipants: number;
    selectionRate: number;
  };
  participants: ParticipantRecord[];
  encounters: EncounterRecord[];
  selections: SelectionRecord[];
  isPro: boolean;
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
  const [participants, setParticipants] = useState<ParticipantRecord[]>([]);
  const [encounters, setEncounters] = useState<EncounterRecord[]>([]);
  const [selections, setSelections] = useState<SelectionRecord[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading, signOut } = useAuth();
  const { organizer, plan, limits, loading: orgLoading, isActive, isPending, isSuspended, branding, refresh: refreshOrganizer } = useOrganizer();
  const { isSuperAdmin, hasFeature } = useFeatures();

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
    if (!user) return;
    // Filter by current organizer
    const { count: uniqueCount } = await supabase.from("global_participants").select("*", { count: "exact", head: true }).eq("organizer_id", user.id);
    const { count: returningCount } = await supabase.from("global_participants").select("*", { count: "exact", head: true }).eq("organizer_id", user.id).gt("events_attended", 1);
    
    // Get organizer's event IDs first
    const { data: orgEvents } = await supabase.from("events").select("id").eq("organizer_id", user.id);
    const eventIds = orgEvents?.map(e => e.id) || [];
    
    let totalParticipants = 0;
    let submittedCount = 0;
    if (eventIds.length > 0) {
      const { count: tp } = await supabase.from("participants").select("*", { count: "exact", head: true }).in("event_id", eventIds);
      const { count: sc } = await supabase.from("participants").select("*", { count: "exact", head: true }).in("event_id", eventIds).not("selection_submitted_at", "is", null);
      totalParticipants = tp || 0;
      submittedCount = sc || 0;
    }

    // Calculate mutual matches from selections (filtered by organizer's events)
    let mutualMatches = 0;
    if (eventIds.length > 0) {
      const { data: allSelections } = await supabase.from("participant_selections").select("selector_id, selected_id, event_id").in("event_id", eventIds);
      if (allSelections) {
        const selSet = new Set(allSelections.map(s => `${s.selector_id}->${s.selected_id}`));
        const counted = new Set<string>();
        allSelections.forEach(s => {
          const reverse = `${s.selected_id}->${s.selector_id}`;
          const pairKey = [s.selector_id, s.selected_id].sort().join(":");
          if (selSet.has(reverse) && !counted.has(pairKey)) {
            counted.add(pairKey);
            mutualMatches++;
          }
        });
      }
    }

    setStats({
      uniqueParticipants: uniqueCount || 0,
      totalConnections: mutualMatches,
      returningParticipants: returningCount || 0,
      selectionRate: totalParticipants ? Math.round((submittedCount / totalParticipants) * 100) : 0,
    });
  };

  const loadAnalyticsData = async () => {
    if (!user) return;
    // Get organizer's event IDs
    const { data: orgEvents } = await supabase.from("events").select("id").eq("organizer_id", user.id);
    const eventIds = orgEvents?.map(e => e.id) || [];
    if (eventIds.length === 0) return;

    // Load participants filtered by organizer's events
    const { data: pData } = await supabase
      .from("participants")
      .select("id, event_id, name, checked_in, selection_submitted_at, gender, age_range, birth_date, global_participant_id, preference, dating_preference, entity_type, sector, needs, solutions")
      .in("event_id", eventIds);
    if (pData) setParticipants(pData as ParticipantRecord[]);

    // Load encounters filtered by organizer
    const { data: eData } = await supabase
      .from("participant_encounters")
      .select("event_id")
      .eq("organizer_id", user.id);
    if (eData) setEncounters(eData);

    // Load selections filtered by organizer's events
    const { data: sData } = await supabase
      .from("participant_selections")
      .select("event_id, selector_id, selected_id, selection_type")
      .in("event_id", eventIds);
    if (sData) setSelections(sData);
  };

  useEffect(() => {
    if (user && (isActive || isSuperAdmin)) {
      loadEvents();
      loadStats();
      loadAnalyticsData();
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

  const analyticsData: AnalyticsData = {
    events,
    stats,
    participants,
    encounters,
    selections,
    isPro,
  };

  

  const renderSection = () => {
    switch (activeSection) {
      case "home":
        return <DashboardHome events={events} stats={stats} isPro={isPro} onNavigate={setActiveSection} participants={participants} companyName={organizer?.company_name ?? null} />;
      case "events":
        return <DashboardEvents events={events} isPro={isPro} onDeleteEvent={handleDeleteEvent} />;
      case "analytics":
        if (!hasFeature("analytics") && !isSuperAdmin) {
          return <UpgradePrompt title="Analítica avanzada" description="Accede a estadísticas detalladas de tus eventos, participantes y matches" onUpgrade={() => window.open("/#pricing", "_blank")} />;
        }
        return <DashboardAnalytics data={analyticsData} />;
      case "email":
        if (!hasFeature("auto_emails") && !isSuperAdmin) {
          return <UpgradePrompt title="Gestión de email avanzada" description="Configura tu dominio propio y envía emails personalizados desde tu marca" onUpgrade={() => window.open("/#pricing", "_blank")} />;
        }
        return <DashboardEmail />;
      case "account":
        return <DashboardAccount user={user} organizer={organizer} plan={plan} branding={branding} onRefresh={refreshOrganizer} />;
      case "branding":
        if (!hasFeature("custom_branding") && !isSuperAdmin) {
          return <UpgradePrompt title="Marca blanca" description="Personaliza la experiencia completa con tu propia marca, colores y logo" onUpgrade={() => window.open("/#pricing", "_blank")} />;
        }
        return <DashboardBranding />;
      case "templates":
        if (!hasFeature("templates") && !isSuperAdmin) {
          return <UpgradePrompt title="Plantillas" description="Crea y gestiona plantillas reutilizables de formularios, correos electrónicos y eventos" onUpgrade={() => window.open("/#pricing", "_blank")} />;
        }
        return <DashboardTemplates />;
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
          <header className="h-14 border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40 flex items-center px-4 gap-3">
            <SidebarTrigger />
            <span className="text-sm text-muted-foreground truncate">
              {organizer?.company_name || user?.email}
            </span>
          </header>

          <main className="flex-1 p-6 md:p-8 max-w-6xl">
            {renderSection()}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminDashboard;
