import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, UserCheck, Send, Heart, Handshake, TrendingUp, AlertCircle, Target, Percent, Award, Table2 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";

interface DbParticipant {
  id: string;
  name: string;
  email: string | null;
  age: number | null;
  age_range: string | null;
  preferred_age_range: string | null;
  preference: string | null;
  dating_preference: string | null;
  gender: string | null;
  phone: string | null;
  checked_in: boolean;
  selection_submitted_at?: string | null;
}

interface Match {
  participant1: DbParticipant;
  participant2: DbParticipant;
  matchTypes: {
    friendship: boolean;
    dating: boolean;
  };
}

interface Selection {
  selector_id: string;
  selected_id: string;
  selection_type: string | null;
}

interface EventAnalyticsProps {
  participants: DbParticipant[];
  tables: any[];
  matches: Match[];
  selections: Selection[];
  eventStatus: "pending" | "active" | "completed";
}

const AGE_RANGE_ORDER = ["18-24", "25-32", "33-40", "41-50", "50+", "51-60", "60+"];

const normalizeAgeRange = (ageRange: string | null): string => {
  if (!ageRange) return "Sin especificar";
  return ageRange.replace(/–/g, "-").replace("+ 50", "50+").replace("+50", "50+").trim();
};

const COLORS = {
  age: ["#a855f7", "#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#f97316", "#dc2626"],
  gender: ["#ec4899", "#3b82f6", "#8b5cf6", "#6b7280"],
  preference: ["#3b82f6", "#ec4899", "#8b5cf6"],
  matchType: ["#ec4899", "#3b82f6", "#8b5cf6"],
};

