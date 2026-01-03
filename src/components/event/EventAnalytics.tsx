import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Users, 
  UserCheck, 
  UserX,
  Heart, 
  HandshakeIcon,
  BarChart3,
  AlertCircle,
  TrendingUp,
  Percent,
  Trophy,
  Target
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from "recharts";

interface Participant {
  id: string;
  name: string;
  gender?: string | null;
  age_range?: string | null;
  preference?: string | null;
  checked_in?: boolean | null;
  selection_submitted_at?: string | null;
}

interface Selection {
  selector_id: string;
  selected_id: string;
  selection_type?: string | null;
}

interface Match {
  participant1: { id: string; name: string };
  participant2: { id: string; name: string };
  matchTypes: {
    friendship: boolean;
    dating: boolean;
  };
}

interface TableRound {
  round: number;
  tables: any[][];
}

interface EventAnalyticsProps {
  participants: Participant[];
  selections: Selection[];
  matches: Match[];
  tables: any[][] | TableRound[];
}

const GENDER_COLORS: Record<string, string> = {
  "Hombre": "#3b82f6",
  "Mujer": "#ec4899", 
  "No binario": "#8b5cf6",
  "Sin especificar": "#94a3b8"
};

const AGE_COLORS = ["#f43f5e", "#ec4899", "#d946ef", "#a855f7", "#8b5cf6", "#6366f1", "#3b82f6", "#0ea5e9"];

const AGE_RANGE_ORDER = [
  "18-24", "18-25", 
  "25-32", "26-30", "26-32",
  "31-35", "33-40", 
  "36-40", "41-45", "41-50",
  "46-50", "50+", "+50", "51-60"
];

const normalizeAgeRange = (range: string | null | undefined): string => {
  if (!range) return "Sin especificar";
  // Normalizar guiones (– → -) y espacios
  let cleaned = range.replace(/–/g, "-").replace(/\s+/g, "").replace("años", "").trim();
  
  // Mapear rangos a formato estándar
  if (cleaned === "+50" || cleaned === "51-60") return "50+";
  
  return cleaned;
};

