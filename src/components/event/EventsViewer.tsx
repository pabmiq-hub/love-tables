import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sparkles, Repeat, CheckCircle2, XCircle, Clock, ArrowRight } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface DbParticipant {
  id: string;
  name: string;
}

interface Selection {
  selector_id: string;
  selected_id: string;
  selection_type: string | null;
  is_super_like?: boolean;
}

interface Match {
  participant1: DbParticipant;
  participant2: DbParticipant;
}

interface RepeatRequestRow {
  id: string;
  requester_id: string;
  target_id: string;
  status: string;
  created_at: string;
  accepted_at: string | null;
  scheduled_round: number | null;
}

interface EventsViewerProps {
  selections: Selection[];
  participants: DbParticipant[];
  matches: Match[];
  repeatRequests: RepeatRequestRow[];
}

const EventsViewer = ({ selections, participants, matches, repeatRequests }: EventsViewerProps) => {
  const byId = new Map(participants.map((p) => [p.id, p]));

  // Mutual match pairs
  const matchPairs = new Set<string>();
  matches.forEach((m) => {
    matchPairs.add(`${m.participant1.id}-${m.participant2.id}`);
    matchPairs.add(`${m.participant2.id}-${m.participant1.id}`);
  });

  const superLikes = selections.filter((s) => s.is_super_like);

  const statusBadge = (status: string) => {
    switch (status) {
      case "accepted":
      case "fulfilled":
        return (
          <Badge className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300 border-green-200">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Aceptada
          </Badge>
        );
      case "declined":
        return (
          <Badge className="bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border-red-200">
            <XCircle className="w-3 h-3 mr-1" /> Rechazada
          </Badge>
        );
      case "expired":
        return (
          <Badge variant="outline" className="text-muted-foreground">
            <Clock className="w-3 h-3 mr-1" /> Expirada
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-amber-700 border-amber-300">
            <Clock className="w-3 h-3 mr-1" /> Pendiente
          </Badge>
        );
    }
  };

  const Avatar1 = ({ name }: { name: string }) => (
    <Avatar className="w-6 h-6">
      <AvatarFallback className="text-xs bg-primary/10 text-primary">
        {name?.charAt(0) || "?"}
      </AvatarFallback>
    </Avatar>
  );

  return (
    <div className="space-y-6">
      {/* Super Likes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Super Likes ({superLikes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {superLikes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No se han enviado super likes en este evento
            </p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>De</TableHead>
                    <TableHead></TableHead>
                    <TableHead>Para</TableHead>
                    <TableHead className="text-right">Resultado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {superLikes.map((sl, idx) => {
                    const from = byId.get(sl.selector_id);
                    const to = byId.get(sl.selected_id);
                    const isMatch = matchPairs.has(`${sl.selector_id}-${sl.selected_id}`);
                    return (
                      <TableRow key={idx}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar1 name={from?.name || "?"} />
                            <span className="text-sm">{from?.name || "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="w-6">
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar1 name={to?.name || "?"} />
                            <span className="text-sm">{to?.name || "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {isMatch ? (
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300 border-green-200">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Match
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              Sin coincidencia
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Repeat Requests */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Repeat className="w-5 h-5 text-primary" />
            Solicitudes de Repetir ({repeatRequests.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {repeatRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No se han solicitado repeticiones en este evento
            </p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Solicitante</TableHead>
                    <TableHead></TableHead>
                    <TableHead>Destinatario</TableHead>
                    <TableHead className="text-center">Ronda</TableHead>
                    <TableHead className="text-right">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {repeatRequests.map((r) => {
                    const from = byId.get(r.requester_id);
                    const to = byId.get(r.target_id);
                    return (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar1 name={from?.name || "?"} />
                            <span className="text-sm">{from?.name || "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="w-6">
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar1 name={to?.name || "?"} />
                            <span className="text-sm">{to?.name || "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {r.scheduled_round ? (
                            <Badge variant="outline" className="text-xs">
                              Ronda {r.scheduled_round}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{statusBadge(r.status)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EventsViewer;