const EventAnalytics = ({ participants, tables, matches, selections, eventStatus }: EventAnalyticsProps) => {
  const stats = useMemo(() => {
    const total = participants.length;
    const checkedIn = participants.filter(p => p.checked_in).length;
    const submitted = participants.filter(p => p.selection_submitted_at).length;
    
    // Distribution by age
    const byAge: Record<string, number> = {};
    participants.forEach(p => {
      const range = normalizeAgeRange(p.age_range);
      byAge[range] = (byAge[range] || 0) + 1;
    });
    
    // Distribution by gender
    const byGender: Record<string, number> = {};
    participants.forEach(p => {
      const gender = p.gender || "Sin especificar";
      byGender[gender] = (byGender[gender] || 0) + 1;
    });
    
    // Distribution by preference
    const byPreference: Record<string, number> = {};
    participants.forEach(p => {
      const pref = p.preference?.toLowerCase() || "";
      let category = "Sin especificar";
      if (pref.includes("ligue") || pref.includes("pareja") || pref.includes("sentimental")) {
        category = "Romance";
      } else if (pref.includes("amistad")) {
        category = "Amistad";
      }
      byPreference[category] = (byPreference[category] || 0) + 1;
    });
    
    // Match statistics
    const totalMatches = matches.length;
    const datingMatches = matches.filter(m => m.matchTypes.dating).length;
    const friendshipMatches = matches.filter(m => m.matchTypes.friendship).length;
    const bothMatches = matches.filter(m => m.matchTypes.dating && m.matchTypes.friendship).length;
    
    // Participants with at least one match
    const participantsWithMatch = new Set<string>();
    matches.forEach(m => {
      participantsWithMatch.add(m.participant1.id);
      participantsWithMatch.add(m.participant2.id);
    });
    
    // Match rate calculation
    const totalSelections = selections.length;
    const matchedSelections = matches.length * 2; // Each match represents 2 mutual selections
    const matchRate = totalSelections > 0 ? (matchedSelections / totalSelections * 100) : 0;
    
    // Average matches per person who submitted
    const avgMatchesPerPerson = submitted > 0 ? (totalMatches * 2 / submitted) : 0;
    
    // Top selected participants
    const selectionCounts: Record<string, number> = {};
    selections.forEach(s => {
      selectionCounts[s.selected_id] = (selectionCounts[s.selected_id] || 0) + 1;
    });
    const topSelected = Object.entries(selectionCounts)
      .map(([id, count]) => {
        const p = participants.find(pp => pp.id === id);
        return { name: p?.name || "Desconocido", count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    // Top matches
    const matchCounts: Record<string, number> = {};
    matches.forEach(m => {
      matchCounts[m.participant1.id] = (matchCounts[m.participant1.id] || 0) + 1;
      matchCounts[m.participant2.id] = (matchCounts[m.participant2.id] || 0) + 1;
    });
    const topMatches = Object.entries(matchCounts)
      .map(([id, count]) => {
        const p = participants.find(pp => pp.id === id);
        return { name: p?.name || "Desconocido", count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    return {
      total,
      checkedIn,
      checkedInRate: total > 0 ? (checkedIn / total * 100).toFixed(1) : "0",
      submitted,
      submissionRate: checkedIn > 0 ? (submitted / checkedIn * 100).toFixed(1) : "0",
      totalMatches,
      matchRate: matchRate.toFixed(1),
      participantsWithMatch: participantsWithMatch.size,
      withMatchRate: submitted > 0 ? (participantsWithMatch.size / submitted * 100).toFixed(1) : "0",
      avgMatchesPerPerson: avgMatchesPerPerson.toFixed(2),
      datingMatches,
      friendshipMatches,
      bothMatches,
      byAge,
      byGender,
      byPreference,
      topSelected,
      topMatches,
    };
  }, [participants, matches, selections]);

  // Table quality analysis
  const tableAnalysis = useMemo(() => {
    if (!tables || tables.length === 0) return { warnings: [], quality: { homogeneous: 0, mixed: 0, conflict: 0 } };
    
    const currentRoundTables = tables[0]?.tables || [];
    const warnings: { tableIdx: number; issues: string[] }[] = [];
    let homogeneous = 0;
    let mixed = 0;
    let conflict = 0;
    
    currentRoundTables.forEach((table: any[], idx: number) => {
      const issues: string[] = [];
      const ageRanges = table.map(m => {
        const p = participants.find(pp => pp.id === m.id);
        return normalizeAgeRange(p?.age_range);
      });
      const uniqueAges = [...new Set(ageRanges.filter(a => a !== "Sin especificar"))];
      
      if (table.length < 3 && table.length > 0) {
        issues.push(`Solo ${table.length} personas`);
      }
      
      if (uniqueAges.length > 2) {
        issues.push(`${uniqueAges.length} franjas de edad diferentes`);
        conflict++;
      } else if (uniqueAges.length === 2) {
        // Check if they're adjacent
        const idx1 = AGE_RANGE_ORDER.indexOf(uniqueAges[0]);
        const idx2 = AGE_RANGE_ORDER.indexOf(uniqueAges[1]);
        if (Math.abs(idx1 - idx2) <= 1) {
          mixed++;
        } else {
          issues.push(`Franjas no adyacentes: ${uniqueAges.join(", ")}`);
          conflict++;
        }
      } else {
        homogeneous++;
      }
      
      // Detect outliers
      const ageIndices = ageRanges.map(a => AGE_RANGE_ORDER.indexOf(a)).filter(i => i >= 0);
      if (ageIndices.length > 0) {
        const avgIdx = ageIndices.reduce((a, b) => a + b, 0) / ageIndices.length;
        ageIndices.forEach((idx, i) => {
          if (Math.abs(idx - avgIdx) >= 2) {
            const p = participants.find(pp => pp.id === table[i]?.id);
            if (p && !issues.some(issue => issue.includes(p.name))) {
              issues.push(`${p.name} está en franja diferente al resto`);
            }
          }
        });
      }
      
      if (issues.length > 0) {
        warnings.push({ tableIdx: idx + 1, issues });
      }
    });
    
    return { warnings, quality: { homogeneous, mixed, conflict } };
  }, [tables, participants]);

  const ageChartData = Object.entries(stats.byAge)
    .filter(([name]) => name !== "Sin especificar" || stats.byAge[name] > 0)
    .map(([name, value]) => ({ name, value }));
  
  const genderChartData = Object.entries(stats.byGender).map(([name, value]) => ({ name, value }));
  const preferenceChartData = Object.entries(stats.byPreference).map(([name, value]) => ({ name, value }));
  
  const matchTypeData = [
    { name: "Romance", value: stats.datingMatches - stats.bothMatches },
    { name: "Amistad", value: stats.friendshipMatches - stats.bothMatches },
    { name: "Ambos", value: stats.bothMatches },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Main Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Participantes</span>
            </div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <UserCheck className="w-4 h-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Check-in</span>
            </div>
            <div className="text-2xl font-bold text-green-600">{stats.checkedInRate}%</div>
            <div className="text-xs text-muted-foreground">{stats.checkedIn} de {stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Send className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Selecciones</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">{stats.submissionRate}%</div>
            <div className="text-xs text-muted-foreground">{stats.submitted} enviaron</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Heart className="w-4 h-4 text-pink-500" />
              <span className="text-xs text-muted-foreground">Total Matches</span>
            </div>
            <div className="text-2xl font-bold text-pink-600">{stats.totalMatches}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Percent className="w-4 h-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">Tasa Match</span>
            </div>
            <div className="text-2xl font-bold text-purple-600">{stats.matchRate}%</div>
            <div className="text-xs text-muted-foreground">de selecciones</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">Con Match</span>
            </div>
            <div className="text-2xl font-bold text-amber-600">{stats.withMatchRate}%</div>
            <div className="text-xs text-muted-foreground">{stats.participantsWithMatch} personas</div>
          </CardContent>
        </Card>
      </div>

      {/* Match Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Matches Romance</div>
                <div className="text-xl font-bold text-pink-600">{stats.datingMatches}</div>
              </div>
              <Heart className="w-8 h-8 text-pink-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Matches Amistad</div>
                <div className="text-xl font-bold text-blue-600">{stats.friendshipMatches}</div>
              </div>
              <Handshake className="w-8 h-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Promedio por Persona</div>
                <div className="text-xl font-bold text-purple-600">{stats.avgMatchesPerPerson}</div>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Por Edad</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={ageChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {ageChartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS.age[index % COLORS.age.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Por Género</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={genderChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {genderChartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={
                        entry.name === "Mujer" ? "#ec4899" : 
                        entry.name === "Hombre" ? "#3b82f6" : 
                        entry.name === "No binario" ? "#8b5cf6" : "#6b7280"
                      } 
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Por Interés</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={preferenceChartData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" radius={4}>
                  {preferenceChartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={
                        entry.name === "Romance" ? "#ec4899" : 
                        entry.name === "Amistad" ? "#3b82f6" : "#6b7280"
                      } 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        {matchTypeData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Tipos de Match</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={matchTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {matchTypeData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS.matchType[index % COLORS.matchType.length]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Top Participants */}
      {(stats.topSelected.length > 0 || stats.topMatches.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stats.topSelected.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  Más Seleccionados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.topSelected.map((p, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-sm">{idx + 1}. {p.name}</span>
                      <Badge variant="secondary">{p.count} selecciones</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          {stats.topMatches.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Heart className="w-4 h-4 text-pink-500" />
                  Más Matches
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.topMatches.map((p, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-sm">{idx + 1}. {p.name}</span>
                      <Badge className="bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300">
                        {p.count} matches
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Table Quality Analysis */}
      {tables && tables.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Table2 className="w-4 h-4" />
              Análisis de Calidad de Mesas (Ronda 1)
            </CardTitle>
            <CardDescription>Evaluación de la distribución por franjas de edad</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                <div className="text-2xl font-bold text-green-600">{tableAnalysis.quality.homogeneous}</div>
                <div className="text-xs text-muted-foreground">Mesas Homogéneas</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                <div className="text-2xl font-bold text-amber-600">{tableAnalysis.quality.mixed}</div>
                <div className="text-xs text-muted-foreground">Mesas Mixtas</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
                <div className="text-2xl font-bold text-red-600">{tableAnalysis.quality.conflict}</div>
                <div className="text-xs text-muted-foreground">Con Conflicto</div>
              </div>
            </div>
            
            {tableAnalysis.warnings.length === 0 ? (
              <p className="text-green-600 text-sm flex items-center gap-2">
                <span className="text-lg">✓</span> Todas las mesas tienen buena distribución de edades
              </p>
            ) : (
              <div className="space-y-2">
                {tableAnalysis.warnings.slice(0, 5).map(({ tableIdx, issues }) => (
                  <Alert key={tableIdx} variant="destructive" className="py-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      <strong>Mesa {tableIdx}:</strong> {issues.join(", ")}
                    </AlertDescription>
                  </Alert>
                ))}
                {tableAnalysis.warnings.length > 5 && (
                  <p className="text-xs text-muted-foreground">
                    ...y {tableAnalysis.warnings.length - 5} mesas más con alertas
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EventAnalytics;
