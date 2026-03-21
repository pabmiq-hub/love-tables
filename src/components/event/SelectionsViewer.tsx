import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChevronDown, ChevronRight, User, Heart, Users } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { formatAnonymousName } from "@/lib/utils";

interface DbParticipant {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
}

interface Selection {
  selector_id: string;
  selected_id: string;
  selection_type: string | null;
}

interface Match {
  participant1: DbParticipant;
  participant2: DbParticipant;
}

interface SelectionsViewerProps {
  selections: Selection[];
  participants: DbParticipant[];
  matches: Match[];
}

type MatchType = "dating" | "friendship" | "both";

const SelectionsViewer = ({ selections, participants, matches }: SelectionsViewerProps) => {
  const [expandedParticipant, setExpandedParticipant] = useState<string | null>(null);

  // Find all mutual match pairs for checking if selection resulted in match
  const matchPairs = new Set<string>();
  matches.forEach(m => {
    matchPairs.add(`${m.participant1.id}-${m.participant2.id}`);
    matchPairs.add(`${m.participant2.id}-${m.participant1.id}`);
  });

  // Build unified data per participant
  const buildParticipantData = () => {
    const dataMap = new Map<string, {
      participant: DbParticipant;
      selectionsMade: Array<{ selected: DbParticipant; selectionType: string; isMatch: boolean }>;
      selectionsReceived: Array<{ selector: DbParticipant; selectionType: string; isMatch: boolean }>;
      matchCount: number;
    }>();

    // Initialize all participants
    participants.forEach(p => {
      dataMap.set(p.id, {
        participant: p,
        selectionsMade: [],
        selectionsReceived: [],
        matchCount: 0,
      });
    });

    // Build selections made
    selections.forEach(sel => {
      const selector = participants.find(p => p.id === sel.selector_id);
      const selected = participants.find(p => p.id === sel.selected_id);
      
      if (!selector || !selected) return;

      const isMatch = matchPairs.has(`${sel.selector_id}-${sel.selected_id}`);
      
      const selectorData = dataMap.get(sel.selector_id);
      if (selectorData) {
        selectorData.selectionsMade.push({
          selected,
          selectionType: sel.selection_type || 'friendship',
          isMatch,
        });
        if (isMatch) selectorData.matchCount++;
      }

      // Build selections received
      const selectedData = dataMap.get(sel.selected_id);
      if (selectedData) {
        selectedData.selectionsReceived.push({
          selector,
          selectionType: sel.selection_type || 'friendship',
          isMatch,
        });
      }
    });

    return Array.from(dataMap.values())
      .filter(d => d.selectionsMade.length > 0 || d.selectionsReceived.length > 0)
      .sort((a, b) => a.participant.name.localeCompare(b.participant.name, 'es'));
  };

  const participantData = buildParticipantData();
  const participantsWhoVoted = new Set(selections.map(s => s.selector_id)).size;

  const getMatchTypeBadgeStyle = (type: MatchType) => {
    switch (type) {
      case "dating": return "bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300 border-pink-200 dark:border-pink-800";
      case "friendship": return "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      case "both": return "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "both": return "💕😊";
      case "dating": return "💕";
      default: return "😊";
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedParticipant(prev => prev === id ? null : id);
  };

  if (participantData.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
            <User className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">Ningún participante ha votado todavía</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="w-5 h-5" />
          Detalle de Selecciones ({participantsWhoVoted} han votado)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-10"></TableHead>
                <TableHead>Participante</TableHead>
                <TableHead className="text-center w-24">Hizo</TableHead>
                <TableHead className="text-center w-24">Recibió</TableHead>
                <TableHead className="text-center w-24">Matches</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {participantData.map((data) => {
                const isExpanded = expandedParticipant === data.participant.id;
                
                return (
                  <>
                    <TableRow 
                      key={data.participant.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => toggleExpand(data.participant.id)}
                    >
                      <TableCell className="p-2">
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-7 h-7">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {data.participant.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-sm">{data.participant.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-xs">
                          {data.selectionsMade.length}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-xs">
                          {data.selectionsReceived.length}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {data.matchCount > 0 ? (
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300 text-xs">
                            {data.matchCount}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                    
                    {/* Expanded row */}
                    {isExpanded && (
                      <TableRow key={`${data.participant.id}-expanded`}>
                        <TableCell colSpan={5} className="p-0 bg-muted/30">
                          <div className="p-4">
                            <Tabs defaultValue="made" className="w-full">
                              <TabsList className="grid w-full grid-cols-2 max-w-xs">
                                <TabsTrigger value="made" className="text-xs">
                                  Seleccionó ({data.selectionsMade.length})
                                </TabsTrigger>
                                <TabsTrigger value="received" className="text-xs">
                                  Le seleccionaron ({data.selectionsReceived.length})
                                </TabsTrigger>
                              </TabsList>
                              
                              <TabsContent value="made" className="mt-3">
                                {data.selectionsMade.length === 0 ? (
                                  <p className="text-sm text-muted-foreground italic">No ha seleccionado a nadie</p>
                                ) : (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {data.selectionsMade.map((sel, idx) => (
                                      <div 
                                        key={idx}
                                        className={`flex items-center justify-between p-2 rounded-lg border bg-background ${sel.isMatch ? "ring-1 ring-green-500/50" : ""}`}
                                      >
                                        <div className="flex items-center gap-2">
                                          <Avatar className="w-6 h-6">
                                            <AvatarFallback className="text-xs bg-muted">
                                              {sel.selected.name.charAt(0)}
                                            </AvatarFallback>
                                          </Avatar>
                                          <span className="text-sm">{sel.selected.name}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <span className="text-sm">{getTypeLabel(sel.selectionType)}</span>
                                          {sel.isMatch && (
                                            <Badge className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300 text-xs h-5">
                                              ✓
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </TabsContent>
                              
                              <TabsContent value="received" className="mt-3">
                                {data.selectionsReceived.length === 0 ? (
                                  <p className="text-sm text-muted-foreground italic">Nadie le ha seleccionado</p>
                                ) : (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {data.selectionsReceived.map((rec, idx) => (
                                      <div 
                                        key={idx}
                                        className={`flex items-center justify-between p-2 rounded-lg border bg-background ${rec.isMatch ? "ring-1 ring-green-500/50" : ""}`}
                                      >
                                        <div className="flex items-center gap-2">
                                          <Avatar className="w-6 h-6">
                                            <AvatarFallback className="text-xs bg-muted">
                                              {rec.selector.name.charAt(0)}
                                            </AvatarFallback>
                                          </Avatar>
                                          <span className="text-sm">{rec.selector.name}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <span className="text-sm">{getTypeLabel(rec.selectionType)}</span>
                                          {rec.isMatch && (
                                            <Badge className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300 text-xs h-5">
                                              ✓
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </TabsContent>
                            </Tabs>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default SelectionsViewer;