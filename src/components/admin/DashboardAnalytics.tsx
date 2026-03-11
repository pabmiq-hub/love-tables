import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Users, TrendingUp, UserCheck, RefreshCw, BarChart3, Calendar,
  Trophy, Lightbulb, ArrowUpDown, Percent, Heart, Target, Clock,
  Briefcase, Building2, Layers, PartyPopper, Handshake, Send, Inbox,
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, LineChart, Line, CartesianGrid,
} from "recharts";
import type { AnalyticsData } from "@/pages/AdminDashboard";
import { SocialAnalyticsTab } from "./analytics/SocialAnalyticsTab";

interface DashboardAnalyticsProps {
  data: AnalyticsData;
}

// ==================== CONSTANTS ====================

const MODULE_COLORS: Record<string, string> = {
  social: "hsl(346, 77%, 50%)",
  dating: "hsl(320, 70%, 45%)",
  professional: "hsl(25, 95%, 53%)",
  unknown: "hsl(240, 5%, 45%)",
};

const MODULE_LABELS: Record<string, string> = {
  social: "Social",
  dating: "Dating",
  professional: "Profesional",
  unknown: "Sin tipo",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  active: "Activo",
  completed: "Completado",
};

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const GENDER_NORMALIZE: Record<string, string> = {
  man: "Hombre", hombre: "Hombre",
  woman: "Mujer", mujer: "Mujer",
  "non-binary": "No binario", "no binario": "No binario",
  otro: "Otro", other: "Otro",
};

const GENDER_COLORS: Record<string, string> = {
  Hombre: "hsl(210, 70%, 50%)",
  Mujer: "hsl(346, 77%, 50%)",
  "No binario": "hsl(262, 60%, 55%)",
  Otro: "hsl(240, 5%, 55%)",
};

const AGE_COLORS = [
  "hsl(346, 77%, 50%)", "hsl(25, 95%, 53%)", "hsl(210, 70%, 50%)",
  "hsl(262, 60%, 55%)", "hsl(142, 76%, 36%)", "hsl(320, 70%, 45%)",
];

const AGE_ORDER = ["18-24", "25-29", "30-34", "35-39", "40-49", "50+"];

