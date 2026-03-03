import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users, TrendingUp, UserCheck, RefreshCw, BarChart3, Calendar,
  Trophy, Lightbulb, ArrowUpDown, Percent, Heart, Target, Clock,
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, LineChart, Line, CartesianGrid,
} from "recharts";
import type { AnalyticsData } from "@/pages/AdminDashboard";

interface DashboardAnalyticsProps {
  data: AnalyticsData;
}

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

const GENDER_COLORS: Record<string, string> = {
  Hombre: "hsl(210, 70%, 50%)",
  Mujer: "hsl(346, 77%, 50%)",
  "No binario": "hsl(262, 60%, 55%)",
  Otro: "hsl(240, 5%, 55%)",
};

const AGE_COLORS = [
  "hsl(346, 77%, 50%)",
  "hsl(25, 95%, 53%)",
  "hsl(210, 70%, 50%)",
  "hsl(262, 60%, 55%)",
  "hsl(142, 76%, 36%)",
  "hsl(320, 70%, 45%)",
  "hsl(240, 5%, 55%)",
];

export function DashboardAnalytics({ data }: DashboardAnalyticsProps) {
  const { events, stats, participants, encounters, selections, isPro } = data;
  const [sortField, setSortField] = useState<string>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // ========== Mutual matches ==========
  const mutualMatches = useMemo(() => {
    // Build a set of "selectorId->selectedId" then find reciprocals
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

  // ========== SECTION 1: KPIs ==========
  const kpis = useMemo(() => {
    const avgPerEvent = events.length > 0
      ? Math.round(events.reduce((acc, e) => acc + (e.participants_count || 0), 0) / events.length)
      : 0;

    // No-show rate
    let totalNoShow = 0;
    let eventsWithData = 0;
    const byEvent = new Map<string, { total: number; checkedIn: number }>();
    participants.forEach(p => {
      const curr = byEvent.get(p.event_id) || { total: 0, checkedIn: 0 };
      curr.total++;
      if (p.checked_in) curr.checkedIn++;
      byEvent.set(p.event_id, curr);
    });
    byEvent.forEach(val => {
      if (val.total > 0) {
        totalNoShow += ((val.total - val.checkedIn) / val.total) * 100;
        eventsWithData++;
      }
    });
    const noShowRate = eventsWithData > 0 ? Math.round(totalNoShow / eventsWithData) : 0;

    return [
      { icon: Calendar, value: events.length, label: "Total eventos", color: "text-primary" },
      { icon: Users, value: stats.uniqueParticipants, label: isPro ? "Empresas únicas" : "Participantes únicos", color: "text-primary" },
      { icon: Heart, value: mutualMatches.totalMatches, label: "Matches mutuos", color: "text-accent" },
      { icon: Percent, value: `${stats.selectionRate}%`, label: "Tasa de selección", color: "text-primary" },
      { icon: RefreshCw, value: stats.returningParticipants, label: isPro ? "Empresas recurrentes" : "Repiten evento", color: "text-accent" },
      { icon: Clock, value: `${noShowRate}%`, label: "No-show promedio", color: "text-primary" },
    ];
  }, [events, stats, isPro, participants, mutualMatches]);

  // ========== Demographics ==========
  const demographics = useMemo(() => {
    // Gender distribution
    const genderCounts: Record<string, number> = {};
    const ageCounts: Record<string, number> = {};
    
    participants.forEach(p => {
      if (p.gender) {
        genderCounts[p.gender] = (genderCounts[p.gender] || 0) + 1;
      }
      
      // Age range
      let ageRange = p.age_range;
      if (!ageRange && p.birth_date) {
        const age = Math.floor((Date.now() - new Date(p.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        if (age < 25) ageRange = "18-24";
        else if (age < 30) ageRange = "25-29";
        else if (age < 35) ageRange = "30-34";
        else if (age < 40) ageRange = "35-39";
        else if (age < 50) ageRange = "40-49";
        else ageRange = "50+";
      }
      if (ageRange) {
        ageCounts[ageRange] = (ageCounts[ageRange] || 0) + 1;
      }
    });

    const genderData = Object.entries(genderCounts)
      .map(([name, value]) => ({ name, value, fill: GENDER_COLORS[name] || GENDER_COLORS.Otro }))
      .sort((a, b) => b.value - a.value);

    // Sort age ranges logically
    const ageOrder = ["18-24", "25-29", "30-34", "35-39", "40-49", "50+"];
    const ageData = Object.entries(ageCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => {
        const ia = ageOrder.indexOf(a.name);
        const ib = ageOrder.indexOf(b.name);
        return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
      });

    return { genderData, ageData };
  }, [participants]);

  // ========== By module ==========
  const moduleAnalysis = useMemo(() => {
    const byModule: Record<string, { count: number; totalParticipants: number; totalSelections: number; matches: number }> = {};
    events.forEach(e => {
      const mod = e.module || "unknown";
      if (!byModule[mod]) byModule[mod] = { count: 0, totalParticipants: 0, totalSelections: 0, matches: 0 };
      byModule[mod].count++;
      byModule[mod].totalParticipants += e.participants_count || 0;
      byModule[mod].matches += mutualMatches.matchesByEvent.get(e.id) || 0;
    });

    const eventModuleMap = new Map(events.map(e => [e.id, e.module || "unknown"]));
    selections.forEach(s => {
      const mod = eventModuleMap.get(s.event_id);
      if (mod && byModule[mod]) byModule[mod].totalSelections++;
    });

    const pieData = Object.entries(byModule).map(([key, val]) => ({
      name: MODULE_LABELS[key] || key,
      value: val.count,
      fill: MODULE_COLORS[key] || MODULE_COLORS.unknown,
    }));

    const barData = Object.entries(byModule).map(([key, val]) => ({
      name: MODULE_LABELS[key] || key,
      avgParticipants: val.count > 0 ? Math.round(val.totalParticipants / val.count) : 0,
      fill: MODULE_COLORS[key] || MODULE_COLORS.unknown,
    }));

    return { pieData, barData, byModule };
  }, [events, selections, mutualMatches]);

  // ========== Temporal ==========
  const temporalData = useMemo(() => {
    const sorted = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const participantsOverTime = sorted.map(e => ({
      name: new Date(e.date).toLocaleDateString("es-ES", { month: "short", year: "2-digit" }),
      date: e.date,
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

  // ========== Event ranking ==========
  const eventRanking = useMemo(() => {
    const participantsByEvent = new Map<string, { total: number; submitted: number; checkedIn: number }>();
    participants.forEach(p => {
      const curr = participantsByEvent.get(p.event_id) || { total: 0, submitted: 0, checkedIn: 0 };
      curr.total++;
      if (p.selection_submitted_at) curr.submitted++;
      if (p.checked_in) curr.checkedIn++;
      participantsByEvent.set(p.event_id, curr);
    });

    const selectionsByEvent = new Map<string, number>();
    selections.forEach(s => {
      selectionsByEvent.set(s.event_id, (selectionsByEvent.get(s.event_id) || 0) + 1);
    });

    const ranked = events.map(e => {
      const pStats = participantsByEvent.get(e.id) || { total: 0, submitted: 0, checkedIn: 0 };
      const selRate = pStats.total > 0 ? Math.round((pStats.submitted / pStats.total) * 100) : 0;
      const matches = mutualMatches.matchesByEvent.get(e.id) || 0;
      const sels = selectionsByEvent.get(e.id) || 0;

      return {
        ...e,
        realParticipants: pStats.total,
        submitted: pStats.submitted,
        checkedIn: pStats.checkedIn,
        selectionRate: selRate,
        matches,
        totalSelections: sels,
      };
    });

    ranked.sort((a, b) => {
      const valA = a[sortField as keyof typeof a] ?? "";
      const valB = b[sortField as keyof typeof b] ?? "";
      if (typeof valA === "number" && typeof valB === "number") {
        return sortDir === "asc" ? valA - valB : valB - valA;
      }
      return sortDir === "asc" ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
    });

    return ranked;
  }, [events, participants, selections, mutualMatches, sortField, sortDir]);

  // ========== Marketing insights ==========
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

    const retention = stats.uniqueParticipants > 0
      ? Math.round((stats.returningParticipants / stats.uniqueParticipants) * 100) : 0;

    return {
      bestDay: bestDay.length > 0 ? DAY_LABELS[bestDay[0].day] : "—",
      bestDayAvg: bestDay.length > 0 ? bestDay[0].avg : 0,
      retention,
      dayChartData,
    };
  }, [events, stats]);

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  };

  const getPerformanceBadge = (rate: number) => {
    if (rate >= 70) return <Badge className="bg-primary/10 text-primary border-primary/20">{rate}%</Badge>;
    if (rate >= 40) return <Badge className="bg-accent/10 text-accent border-accent/20">{rate}%</Badge>;
    return <Badge variant="outline" className="text-muted-foreground">{rate}%</Badge>;
  };

  const tooltipStyle = { borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" };

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-3xl font-bold mb-1">Analítica</h1>
        <p className="text-muted-foreground">Estadísticas detalladas para tomar mejores decisiones</p>
      </div>

      {/* ========== KPIs ========== */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Resumen general</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {kpis.map((kpi, i) => (
            <Card key={i}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ========== Demographics ========== */}
      {(demographics.genderData.length > 0 || demographics.ageData.length > 0) && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Demografía de participantes</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gender */}
            {demographics.genderData.length > 0 && (
              <Card>
                <CardHeader className="pb-0">
                  <CardTitle className="text-base">Distribución por género</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={demographics.genderData} cx="50%" cy="45%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value" strokeWidth={2} stroke="hsl(var(--background))">
                        {demographics.genderData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value} participantes`, ""]} />
                      <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-sm font-medium">{value}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Age */}
            {demographics.ageData.length > 0 && (
              <Card>
                <CardHeader className="pb-0">
                  <CardTitle className="text-base">Distribución por rango de edad</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={demographics.ageData} margin={{ left: 0, right: 10 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value} participantes`, ""]} />
                      <Bar dataKey="value" name="Participantes" radius={[6, 6, 0, 0]} barSize={36}>
                        {demographics.ageData.map((_, idx) => (
                          <Cell key={idx} fill={AGE_COLORS[idx % AGE_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      )}

      {/* ========== By module ========== */}
      {moduleAnalysis.pieData.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <Target className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Análisis por tipo de evento</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-0">
                <CardTitle className="text-base">Distribución por módulo</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={moduleAnalysis.pieData} cx="50%" cy="45%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value" strokeWidth={2} stroke="hsl(var(--background))">
                      {moduleAnalysis.pieData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value} eventos`, ""]} />
                    <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-sm font-medium">{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-0">
                <CardTitle className="text-base">Media de participantes por tipo</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={moduleAnalysis.barData} margin={{ left: 0, right: 10 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="avgParticipants" name="Media participantes" radius={[6, 6, 0, 0]} barSize={40}>
                      {moduleAnalysis.barData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Object.entries(moduleAnalysis.byModule).map(([mod, val]) => (
              <Card key={mod}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" style={{ borderColor: MODULE_COLORS[mod], color: MODULE_COLORS[mod] }}>
                      {MODULE_LABELS[mod] || mod}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{val.count} eventos</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Selecciones</p>
                      <p className="font-semibold">{val.totalSelections}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Matches</p>
                      <p className="font-semibold">{val.matches}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* ========== Temporal ========== */}
      {events.length > 1 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Evolución temporal</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-0">
                <CardTitle className="text-base">Participantes por evento</CardTitle>
              </CardHeader>
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
              <CardHeader className="pb-0">
                <CardTitle className="text-base">Eventos por mes</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={temporalData.monthlyEvents} margin={{ left: 0, right: 10 }}>
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="completed" name="Completados" stackId="a" fill="hsl(142, 76%, 36%)" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="active" name="Activos" stackId="a" fill="hsl(346, 77%, 50%)" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="pending" name="Pendientes" stackId="a" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                    <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-xs">{value}</span>} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* ========== Event Ranking ========== */}
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
                        { key: "name", label: "Evento" },
                        { key: "date", label: "Fecha" },
                        { key: "module", label: "Tipo" },
                        { key: "realParticipants", label: "Participantes" },
                        { key: "matches", label: "Matches" },
                        { key: "totalSelections", label: "Selecciones" },
                        { key: "selectionRate", label: "Tasa selección" },
                        { key: "status", label: "Estado" },
                      ].map(col => (
                        <th
                          key={col.key}
                          className="px-4 py-3 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                          onClick={() => toggleSort(col.key)}
                        >
                          <div className="flex items-center gap-1">
                            {col.label}
                            <ArrowUpDown className="w-3 h-3" />
                          </div>
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

      {/* ========== Marketing Insights ========== */}
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

        {/* Day of week chart only — removed "tamaño óptimo" */}
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-base">Asistencia media por día de la semana</CardTitle>
          </CardHeader>
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
    </div>
  );
}
