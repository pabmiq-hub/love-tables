import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatAnonymousName } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Heart, 
  Users, 
  Sparkles, 
  ChevronDown, 
  Copy, 
  Check, 
  QrCode,
  User,
  Phone,
  RefreshCw,
  Building2,
  Briefcase,
  Handshake
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DbParticipant {
  id: string;
  name: string;
  age: number | null;
  age_range: string | null;
  preferred_age_range: string | null;
  preference: string | null;
  dating_preference: string | null;
  gender: string | null;
  phone: string | null;
  checked_in: boolean;
  // Professional fields
  company_name?: string | null;
  entity_type?: "client" | "provider" | null;
  sector?: string | null;
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

interface MatchesDashboardProps {
  matches: Match[];
  selections: Selection[];
  participants: DbParticipant[];
  eventName: string;
  eventStatus: string;
  onShowQR: () => void;
  onRefresh: () => void;
  isProfessional?: boolean;
}

type ViewMode = "byMatch" | "byParticipant";
type MatchType = "dating" | "friendship" | "both";

interface ParticipantMatches {
  participant: DbParticipant;
  matches: Array<{
    otherParticipant: DbParticipant;
    matchType: MatchType;
  }>;
}

const MatchesDashboard = ({ matches, selections, participants, eventName, eventStatus, onShowQR, onRefresh, isProfessional = false }: MatchesDashboardProps) => {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>("byMatch");
  const [copied, setCopied] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    dating: true,
    friendship: true,
    both: true,
    professional: true,
  });
  const [openParticipants, setOpenParticipants] = useState<Record<string, boolean>>({});

  // Calculate statistics
  const stats = {
    dating: matches.filter(m => m.matchTypes.dating && !m.matchTypes.friendship).length,
    friendship: matches.filter(m => m.matchTypes.friendship && !m.matchTypes.dating).length,
    both: matches.filter(m => m.matchTypes.dating && m.matchTypes.friendship).length,
    total: matches.length,
  };

  // Get unique participants with matches
  const uniqueParticipants = new Set<string>();
  matches.forEach(m => {
    uniqueParticipants.add(m.participant1.id);
    uniqueParticipants.add(m.participant2.id);
  });
  const participantsWithMatches = uniqueParticipants.size;

  // Group matches by type
  const getMatchType = (match: Match): MatchType => {
    if (match.matchTypes.dating && match.matchTypes.friendship) return "both";
    if (match.matchTypes.dating) return "dating";
    return "friendship";
  };

  const groupedMatches = {
    dating: matches.filter(m => getMatchType(m) === "dating"),
    friendship: matches.filter(m => getMatchType(m) === "friendship"),
    both: matches.filter(m => getMatchType(m) === "both"),
  };

  // Build participant view data
  const buildParticipantMatches = (): ParticipantMatches[] => {
    const participantMap = new Map<string, ParticipantMatches>();

    matches.forEach(match => {
      const matchType = getMatchType(match);

      // Add match for participant1
      if (!participantMap.has(match.participant1.id)) {
        participantMap.set(match.participant1.id, {
          participant: match.participant1,
          matches: [],
        });
      }
      participantMap.get(match.participant1.id)!.matches.push({
        otherParticipant: match.participant2,
        matchType,
      });

      // Add match for participant2
      if (!participantMap.has(match.participant2.id)) {
        participantMap.set(match.participant2.id, {
          participant: match.participant2,
          matches: [],
        });
      }
      participantMap.get(match.participant2.id)!.matches.push({
        otherParticipant: match.participant1,
        matchType,
      });
    });

    return Array.from(participantMap.values()).sort((a, b) => 
      a.participant.name.localeCompare(b.participant.name)
    );
  };

  const participantMatches = buildParticipantMatches();

  // Copy all matches to clipboard
  const handleCopyMatches = async () => {
    const lines: string[] = [isProfessional ? `CONEXIONES PROFESIONALES - ${eventName}` : `MATCHES - ${eventName}`, ""];

    if (isProfessional) {
      // Professional format
      lines.push("🤝 CONEXIONES:");
      matches.forEach(m => {
        const p1Company = m.participant1.company_name || m.participant1.name;
        const p2Company = m.participant2.company_name || m.participant2.name;
        const p1Sector = m.participant1.sector || "";
        const p2Sector = m.participant2.sector || "";
        lines.push(`  ${p1Company} (${p1Sector}) ↔ ${p2Company} (${p2Sector})`);
        lines.push(`    Contacto: ${m.participant1.name} - ${m.participant1.phone || "N/A"}`);
        lines.push(`    Contacto: ${m.participant2.name} - ${m.participant2.phone || "N/A"}`);
        lines.push("");
      });
    } else {
      // Social format
      if (groupedMatches.both.length > 0) {
        lines.push("💕😊 CONEXIONES COMPLETAS:");
        groupedMatches.both.forEach(m => {
          lines.push(`  ${formatAnonymousName(m.participant1.name, m.participant1.phone || undefined)} ↔ ${formatAnonymousName(m.participant2.name, m.participant2.phone || undefined)}`);
        });
        lines.push("");
      }

      if (groupedMatches.dating.length > 0) {
        lines.push("💕 LIGUES:");
        groupedMatches.dating.forEach(m => {
          lines.push(`  ${formatAnonymousName(m.participant1.name, m.participant1.phone || undefined)} ↔ ${formatAnonymousName(m.participant2.name, m.participant2.phone || undefined)}`);
        });
        lines.push("");
      }

      if (groupedMatches.friendship.length > 0) {
        lines.push("😊 AMISTADES:");
        groupedMatches.friendship.forEach(m => {
          lines.push(`  ${formatAnonymousName(m.participant1.name, m.participant1.phone || undefined)} ↔ ${formatAnonymousName(m.participant2.name, m.participant2.phone || undefined)}`);
        });
      }
    }

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      toast({
        title: "Copiado al portapapeles",
        description: isProfessional ? `${matches.length} conexiones copiadas` : `${matches.length} matches copiados`,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Error al copiar",
        description: "No se pudo copiar al portapapeles",
        variant: "destructive",
      });
    }
  };

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleParticipant = (id: string) => {
    setOpenParticipants(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Count participants who have submitted selections
  const participantsWhoVoted = new Set(selections.map(s => s.selector_id)).size;

  const getMatchTypeIcon = (type: MatchType) => {
    switch (type) {
      case "dating": return <Heart className="w-4 h-4" />;
      case "friendship": return <Users className="w-4 h-4" />;
      case "both": return <Sparkles className="w-4 h-4" />;
    }
  };

  const getMatchTypeLabel = (type: MatchType) => {
    switch (type) {
      case "dating": return "Ligue 💕";
      case "friendship": return "Amistad 😊";
      case "both": return "Ligue + Amistad 💕😊";
    }
  };

  const getMatchTypeBadgeStyle = (type: MatchType) => {
    switch (type) {
      case "dating": return "bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300 border-pink-200 dark:border-pink-800";
      case "friendship": return "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      case "both": return "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800";
    }
  };

  const getSectionStyle = (type: MatchType) => {
    switch (type) {
      case "dating": return "bg-pink-50/50 dark:bg-pink-950/20 border-pink-200 dark:border-pink-900";
      case "friendship": return "bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900";
      case "both": return "bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900";
    }
  };

  // Empty state
  if (matches.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{isProfessional ? "Conexiones Profesionales" : "Coincidencias"}</CardTitle>
          <CardDescription>
            {isProfessional ? "Conexiones de networking entre empresas" : "Matches mutuos entre participantes"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              {isProfessional ? (
                <Handshake className="w-8 h-8 text-muted-foreground" />
              ) : (
                <Heart className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            <h3 className="font-display text-lg font-semibold mb-2">
              {isProfessional ? "Sin conexiones todavía" : "Sin matches todavía"}
            </h3>
            <p className="text-muted-foreground">
              {isProfessional
                ? eventStatus === "completed" 
                  ? "Las conexiones se generan automáticamente en eventos profesionales"
                  : "Finaliza el evento para ver las conexiones entre participantes"
                : eventStatus === "completed" 
                  ? "Espera a que los participantes voten usando el código QR"
                  : "Finaliza el evento y comparte el código QR para que los participantes voten"
              }
            </p>
            <div className="flex gap-2 justify-center mt-4">
              <Button variant="outline" onClick={onRefresh}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Actualizar
              </Button>
              {eventStatus === "completed" && !isProfessional && (
                <Button variant="default" onClick={onShowQR}>
                  <QrCode className="w-4 h-4 mr-2" />
                  QR Selección
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold">
            {isProfessional ? "Conexiones Profesionales" : "Coincidencias"}
          </h2>
          <p className="text-muted-foreground">
            {isProfessional 
              ? `${matches.length} conexiones de networking encontradas`
              : `${matches.length} matches mutuos encontrados`
            }
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopyMatches}>
            {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
            {copied ? "Copiado" : "Copiar todo"}
          </Button>
          {eventStatus === "completed" && !isProfessional && (
            <Button variant="default" size="sm" onClick={onShowQR}>
              <QrCode className="w-4 h-4 mr-2" />
              QR Selección
            </Button>
          )}
        </div>
      </div>

      {/* Statistics Cards - Different for Professional vs Social */}
      {isProfessional ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
            <CardContent className="p-4 text-center">
              <Handshake className="w-6 h-6 mx-auto mb-2 text-emerald-500" />
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{matches.length}</div>
              <div className="text-xs text-emerald-600 dark:text-emerald-400">Conexiones</div>
            </CardContent>
          </Card>
          <Card className="bg-sky-50/50 dark:bg-sky-950/20 border-sky-200 dark:border-sky-800">
            <CardContent className="p-4 text-center">
              <Building2 className="w-6 h-6 mx-auto mb-2 text-sky-500" />
              <div className="text-2xl font-bold text-sky-700 dark:text-sky-300">{participantsWithMatches}</div>
              <div className="text-xs text-sky-600 dark:text-sky-400">Empresas conectadas</div>
            </CardContent>
          </Card>
          <Card className="bg-muted/50 border-border">
            <CardContent className="p-4 text-center">
              <Briefcase className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
              <div className="text-2xl font-bold">{participants.length}</div>
              <div className="text-xs text-muted-foreground">Total participantes</div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-pink-50/50 dark:bg-pink-950/20 border-pink-200 dark:border-pink-800">
            <CardContent className="p-4 text-center">
              <Heart className="w-6 h-6 mx-auto mb-2 text-pink-500" />
              <div className="text-2xl font-bold text-pink-700 dark:text-pink-300">{stats.dating}</div>
              <div className="text-xs text-pink-600 dark:text-pink-400">Ligues</div>
            </CardContent>
          </Card>
          <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4 text-center">
              <Users className="w-6 h-6 mx-auto mb-2 text-blue-500" />
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.friendship}</div>
              <div className="text-xs text-blue-600 dark:text-blue-400">Amistades</div>
            </CardContent>
          </Card>
          <Card className="bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800">
            <CardContent className="p-4 text-center">
              <Sparkles className="w-6 h-6 mx-auto mb-2 text-purple-500" />
              <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">{stats.both}</div>
              <div className="text-xs text-purple-600 dark:text-purple-400">Ambos</div>
            </CardContent>
          </Card>
          <Card className="bg-muted/50 border-border">
            <CardContent className="p-4 text-center">
              <User className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
              <div className="text-2xl font-bold">{participantsWithMatches}</div>
              <div className="text-xs text-muted-foreground">Con match</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* View Mode Toggle - Only for Social mode */}
      {!isProfessional && (
        <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit flex-wrap">
          <Button
            variant={viewMode === "byMatch" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("byMatch")}
          >
            Por tipo de match
          </Button>
          <Button
            variant={viewMode === "byParticipant" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("byParticipant")}
          >
            Por participante
          </Button>
        </div>
      )}

      {/* Professional Mode - Simple list of connections */}
      {isProfessional && (
        <div className="space-y-4">
          <Collapsible open={openSections.professional} onOpenChange={() => toggleSection("professional")}>
            <Card className="bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-background/50 transition-colors rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Handshake className="w-5 h-5 text-emerald-500" />
                      <CardTitle className="text-lg">Conexiones de Networking 🤝</CardTitle>
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
                        {matches.length}
                      </Badge>
                    </div>
                    <ChevronDown className={`w-5 h-5 transition-transform ${openSections.professional ? "rotate-180" : ""}`} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="grid gap-3">
                    {matches.map((match, index) => (
                      <ProfessionalMatchCard key={index} match={match} />
                    ))}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>
      )}
      {/* View by Match Type - Social mode only */}
      {!isProfessional && viewMode === "byMatch" && (
        <div className="space-y-4">
          {/* Both (Dating + Friendship) */}
          {groupedMatches.both.length > 0 && (
            <Collapsible open={openSections.both} onOpenChange={() => toggleSection("both")}>
              <Card className={getSectionStyle("both")}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-background/50 transition-colors rounded-t-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Sparkles className="w-5 h-5 text-purple-500" />
                        <CardTitle className="text-lg">Conexiones Completas 💕😊</CardTitle>
                        <Badge variant="secondary" className={getMatchTypeBadgeStyle("both")}>
                          {groupedMatches.both.length}
                        </Badge>
                      </div>
                      <ChevronDown className={`w-5 h-5 transition-transform ${openSections.both ? "rotate-180" : ""}`} />
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="grid gap-3">
                      {groupedMatches.both.map((match, index) => (
                        <MatchCard key={index} match={match} matchType="both" />
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          {/* Dating Only */}
          {groupedMatches.dating.length > 0 && (
            <Collapsible open={openSections.dating} onOpenChange={() => toggleSection("dating")}>
              <Card className={getSectionStyle("dating")}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-background/50 transition-colors rounded-t-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Heart className="w-5 h-5 text-pink-500" />
                        <CardTitle className="text-lg">Ligues 💕</CardTitle>
                        <Badge variant="secondary" className={getMatchTypeBadgeStyle("dating")}>
                          {groupedMatches.dating.length}
                        </Badge>
                      </div>
                      <ChevronDown className={`w-5 h-5 transition-transform ${openSections.dating ? "rotate-180" : ""}`} />
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="grid gap-3">
                      {groupedMatches.dating.map((match, index) => (
                        <MatchCard key={index} match={match} matchType="dating" />
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          {/* Friendship Only */}
          {groupedMatches.friendship.length > 0 && (
            <Collapsible open={openSections.friendship} onOpenChange={() => toggleSection("friendship")}>
              <Card className={getSectionStyle("friendship")}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-background/50 transition-colors rounded-t-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-blue-500" />
                        <CardTitle className="text-lg">Amistades 😊</CardTitle>
                        <Badge variant="secondary" className={getMatchTypeBadgeStyle("friendship")}>
                          {groupedMatches.friendship.length}
                        </Badge>
                      </div>
                      <ChevronDown className={`w-5 h-5 transition-transform ${openSections.friendship ? "rotate-180" : ""}`} />
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="grid gap-3">
                      {groupedMatches.friendship.map((match, index) => (
                        <MatchCard key={index} match={match} matchType="friendship" />
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}
        </div>
      )}

      {/* View by Participant - Social mode only */}
      {!isProfessional && viewMode === "byParticipant" && (
        <div className="space-y-3">
          {participantMatches.map((pm) => (
            <Collapsible
              key={pm.participant.id}
              open={openParticipants[pm.participant.id]}
              onOpenChange={() => toggleParticipant(pm.participant.id)}
            >
              <Card className="overflow-hidden">
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10 bg-gradient-to-br from-primary to-primary/60">
                          <AvatarFallback className="bg-transparent text-primary-foreground font-medium">
                            {pm.participant.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{pm.participant.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {pm.matches.length} {pm.matches.length === 1 ? "match" : "matches"}
                            {pm.participant.phone && (
                              <span className="ml-2 text-primary">
                                <Phone className="w-3 h-3 inline mr-1" />
                                {pm.participant.phone}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          {pm.matches.some(m => m.matchType === "dating" || m.matchType === "both") && (
                            <Badge variant="secondary" className={getMatchTypeBadgeStyle("dating")}>💕</Badge>
                          )}
                          {pm.matches.some(m => m.matchType === "friendship" || m.matchType === "both") && (
                            <Badge variant="secondary" className={getMatchTypeBadgeStyle("friendship")}>😊</Badge>
                          )}
                        </div>
                        <ChevronDown className={`w-5 h-5 transition-transform ${openParticipants[pm.participant.id] ? "rotate-180" : ""}`} />
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 pb-4">
                    <div className="space-y-2 pl-13">
                      {pm.matches.map((matchInfo, index) => (
                        <div 
                          key={index}
                          className={`flex items-center justify-between p-3 rounded-lg border ${getSectionStyle(matchInfo.matchType)}`}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                                {matchInfo.otherParticipant.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">{matchInfo.otherParticipant.name}</p>
                              <Badge variant="secondary" className={`text-xs ${getMatchTypeBadgeStyle(matchInfo.matchType)}`}>
                                {getMatchTypeLabel(matchInfo.matchType)}
                              </Badge>
                            </div>
                          </div>
                          {matchInfo.otherParticipant.phone && (
                            <a 
                              href={`tel:${matchInfo.otherParticipant.phone}`}
                              className="flex items-center gap-1 text-sm text-primary hover:underline"
                            >
                              <Phone className="w-3 h-3" />
                              {matchInfo.otherParticipant.phone}
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      )}

    </div>
  );
};

// Match Card Component
const MatchCard = ({ match, matchType }: { match: Match; matchType: MatchType }) => {
  const getAvatarGradient = (type: MatchType) => {
    switch (type) {
      case "dating": return "from-pink-400 to-rose-500";
      case "friendship": return "from-blue-400 to-cyan-500";
      case "both": return "from-purple-400 to-pink-500";
    }
  };

  const getIconBg = (type: MatchType) => {
    switch (type) {
      case "dating": return "bg-pink-100 dark:bg-pink-900/50";
      case "friendship": return "bg-blue-100 dark:bg-blue-900/50";
      case "both": return "bg-purple-100 dark:bg-purple-900/50";
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl bg-background/80 border border-border/50 hover:shadow-md transition-shadow animate-fade-in">
      {/* Avatars with heart/connection icon */}
      <div className="flex items-center gap-2">
        <Avatar className={`w-12 h-12 bg-gradient-to-br ${getAvatarGradient(matchType)} ring-2 ring-background`}>
          <AvatarFallback className="bg-transparent text-white font-semibold">
            {match.participant1.name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getIconBg(matchType)}`}>
          {matchType === "dating" && <Heart className="w-4 h-4 text-pink-500 animate-pulse" />}
          {matchType === "friendship" && <Users className="w-4 h-4 text-blue-500" />}
          {matchType === "both" && <Sparkles className="w-4 h-4 text-purple-500 animate-pulse" />}
        </div>
        <Avatar className={`w-12 h-12 bg-gradient-to-br ${getAvatarGradient(matchType)} ring-2 ring-background`}>
          <AvatarFallback className="bg-transparent text-white font-semibold">
            {match.participant2.name.charAt(0)}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Names and match info */}
      <div className="flex-1">
        <p className="font-medium">
          {match.participant1.name} <span className="text-muted-foreground">&</span> {match.participant2.name}
        </p>
        <p className="text-sm text-muted-foreground">¡Match mutuo!</p>
      </div>

      {/* Contact info */}
      <div className="flex flex-col sm:flex-row gap-2 text-sm">
        {match.participant1.phone && (
          <a 
            href={`tel:${match.participant1.phone}`} 
            className="flex items-center gap-1 text-primary hover:underline"
          >
            <Phone className="w-3 h-3" />
            {match.participant1.name.split(' ')[0]}
          </a>
        )}
        {match.participant2.phone && (
          <a 
            href={`tel:${match.participant2.phone}`} 
            className="flex items-center gap-1 text-primary hover:underline"
          >
            <Phone className="w-3 h-3" />
            {match.participant2.name.split(' ')[0]}
          </a>
        )}
      </div>
    </div>
  );
};

// Professional Match Card Component
const ProfessionalMatchCard = ({ match }: { match: Match }) => {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl bg-background/80 border border-border/50 hover:shadow-md transition-shadow animate-fade-in">
      {/* Company Avatars with handshake icon */}
      <div className="flex items-center gap-2">
        <Avatar className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 ring-2 ring-background">
          <AvatarFallback className="bg-transparent text-white font-semibold">
            {(match.participant1.company_name || match.participant1.name).charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-emerald-100 dark:bg-emerald-900/50">
          <Handshake className="w-4 h-4 text-emerald-500" />
        </div>
        <Avatar className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 ring-2 ring-background">
          <AvatarFallback className="bg-transparent text-white font-semibold">
            {(match.participant2.company_name || match.participant2.name).charAt(0)}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Company info */}
      <div className="flex-1 space-y-1">
        <p className="font-medium">
          {match.participant1.company_name || match.participant1.name}{" "}
          <span className="text-muted-foreground">↔</span>{" "}
          {match.participant2.company_name || match.participant2.name}
        </p>
        <div className="flex flex-wrap gap-2 text-xs">
          {match.participant1.sector && (
            <Badge variant="outline" className="bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800">
              <Building2 className="w-3 h-3 mr-1" />
              {match.participant1.sector}
            </Badge>
          )}
          {match.participant2.sector && match.participant2.sector !== match.participant1.sector && (
            <Badge variant="outline" className="bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800">
              <Building2 className="w-3 h-3 mr-1" />
              {match.participant2.sector}
            </Badge>
          )}
          {match.participant1.entity_type && (
            <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800">
              {match.participant1.entity_type === "client" ? "Cliente" : "Proveedor"}
            </Badge>
          )}
          {match.participant2.entity_type && (
            <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800">
              {match.participant2.entity_type === "client" ? "Cliente" : "Proveedor"}
            </Badge>
          )}
        </div>
      </div>

      {/* Contact info */}
      <div className="flex flex-col gap-1 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">{match.participant1.name}:</span>
          {match.participant1.phone && (
            <a 
              href={`tel:${match.participant1.phone}`} 
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <Phone className="w-3 h-3" />
              {match.participant1.phone}
            </a>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">{match.participant2.name}:</span>
          {match.participant2.phone && (
            <a 
              href={`tel:${match.participant2.phone}`} 
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <Phone className="w-3 h-3" />
              {match.participant2.phone}
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default MatchesDashboard;