const tooltipStyle = { borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" };

// ==================== HELPERS ====================

function calcAge(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const diff = Date.now() - new Date(birthDate).getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

function ageToRange(age: number): string {
  if (age < 25) return "18-24";
  if (age < 30) return "25-29";
  if (age < 35) return "30-34";
  if (age < 40) return "35-39";
  if (age < 50) return "40-49";
  return "50+";
}

function normalizeGender(g: string): string {
  return GENDER_NORMALIZE[g.toLowerCase().trim()] || g;
}

// ==================== EMPTY STATE ====================

function EmptyState({ emoji, title, description, ctaLabel, ctaTo }: {
  emoji: string; title: string; description: string; ctaLabel: string; ctaTo: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span className="text-6xl mb-4">{emoji}</span>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-md">{description}</p>
      <Link
        to={ctaTo}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
      >
        {ctaLabel}
      </Link>
    </div>
  );
}

// ==================== KPI CARD ====================

function KpiCard({ icon: Icon, value, label, color }: {
  icon: React.ElementType; value: string | number; label: string; color: string;
}) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center shrink-0">
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== MAIN COMPONENT ====================

export function DashboardAnalytics({ data }: DashboardAnalyticsProps) {
  const { events, stats, participants, selections, isPro } = data;
  const [sortField, setSortField] = useState<string>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // ========== Mutual matches (global) ==========
  const mutualMatches = useMemo(() => {
    const selSet = new Set<string>();
    selections.forEach(s => selSet.add(`${s.selector_id}->${s.selected_id}`));
    let totalMatches = 0;
    const matchesByEvent = new Map<string, number>();
    const counted = new Set<string>();
    selections.forEach(s => {
      const reverse = `${s.selected_id}->${s.selector_id}`;
      const pairKey = [s.selector_id, s.selected_id].sort().join(":");
      if (selSet.has(reverse) && !counted.has(pairKey)) {
        counted.add(pairKey);
        totalMatches++;
        matchesByEvent.set(s.event_id, (matchesByEvent.get(s.event_id) || 0) + 1);
      }
    });
    return { totalMatches, matchesByEvent };
  }, [selections]);

  // ========== Event-module map ==========
  const eventModuleMap = useMemo(() => new Map(events.map(e => [e.id, e.module || "unknown"])), [events]);

  // ========== Filtered subsets ==========
  const socialEvents = useMemo(() => events.filter(e => (e.module || "social") === "social" || e.module === "dating"), [events]);
  const proEvents = useMemo(() => events.filter(e => e.module === "professional"), [events]);

  const socialEventIds = useMemo(() => new Set(socialEvents.map(e => e.id)), [socialEvents]);
  const proEventIds = useMemo(() => new Set(proEvents.map(e => e.id)), [proEvents]);

  const socialParticipants = useMemo(() => participants.filter(p => socialEventIds.has(p.event_id)), [participants, socialEventIds]);
  const proParticipants = useMemo(() => participants.filter(p => proEventIds.has(p.event_id)), [participants, proEventIds]);

  const socialSelections = useMemo(() => selections.filter(s => socialEventIds.has(s.event_id)), [selections, socialEventIds]);
  const proSelections = useMemo(() => selections.filter(s => proEventIds.has(s.event_id)), [selections, proEventIds]);

  // ========== GENERAL TAB DATA ==========

  const generalKpis = useMemo(() => {
    // No-show rate
    const byEvent = new Map<string, { total: number; checkedIn: number }>();
    participants.forEach(p => {
      const curr = byEvent.get(p.event_id) || { total: 0, checkedIn: 0 };
      curr.total++;
      if (p.checked_in) curr.checkedIn++;
      byEvent.set(p.event_id, curr);
    });
    let totalNoShow = 0;
    let eventsWithData = 0;
    byEvent.forEach(val => {
      if (val.total > 0) { totalNoShow += ((val.total - val.checkedIn) / val.total) * 100; eventsWithData++; }
    });
    const noShowRate = eventsWithData > 0 ? Math.round(totalNoShow / eventsWithData) : 0;

    return { noShowRate };
  }, [participants]);

  const moduleDistribution = useMemo(() => {
    const byModule: Record<string, number> = {};
    events.forEach(e => {
      const mod = e.module || "unknown";
      byModule[mod] = (byModule[mod] || 0) + 1;
    });
    return Object.entries(byModule).map(([key, value]) => ({
      name: MODULE_LABELS[key] || key, value,
      fill: MODULE_COLORS[key] || MODULE_COLORS.unknown,
    }));
  }, [events]);

  const temporalData = useMemo(() => {
    const sorted = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const participantsOverTime = sorted.map(e => ({
      name: new Date(e.date).toLocaleDateString("es-ES", { month: "short", year: "2-digit" }),
      participantes: e.participants_count || 0,
      evento: e.name,
    }));
    const byMonth: Record<string, { month: string; pending: number; active: number; completed: number }> = {};
    events.forEach(e => {
      const d = new Date(e.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("es-ES", { month: "short", year: "2-digit" });
      if (!byMonth[key]) byMonth[key] = { month: label, pending: 0, active: 0, completed: 0 };
      const status = e.status as "pending" | "active" | "completed";
      if (byMonth[key][status] !== undefined) byMonth[key][status]++;
    });
    const monthlyEvents = Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
    return { participantsOverTime, monthlyEvents };
  }, [events]);

  // Event ranking
  const eventRanking = useMemo(() => {
    const participantsByEvent = new Map<string, { total: number; submitted: number; checkedIn: number }>();
    participants.forEach(p => {
      const curr = participantsByEvent.get(p.event_id) || { total: 0, submitted: 0, checkedIn: 0 };
      curr.total++;
      if (p.selection_submitted_at) curr.submitted++;
      if (p.checked_in) curr.checkedIn++;
      participantsByEvent.set(p.event_id, curr);
    });
    const selsByEvent = new Map<string, number>();
    selections.forEach(s => { selsByEvent.set(s.event_id, (selsByEvent.get(s.event_id) || 0) + 1); });

    const ranked = events.map(e => {
      const pStats = participantsByEvent.get(e.id) || { total: 0, submitted: 0, checkedIn: 0 };
      const selRate = pStats.total > 0 ? Math.round((pStats.submitted / pStats.total) * 100) : 0;
      return {
        ...e, realParticipants: pStats.total, submitted: pStats.submitted, checkedIn: pStats.checkedIn,
        selectionRate: selRate, matches: mutualMatches.matchesByEvent.get(e.id) || 0,
        totalSelections: selsByEvent.get(e.id) || 0,
      };
    });
    ranked.sort((a, b) => {
      const valA = a[sortField as keyof typeof a] ?? "";
      const valB = b[sortField as keyof typeof b] ?? "";
      if (typeof valA === "number" && typeof valB === "number") return sortDir === "asc" ? valA - valB : valB - valA;
      return sortDir === "asc" ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
    });
    return ranked;
  }, [events, participants, selections, mutualMatches, sortField, sortDir]);

  // Marketing insights
  const insights = useMemo(() => {
    const dayStats: Record<number, { total: number; participants: number }> = {};
    events.forEach(e => {
      const day = new Date(e.date).getDay();
      if (!dayStats[day]) dayStats[day] = { total: 0, participants: 0 };
      dayStats[day].total++;
      dayStats[day].participants += e.participants_count || 0;
    });
    const bestDay = Object.entries(dayStats)
      .map(([day, s]) => ({ day: Number(day), avg: s.total > 0 ? Math.round(s.participants / s.total) : 0 }))
      .sort((a, b) => b.avg - a.avg);
    const dayChartData = Array.from({ length: 7 }, (_, i) => ({
      name: DAY_LABELS[i],
      promedio: dayStats[i] ? Math.round(dayStats[i].participants / dayStats[i].total) : 0,
    }));
    const retention = stats.uniqueParticipants > 0 ? Math.round((stats.returningParticipants / stats.uniqueParticipants) * 100) : 0;
    return {
      bestDay: bestDay.length > 0 ? DAY_LABELS[bestDay[0].day] : "—",
      bestDayAvg: bestDay.length > 0 ? bestDay[0].avg : 0,
      retention, dayChartData,
    };
  }, [events, stats]);

  // (Social tab data is now computed inside SocialAnalyticsTab component)

  // ========== PROFESSIONAL TAB DATA ==========

  const proData = useMemo(() => {
    // Entity type distribution
    const entityCounts: Record<string, number> = {};
    proParticipants.forEach(p => {
      const et = p.entity_type || "Sin tipo";
      entityCounts[et] = (entityCounts[et] || 0) + 1;
    });
    const entityData = Object.entries(entityCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Top sectors
    const sectorCounts: Record<string, number> = {};
    proParticipants.forEach(p => {
      if (p.sector) sectorCounts[p.sector] = (sectorCounts[p.sector] || 0) + 1;
    });
    const sectorData = Object.entries(sectorCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // Avg needs/solutions
    let totalNeeds = 0, totalSolutions = 0, withNeeds = 0, withSolutions = 0;
    proParticipants.forEach(p => {
      if (p.needs?.length) { totalNeeds += p.needs.length; withNeeds++; }
      if (p.solutions?.length) { totalSolutions += p.solutions.length; withSolutions++; }
    });
    const avgNeeds = withNeeds > 0 ? (totalNeeds / withNeeds).toFixed(1) : "0";
    const avgSolutions = withSolutions > 0 ? (totalSolutions / withSolutions).toFixed(1) : "0";

    // Pro mutual matches
    const proSelSet = new Set(proSelections.map(s => `${s.selector_id}->${s.selected_id}`));
    let proMatches = 0;
    const proCounted = new Set<string>();
    proSelections.forEach(s => {
      const reverse = `${s.selected_id}->${s.selector_id}`;
      const pairKey = [s.selector_id, s.selected_id].sort().join(":");
      if (proSelSet.has(reverse) && !proCounted.has(pairKey)) {
        proCounted.add(pairKey);
        proMatches++;
      }
    });

    return {
      proEvents: proEvents.length,
      proParticipants: proParticipants.length,
      proMatches,
      entityData, sectorData,
      avgNeeds, avgSolutions,
    };
  }, [proParticipants, proSelections, proEvents]);

  // ========== HELPERS ==========

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  };

  const getPerformanceBadge = (rate: number) => {
    if (rate >= 70) return <Badge className="bg-primary/10 text-primary border-primary/20">{rate}%</Badge>;
    if (rate >= 40) return <Badge className="bg-accent/10 text-accent border-accent/20">{rate}%</Badge>;
    return <Badge variant="outline" className="text-muted-foreground">{rate}%</Badge>;
  };

  // ==================== RENDER ====================

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold mb-1">Analítica</h1>
        <p className="text-muted-foreground">Estadísticas detalladas para tomar mejores decisiones</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="general" className="gap-2"><BarChart3 className="w-4 h-4" /> General</TabsTrigger>
          <TabsTrigger value="social" className="gap-2"><PartyPopper className="w-4 h-4" /> Social</TabsTrigger>
          <TabsTrigger value="professional" className="gap-2"><Briefcase className="w-4 h-4" /> Profesional</TabsTrigger>
        </TabsList>

        {/* ==================== GENERAL TAB ==================== */}
        <TabsContent value="general" className="space-y-10 mt-6">
          {/* KPIs */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Resumen general</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <KpiCard icon={Calendar} value={events.length} label="Total eventos" color="text-primary" />
              <KpiCard icon={Users} value={stats.uniqueParticipants} label="Participantes únicos" color="text-primary" />
              <KpiCard icon={Heart} value={mutualMatches.totalMatches} label="Matches mutuos" color="text-accent" />
              <KpiCard icon={Percent} value={`${stats.selectionRate}%`} label="Tasa de selección" color="text-primary" />
              <KpiCard icon={RefreshCw} value={stats.returningParticipants} label="Repiten evento" color="text-accent" />
              <KpiCard icon={Clock} value={`${generalKpis.noShowRate}%`} label="No-show promedio" color="text-primary" />
            </div>
          </section>

          {/* Module distribution */}
          {moduleDistribution.length > 1 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Target className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Distribución por módulo</h2>
              </div>
              <Card>
                <CardContent className="pt-6">
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={moduleDistribution} cx="50%" cy="45%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value" strokeWidth={2} stroke="hsl(var(--background))">
                        {moduleDistribution.map((entry, idx) => <Cell key={idx} fill={entry.fill} />)}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value} eventos`, ""]} />
                      <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-sm font-medium">{value}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </section>
          )}

          {/* Temporal */}
          {events.length > 1 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Evolución temporal</h2>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-0"><CardTitle className="text-base">Participantes por evento</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={temporalData.participantsOverTime} margin={{ left: 0, right: 10, top: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                        <Tooltip contentStyle={tooltipStyle} labelFormatter={(_, payload) => payload?.[0]?.payload?.evento || ""} />
                        <Line type="monotone" dataKey="participantes" stroke="hsl(346, 77%, 50%)" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(346, 77%, 50%)" }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-0"><CardTitle className="text-base">Eventos por mes</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={temporalData.monthlyEvents} margin={{ left: 0, right: 10 }}>
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} allowDecimals={false} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="completed" name="Completados" stackId="a" fill="hsl(142, 76%, 36%)" />
                        <Bar dataKey="active" name="Activos" stackId="a" fill="hsl(346, 77%, 50%)" />
                        <Bar dataKey="pending" name="Pendientes" stackId="a" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                        <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-xs">{value}</span>} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </section>
          )}

          {/* Event ranking */}
          {eventRanking.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Trophy className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Ranking de eventos</h2>
              </div>
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          {[
                            { key: "name", label: "Evento" }, { key: "date", label: "Fecha" },
                            { key: "module", label: "Tipo" }, { key: "realParticipants", label: "Participantes" },
                            { key: "matches", label: "Matches" }, { key: "totalSelections", label: "Selecciones" },
                            { key: "selectionRate", label: "Tasa selección" }, { key: "status", label: "Estado" },
                          ].map(col => (
                            <th key={col.key} className="px-4 py-3 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors" onClick={() => toggleSort(col.key)}>
                              <div className="flex items-center gap-1">{col.label}<ArrowUpDown className="w-3 h-3" /></div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {eventRanking.map(e => (
                          <tr key={e.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-3 font-medium max-w-[200px] truncate">{e.name}</td>
                            <td className="px-4 py-3 text-muted-foreground">{new Date(e.date).toLocaleDateString("es-ES")}</td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="text-xs" style={{ borderColor: MODULE_COLORS[e.module || "unknown"], color: MODULE_COLORS[e.module || "unknown"] }}>
                                {MODULE_LABELS[e.module || "unknown"] || e.module}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 font-semibold">{e.realParticipants || e.participants_count}</td>
                            <td className="px-4 py-3 font-semibold">{e.matches}</td>
                            <td className="px-4 py-3">{e.totalSelections}</td>
                            <td className="px-4 py-3">{getPerformanceBadge(e.selectionRate)}</td>
                            <td className="px-4 py-3">
                              <Badge variant={e.status === "completed" ? "default" : e.status === "active" ? "secondary" : "outline"} className="text-xs">
                                {STATUS_LABELS[e.status] || e.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </section>
          )}

          {/* Marketing insights */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <Lightbulb className="w-5 h-5 text-accent" />
              <h2 className="text-lg font-semibold">Insights de marketing</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-accent/20">
                <CardContent className="p-4 text-center">
                  <Calendar className="w-6 h-6 text-accent mx-auto mb-2" />
                  <p className="text-2xl font-bold">{insights.bestDay}</p>
                  <p className="text-xs text-muted-foreground">Mejor día (media {insights.bestDayAvg} asist.)</p>
                </CardContent>
              </Card>
              <Card className="border-accent/20">
                <CardContent className="p-4 text-center">
                  <UserCheck className="w-6 h-6 text-accent mx-auto mb-2" />
                  <p className="text-2xl font-bold">{insights.retention}%</p>
                  <p className="text-xs text-muted-foreground">Retención participantes</p>
                </CardContent>
              </Card>
              <Card className="border-accent/20">
                <CardContent className="p-4 text-center">
                  <Heart className="w-6 h-6 text-accent mx-auto mb-2" />
                  <p className="text-2xl font-bold">{mutualMatches.totalMatches}</p>
                  <p className="text-xs text-muted-foreground">Matches mutuos totales</p>
                </CardContent>
              </Card>
              <Card className="border-accent/20">
                <CardContent className="p-4 text-center">
                  <Percent className="w-6 h-6 text-accent mx-auto mb-2" />
                  <p className="text-2xl font-bold">{stats.selectionRate}%</p>
                  <p className="text-xs text-muted-foreground">Tasa selección global</p>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader className="pb-0"><CardTitle className="text-base">Asistencia media por día de la semana</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={insights.dayChartData} margin={{ left: 0, right: 10 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [value, "Media asistentes"]} />
                    <Bar dataKey="promedio" name="Media asistentes" fill="hsl(25, 95%, 53%)" radius={[6, 6, 0, 0]} barSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </section>
        </TabsContent>

        {/* ==================== SOCIAL TAB ==================== */}
        <TabsContent value="social" className="mt-6">
          {socialEvents.length === 0 ? (
            <EmptyState
              emoji="🎉"
              title="¡Aún no tienes eventos sociales!"
              description="Crea tu primer evento social y descubre analíticas detalladas sobre demografía, selecciones y matches de tus participantes."
              ctaLabel="Crear evento social"
              ctaTo="/admin/events/new"
            />
          ) : (
            <SocialAnalyticsTab data={data} />
          )}
        </TabsContent>

        {/* ==================== PROFESSIONAL TAB ==================== */}
        <TabsContent value="professional" className="space-y-10 mt-6">
          {proEvents.length === 0 ? (
            <EmptyState
              emoji="💼"
              title="¡Aún no tienes eventos profesionales!"
              description="Crea tu primer evento B2B y descubre analíticas sobre sectores, tipos de empresa y compatibilidad de necesidades y soluciones."
              ctaLabel="Crear evento profesional"
              ctaTo="/admin/events/new"
            />
          ) : (
            <>
              {/* Pro KPIs */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Briefcase className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold">Resumen profesional</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <KpiCard icon={Calendar} value={proData.proEvents} label="Eventos profesionales" color="text-primary" />
                  <KpiCard icon={Building2} value={proData.proParticipants} label="Empresas participantes" color="text-primary" />
                  <KpiCard icon={Handshake} value={proData.proMatches} label="Matches B2B" color="text-accent" />
                  <KpiCard icon={Layers} value={proData.avgNeeds} label="Media necesidades/empresa" color="text-primary" />
                </div>
              </section>

              {/* Entity type + Sectors */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Target className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold">Análisis de participantes</h2>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {proData.entityData.length > 0 && (
                    <Card>
                      <CardHeader className="pb-0"><CardTitle className="text-base">Distribución por tipo de entidad</CardTitle></CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={260}>
                          <PieChart>
                            <Pie data={proData.entityData} cx="50%" cy="45%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value" strokeWidth={2} stroke="hsl(var(--background))">
                              {proData.entityData.map((_, idx) => (
                                <Cell key={idx} fill={idx === 0 ? "hsl(25, 95%, 53%)" : idx === 1 ? "hsl(210, 70%, 50%)" : "hsl(240, 5%, 55%)"} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value} empresas`, ""]} />
                            <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-sm font-medium">{value}</span>} />
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}
                  {proData.sectorData.length > 0 && (
                    <Card>
                      <CardHeader className="pb-0"><CardTitle className="text-base">Sectores más representados</CardTitle></CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={260}>
                          <BarChart data={proData.sectorData} layout="vertical" margin={{ left: 10, right: 20 }}>
                            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                            <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value} empresas`, ""]} />
                            <Bar dataKey="value" name="Empresas" fill="hsl(25, 95%, 53%)" radius={[0, 6, 6, 0]} barSize={20} />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </section>

              {/* Extra pro metrics */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Layers className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold">Oferta y demanda</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <KpiCard icon={Inbox} value={proData.avgNeeds} label="Media necesidades/empresa" color="text-primary" />
                  <KpiCard icon={Send} value={proData.avgSolutions} label="Media soluciones/empresa" color="text-accent" />
                  <KpiCard icon={Handshake} value={proData.proMatches} label="Conexiones B2B logradas" color="text-primary" />
                </div>
              </section>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
