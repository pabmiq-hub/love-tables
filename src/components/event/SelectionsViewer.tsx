import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChevronDown, User, Heart, Users, Sparkles } from "lucide-react";

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
  const [openSelectors, setOpenSelectors] = useState<Record<string, boolean>>({});

  const toggleSelector = (id: string) => {
    setOpenSelectors(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Find all mutual match pairs for checking if selection resulted in match
  const matchPairs = new Set<string>();
  matches.forEach(m => {
    matchPairs.add(`${m.participant1.id}-${m.participant2.id}`);
    matchPairs.add(`${m.participant2.id}-${m.participant1.id}`);
  });

  // Build selections view data - what each participant selected
  const buildParticipantSelections = () => {
    const selectorMap = new Map<string, { participant: DbParticipant; selections: Array<{ selected: DbParticipant; selectionType: string; isMatch: boolean }> }>();

    selections.forEach(sel => {
      const selector = participants.find(p => p.id === sel.selector_id);
      const selected = participants.find(p => p.id === sel.selected_id);
      
      if (!selector || !selected) return;

      if (!selectorMap.has(sel.selector_id)) {
        selectorMap.set(sel.selector_id, {
          participant: selector,
          selections: [],
        });
      }

      const isMatch = matchPairs.has(`${sel.selector_id}-${sel.selected_id}`);
      
      selectorMap.get(sel.selector_id)!.selections.push({
        selected,
        selectionType: sel.selection_type || 'friendship',
        isMatch,
      });
    });

    return Array.from(selectorMap.values()).sort((a, b) => 
      a.participant.name.localeCompare(b.participant.name)
    );
  };

  const participantSelections = buildParticipantSelections();
  const participantsWhoVoted = new Set(selections.map(s => s.selector_id)).size;

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

  if (participantSelections.length === 0) {
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
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          Ver Selecciones ({participantsWhoVoted})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {participantSelections.map((ps) => (
            <Collapsible
              key={ps.participant.id}
              open={openSelectors[ps.participant.id]}
              onOpenChange={() => toggleSelector(ps.participant.id)}
            >
              <Card className="overflow-hidden">
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500">
                          <AvatarFallback className="bg-transparent text-white font-medium">
                            {ps.participant.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{ps.participant.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Seleccionó a {ps.selections.length} {ps.selections.length === 1 ? "persona" : "personas"}
                            {ps.selections.filter(s => s.isMatch).length > 0 && (
                              <span className="ml-2 text-green-600 dark:text-green-400">
                                ({ps.selections.filter(s => s.isMatch).length} match{ps.selections.filter(s => s.isMatch).length !== 1 ? "es" : ""})
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          {ps.selections.some(s => s.selectionType === "dating" || s.selectionType === "both") && (
                            <Badge variant="secondary" className={getMatchTypeBadgeStyle("dating")}>💕</Badge>
                          )}
                          {ps.selections.some(s => s.selectionType === "friendship" || s.selectionType === "both") && (
                            <Badge variant="secondary" className={getMatchTypeBadgeStyle("friendship")}>😊</Badge>
                          )}
                        </div>
                        <ChevronDown className={`w-5 h-5 transition-transform ${openSelectors[ps.participant.id] ? "rotate-180" : ""}`} />
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 pb-4">
                    <div className="space-y-2 pl-13">
                      {ps.selections.map((selInfo, index) => {
                        const selType = selInfo.selectionType === "both" ? "both" : 
                                        selInfo.selectionType === "dating" ? "dating" : "friendship";
                        return (
                          <div 
                            key={index}
                            className={`flex items-center justify-between p-3 rounded-lg border ${getSectionStyle(selType as MatchType)} ${selInfo.isMatch ? "ring-2 ring-green-500/50" : ""}`}
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="w-8 h-8">
                                <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                                  {selInfo.selected.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-sm flex items-center gap-2">
                                  {selInfo.selected.name}
                                  {selInfo.isMatch && (
                                    <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300 text-xs">
                                      ✓ Match mutuo
                                    </Badge>
                                  )}
                                </p>
                                <Badge variant="secondary" className={`text-xs ${getMatchTypeBadgeStyle(selType as MatchType)}`}>
                                  {selType === "both" ? "Amistad + Ligue 💕😊" : 
                                   selType === "dating" ? "Ligue 💕" : "Amistad 😊"}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default SelectionsViewer;