const EventAnalytics = ({ participants, selections, matches, tables }: EventAnalyticsProps) => {
  // ========== INSCRIPTIONS STATS ==========
  const inscriptionStats = useMemo(() => {
    const total = participants.length;
    const checkedIn = participants.filter(p => p.checked_in).length;
    const noShows = total - checkedIn;
    const noShowRate = total > 0 ? ((noShows / total) * 100).toFixed(1) : "0";
    const checkinRate = total > 0 ? ((checkedIn / total) * 100).toFixed(1) : "0";

    // Gender distribution
    const byGender = participants.reduce((acc, p) => {
      const gender = p.gender || "Sin especificar";
      acc[gender] = (acc[gender] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const genderData = Object.entries(byGender).map(([name, value]) => ({ name, value }));

    // Age distribution
    const byAge = participants.reduce((acc, p) => {
      const range = normalizeAgeRange(p.age_range);
      acc[range] = (acc[range] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const ageData = AGE_RANGE_ORDER
      .filter(range => byAge[range] || byAge[normalizeAgeRange(range)])
      .map(range => ({
        name: range,
        value: byAge[range] || byAge[normalizeAgeRange(range)] || 0
      }))
      .filter(d => d.value > 0);

    // Add "Sin especificar" if exists
    if (byAge["Sin especificar"]) {
      ageData.push({ name: "Sin especificar", value: byAge["Sin especificar"] });
    }

    return {
      total,
      checkedIn,
      noShows,
      noShowRate,
      checkinRate,
      genderData,
      ageData,
      byGender
    };
  }, [participants]);

  // ========== MATCHES STATS ==========
  const matchStats = useMemo(() => {
    const submitted = participants.filter(p => p.selection_submitted_at).length;
    const submissionRate = inscriptionStats.checkedIn > 0 
      ? ((submitted / inscriptionStats.checkedIn) * 100).toFixed(1) 
      : "0";

    const totalMatches = matches.length;
    const totalSelections = selections.length;
    
    // Match rate: (matches * 2 / total_selections) * 100
    const matchRate = totalSelections > 0 
      ? ((totalMatches * 2 / totalSelections) * 100).toFixed(1) 
      : "0";

    // Participants with at least one match
    const participantsWithMatch = new Set<string>();
    matches.forEach(m => {
      participantsWithMatch.add(m.participant1.id);
      participantsWithMatch.add(m.participant2.id);
    });
    const withMatchCount = participantsWithMatch.size;
    const withMatchRate = submitted > 0 
      ? ((withMatchCount / submitted) * 100).toFixed(1) 
      : "0";

    // Average matches per person
    const avgMatchesPerPerson = submitted > 0 
      ? ((totalMatches * 2) / submitted).toFixed(1) 
      : "0";

    // Match types - usando matchTypes object con fallback para compatibilidad
    const datingOnlyMatches = matches.filter(m => {
      const mt = m.matchTypes || { friendship: false, dating: false };
      return mt.dating && !mt.friendship;
    }).length;
    
    const friendshipOnlyMatches = matches.filter(m => {
      const mt = m.matchTypes || { friendship: false, dating: false };
      return mt.friendship && !mt.dating;
    }).length;
    
    const bothMatches = matches.filter(m => {
      const mt = m.matchTypes || { friendship: false, dating: false };
      return mt.dating && mt.friendship;
    }).length;

    // Si no hay tipos específicos pero hay matches, mostrar como "Sin categoría" o recategorizar
    const uncategorizedMatches = matches.length - datingOnlyMatches - friendshipOnlyMatches - bothMatches;

    const matchTypeData = [
      { name: "Romance", value: datingOnlyMatches, color: "#ec4899" },
      { name: "Amistad", value: friendshipOnlyMatches, color: "#3b82f6" },
      { name: "Ambos", value: bothMatches, color: "#8b5cf6" },
      ...(uncategorizedMatches > 0 ? [{ name: "Otro", value: uncategorizedMatches, color: "#94a3b8" }] : []),
    ].filter(d => d.value > 0);

    // Top selected
    const selectionCount: Record<string, number> = {};
    selections.forEach(s => {
      selectionCount[s.selected_id] = (selectionCount[s.selected_id] || 0) + 1;
    });
    const topSelected = Object.entries(selectionCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => ({
        participant: participants.find(p => p.id === id),
        count
      }))
      .filter(t => t.participant);

    // Top matches
    const matchCount: Record<string, number> = {};
    matches.forEach(m => {
      matchCount[m.participant1.id] = (matchCount[m.participant1.id] || 0) + 1;
      matchCount[m.participant2.id] = (matchCount[m.participant2.id] || 0) + 1;
    });
    const topMatches = Object.entries(matchCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => ({
        participant: participants.find(p => p.id === id),
        count
      }))
      .filter(t => t.participant);

    return {
      submitted,
      submissionRate,
      totalMatches,
      totalSelections,
      matchRate,
      withMatchCount,
      withMatchRate,
      avgMatchesPerPerson,
      datingOnlyMatches,
      friendshipOnlyMatches,
      bothMatches,
      matchTypeData,
      topSelected,
      topMatches
    };
  }, [participants, selections, matches, inscriptionStats.checkedIn]);

  // ========== NORMALIZED TABLES ==========
  const normalizedTables = useMemo(() => {
    if (!tables || tables.length === 0) return [];
    
    // Si es formato {round, tables}[], aplanar a todas las mesas
    const firstItem = tables[0];
    if (firstItem && typeof firstItem === 'object' && 'tables' in firstItem) {
      return (tables as TableRound[]).flatMap(r => r.tables);
    }
    return tables as any[][];
  }, [tables]);

  // ========== TABLES WITH MOST MATCHES ==========
  const tablesWithMatches = useMemo(() => {
    if (normalizedTables.length === 0 || matches.length === 0) return [];

    const tableMatchCounts = normalizedTables.map((table, idx) => {
      if (!Array.isArray(table)) return { tableNum: idx + 1, matchCount: 0, members: [] };
      
      const memberIds = table.map((m: any) => m.id);
      const matchesInTable = matches.filter(match => 
        memberIds.includes(match.participant1.id) && 
        memberIds.includes(match.participant2.id)
      );
      
      return {
        tableNum: idx + 1,
        matchCount: matchesInTable.length,
        members: table.map((m: any) => m.name || "Sin nombre")
      };
    }).filter(t => t.matchCount > 0)
      .sort((a, b) => b.matchCount - a.matchCount);

    return tableMatchCounts.slice(0, 5);
  }, [normalizedTables, matches]);

  // ========== TABLE QUALITY ==========
  const tableQuality = useMemo(() => {
    if (normalizedTables.length === 0) return { homogeneous: 0, mixed: 0, conflict: 0, warnings: [] };

    let homogeneous = 0;
    let mixed = 0;
    let conflict = 0;
    const warnings: string[] = [];

    normalizedTables.forEach((table, idx) => {
      if (!Array.isArray(table)) return;
      
      const ageRanges = new Set<string>();
      table.forEach((member: any) => {
        const p = participants.find(pp => pp.id === member.id);
        if (p?.age_range) {
          ageRanges.add(normalizeAgeRange(p.age_range));
        }
      });

      const uniqueRanges = ageRanges.size;
      
      if (uniqueRanges <= 1) {
        homogeneous++;
      } else if (uniqueRanges === 2) {
        mixed++;
      } else {
        conflict++;
        warnings.push(`Mesa ${idx + 1}: ${uniqueRanges} franjas de edad diferentes`);
      }

      if (table.length < 3) {
        warnings.push(`Mesa ${idx + 1}: Solo ${table.length} participantes`);
      }
    });

    return { homogeneous, mixed, conflict, warnings };
  }, [normalizedTables, participants]);

  return (
    <div className="space-y-8">
      {/* ========== BLOQUE A: INSCRIPCIONES ========== */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Inscripciones</h2>
        </div>

        {/* Métricas principales de inscripción */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{inscriptionStats.total}</div>
                  <div className="text-sm text-muted-foreground">Participantes</div>
                </div>
                <Users className="w-8 h-8 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-600">{inscriptionStats.checkedIn}</div>
                  <div className="text-sm text-muted-foreground">Check-in ({inscriptionStats.checkinRate}%)</div>
                </div>
                <UserCheck className="w-8 h-8 text-green-600/50" />
              </div>
            </CardContent>
          </Card>

          <Card className={inscriptionStats.noShows > 0 ? "border-amber-200 bg-amber-50/50" : ""}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-amber-600">{inscriptionStats.noShows}</div>
                  <div className="text-sm text-muted-foreground">No-shows ({inscriptionStats.noShowRate}%)</div>
                </div>
                <UserX className="w-8 h-8 text-amber-600/50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{matchStats.submitted}</div>
                  <div className="text-sm text-muted-foreground">Enviaron selecciones</div>
                </div>
                <Target className="w-8 h-8 text-blue-600/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos de distribución de inscripción */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Distribución por Género - PieChart grande con leyenda */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-0 bg-gradient-to-r from-pink-50 to-blue-50">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Distribución por Género
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {inscriptionStats.genderData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={inscriptionStats.genderData}
                      cx="50%"
                      cy="45%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={2}
                      stroke="#fff"
                    >
                      {inscriptionStats.genderData.map((entry) => (
                        <Cell 
                          key={`cell-${entry.name}`} 
                          fill={GENDER_COLORS[entry.name] || "#94a3b8"} 
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [`${value} participantes`, '']}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      formatter={(value, entry: any) => (
                        <span className="text-sm font-medium">
                          {value} ({entry.payload?.value})
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                  Sin datos de género
                </div>
              )}
            </CardContent>
          </Card>

          {/* Distribución por Edad - BarChart horizontal con gradientes */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-0 bg-gradient-to-r from-purple-50 to-indigo-50">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-600" />
                Distribución por Edad
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {inscriptionStats.ageData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart 
                    data={inscriptionStats.ageData} 
                    layout="vertical"
                    margin={{ left: 10, right: 30 }}
                  >
                    <XAxis 
                      type="number" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#64748b' }}
                    />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      width={65} 
                      tick={{ fontSize: 13, fontWeight: 500, fill: '#334155' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      formatter={(value: number) => [`${value} participantes`, '']}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      cursor={{ fill: 'rgba(139, 92, 246, 0.1)' }}
                    />
                    <Bar 
                      dataKey="value" 
                      radius={[0, 8, 8, 0]}
                      barSize={24}
                    >
                      {inscriptionStats.ageData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={AGE_COLORS[index % AGE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                  Sin datos de edad
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ========== BLOQUE B: MATCHES ========== */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b">
          <Heart className="w-5 h-5 text-pink-500" />
          <h2 className="text-lg font-semibold">Matches</h2>
        </div>

        {/* Métricas principales de matches */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-pink-600">{matchStats.totalMatches}</div>
                  <div className="text-sm text-muted-foreground">Total Matches</div>
                </div>
                <Heart className="w-8 h-8 text-pink-600/50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-purple-600">{matchStats.matchRate}%</div>
                  <div className="text-sm text-muted-foreground">Tasa de Match</div>
                </div>
                <Percent className="w-8 h-8 text-purple-600/50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-emerald-600">{matchStats.withMatchCount}</div>
                  <div className="text-sm text-muted-foreground">Con al menos 1 match</div>
                </div>
                <TrendingUp className="w-8 h-8 text-emerald-600/50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-cyan-600">{matchStats.avgMatchesPerPerson}</div>
                  <div className="text-sm text-muted-foreground">Promedio por persona</div>
                </div>
                <BarChart3 className="w-8 h-8 text-cyan-600/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detalles de matches */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tipos de Match - PieChart mejorado */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-0 bg-gradient-to-r from-pink-50 to-purple-50">
              <CardTitle className="text-lg flex items-center gap-2">
                <Heart className="w-5 h-5 text-pink-500" />
                Tipos de Match
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {matchStats.matchTypeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={matchStats.matchTypeData}
                      cx="50%"
                      cy="45%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                      strokeWidth={2}
                      stroke="#fff"
                    >
                      {matchStats.matchTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [`${value} matches`, '']}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      formatter={(value, entry: any) => (
                        <span className="text-sm font-medium">
                          {value} ({entry.payload?.value})
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-muted-foreground">
                  Sin matches todavía
                </div>
              )}
            </CardContent>
          </Card>

          {/* Más Seleccionados */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                Más Seleccionados
              </CardTitle>
            </CardHeader>
            <CardContent>
              {matchStats.topSelected.length > 0 ? (
                <div className="space-y-2">
                  {matchStats.topSelected.map((item, idx) => (
                    <div key={item.participant?.id} className="flex items-center justify-between">
                      <span className="text-sm truncate flex-1">
                        {idx === 0 && "🥇 "}
                        {idx === 1 && "🥈 "}
                        {idx === 2 && "🥉 "}
                        {item.participant?.name}
                      </span>
                      <Badge variant="secondary">{item.count}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-[120px] flex items-center justify-center text-muted-foreground text-sm">
                  Sin selecciones todavía
                </div>
              )}
            </CardContent>
          </Card>

          {/* Más Matches */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Heart className="w-4 h-4 text-pink-500" />
                Más Matches
              </CardTitle>
            </CardHeader>
            <CardContent>
              {matchStats.topMatches.length > 0 ? (
                <div className="space-y-2">
                  {matchStats.topMatches.map((item, idx) => (
                    <div key={item.participant?.id} className="flex items-center justify-between">
                      <span className="text-sm truncate flex-1">
                        {idx === 0 && "🥇 "}
                        {idx === 1 && "🥈 "}
                        {idx === 2 && "🥉 "}
                        {item.participant?.name}
                      </span>
                      <Badge className="bg-pink-100 text-pink-700 hover:bg-pink-100">{item.count}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-[120px] flex items-center justify-center text-muted-foreground text-sm">
                  Sin matches todavía
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Mesas con más matches */}
        {tablesWithMatches.length > 0 && (
          <Card className="overflow-hidden">
            <CardHeader className="pb-2 bg-gradient-to-r from-emerald-50 to-teal-50">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="w-4 h-4 text-emerald-600" />
                Mesas con más Matches
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                {tablesWithMatches.map((table, idx) => (
                  <div key={table.tableNum} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {idx === 0 && "🥇 "}
                        {idx === 1 && "🥈 "}
                        {idx === 2 && "🥉 "}
                        Mesa {table.tableNum}
                      </span>
                      <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {table.members.slice(0, 3).join(", ")}
                        {table.members.length > 3 && ` +${table.members.length - 3}`}
                      </span>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                      {table.matchCount} {table.matchCount === 1 ? 'match' : 'matches'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Análisis de calidad de mesas */}
        {normalizedTables.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Calidad de Mesas
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Análisis de homogeneidad por rango de edad
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{tableQuality.homogeneous}</div>
                  <div className="text-xs text-muted-foreground">Homogéneas</div>
                </div>
                <div className="text-center p-3 bg-amber-50 rounded-lg">
                  <div className="text-2xl font-bold text-amber-600">{tableQuality.mixed}</div>
                  <div className="text-xs text-muted-foreground">Mixtas (2 edades)</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{tableQuality.conflict}</div>
                  <div className="text-xs text-muted-foreground">Con conflicto</div>
                </div>
              </div>

              {tableQuality.warnings.length > 0 && (
                <div className="space-y-2">
                  {tableQuality.warnings.slice(0, 3).map((warning, idx) => (
                    <Alert key={idx} variant="destructive" className="py-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-sm">{warning}</AlertDescription>
                    </Alert>
                  ))}
                  {tableQuality.warnings.length > 3 && (
                    <p className="text-sm text-muted-foreground text-center">
                      y {tableQuality.warnings.length - 3} alertas más...
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default EventAnalytics;
