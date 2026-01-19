import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Mail, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Send, 
  RefreshCw, 
  ChevronDown,
  AlertCircle,
  MailX,
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Participant {
  id: string;
  name: string;
  email: string | null;
}

interface EmailLog {
  id: string;
  participant_id: string;
  email_type: string;
  status: string;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
}

interface EmailManagementProps {
  eventId: string;
  participants: Participant[];
  onRefresh: () => void;
}

type FilterStatus = "all" | "sent" | "failed" | "pending" | "no_email";

const EmailManagement = ({ eventId, participants, onRefresh }: EmailManagementProps) => {
  const { toast } = useToast();
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());
  const [isSendingBulk, setIsSendingBulk] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadEmailLogs();
    }
  }, [eventId, isOpen]);

  const loadEmailLogs = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("email_logs")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading email logs:", error);
    } else {
      setEmailLogs(data || []);
    }
    setIsLoading(false);
  };

  // Get latest log for each participant (by email_type = 'match')
  const getParticipantEmailStatus = (participantId: string): EmailLog | null => {
    const logs = emailLogs
      .filter(log => log.participant_id === participantId && log.email_type === 'match')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return logs[0] || null;
  };

  // Calculate statistics
  const stats = {
    total: participants.length,
    withEmail: participants.filter(p => p.email).length,
    noEmail: participants.filter(p => !p.email).length,
    sent: 0,
    failed: 0,
    pending: 0,
  };

  participants.forEach(p => {
    if (!p.email) return;
    const log = getParticipantEmailStatus(p.id);
    if (!log) {
      stats.pending++;
    } else if (log.status === 'sent') {
      stats.sent++;
    } else if (log.status === 'failed') {
      stats.failed++;
    } else {
      stats.pending++;
    }
  });

  // Filter participants based on status
  const filteredParticipants = participants.filter(p => {
    if (filterStatus === "no_email") return !p.email;
    if (!p.email && filterStatus !== "all") return false;
    
    const log = getParticipantEmailStatus(p.id);
    
    switch (filterStatus) {
      case "sent": return log?.status === 'sent';
      case "failed": return log?.status === 'failed';
      case "pending": return !log || log.status === 'pending';
      default: return true;
    }
  });

  // Resend to a single participant
  const handleResend = async (participantId: string) => {
    setSendingIds(prev => new Set(prev).add(participantId));
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Error", description: "No estás autenticado", variant: "destructive" });
        return;
      }

      const { data, error } = await supabase.functions.invoke('send-match-emails', {
        body: { event_id: eventId, participant_ids: [participantId] }
      });

      if (error) throw error;

      toast({
        title: "Email enviado",
        description: `Email enviado correctamente`,
      });
      
      loadEmailLogs();
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo enviar el email",
        variant: "destructive",
      });
    } finally {
      setSendingIds(prev => {
        const next = new Set(prev);
        next.delete(participantId);
        return next;
      });
    }
  };

  // Resend to failed only
  const handleResendFailed = async () => {
    const failedIds = participants
      .filter(p => {
        if (!p.email) return false;
        const log = getParticipantEmailStatus(p.id);
        return log?.status === 'failed';
      })
      .map(p => p.id);

    if (failedIds.length === 0) {
      toast({ title: "Info", description: "No hay emails fallidos para reenviar" });
      return;
    }

    setIsSendingBulk(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Error", description: "No estás autenticado", variant: "destructive" });
        return;
      }

      const { data, error } = await supabase.functions.invoke('send-match-emails', {
        body: { event_id: eventId, participant_ids: failedIds }
      });

      if (error) throw error;

      toast({
        title: "Emails enviados",
        description: `${data?.stats?.withMatches + data?.stats?.withoutMatches || 0} emails reenviados`,
      });
      
      loadEmailLogs();
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudieron enviar los emails",
        variant: "destructive",
      });
    } finally {
      setIsSendingBulk(false);
    }
  };

  // Send to pending only
  const handleSendPending = async () => {
    const pendingIds = participants
      .filter(p => {
        if (!p.email) return false;
        const log = getParticipantEmailStatus(p.id);
        return !log || log.status === 'pending';
      })
      .map(p => p.id);

    if (pendingIds.length === 0) {
      toast({ title: "Info", description: "No hay emails pendientes para enviar" });
      return;
    }

    setIsSendingBulk(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Error", description: "No estás autenticado", variant: "destructive" });
        return;
      }

      const { data, error } = await supabase.functions.invoke('send-match-emails', {
        body: { event_id: eventId, participant_ids: pendingIds }
      });

      if (error) throw error;

      toast({
        title: "Emails enviados",
        description: `${data?.stats?.withMatches + data?.stats?.withoutMatches || 0} emails enviados`,
      });
      
      loadEmailLogs();
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudieron enviar los emails",
        variant: "destructive",
      });
    } finally {
      setIsSendingBulk(false);
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'sent': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-destructive" />;
      default: return <Clock className="w-4 h-4 text-amber-500" />;
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'sent': return <Badge className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300">Enviado</Badge>;
      case 'failed': return <Badge variant="destructive">Fallido</Badge>;
      default: return <Badge variant="secondary">Pendiente</Badge>;
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-primary" />
                <div>
                  <CardTitle className="text-lg">Gestión de Envíos</CardTitle>
                  <CardDescription>Ver y gestionar emails individuales</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {stats.failed > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <XCircle className="w-3 h-3" />
                    {stats.failed} fallidos
                  </Badge>
                )}
                {stats.sent > 0 && (
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300 gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {stats.sent} enviados
                  </Badge>
                )}
                <ChevronDown className={`w-5 h-5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold">{stats.total}</div>
                    <div className="text-xs text-muted-foreground">Total</div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-green-600 dark:text-green-400">{stats.sent}</div>
                    <div className="text-xs text-muted-foreground">Enviados</div>
                  </div>
                  <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-destructive">{stats.failed}</div>
                    <div className="text-xs text-muted-foreground">Fallidos</div>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-amber-600 dark:text-amber-400">{stats.pending}</div>
                    <div className="text-xs text-muted-foreground">Pendientes</div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-muted-foreground">{stats.noEmail}</div>
                    <div className="text-xs text-muted-foreground">Sin email</div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={loadEmailLogs}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Actualizar
                  </Button>
                  {stats.failed > 0 && (
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={handleResendFailed}
                      disabled={isSendingBulk}
                    >
                      {isSendingBulk ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                      Reenviar fallidos ({stats.failed})
                    </Button>
                  )}
                  {stats.pending > 0 && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleSendPending}
                      disabled={isSendingBulk}
                    >
                      {isSendingBulk ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                      Enviar pendientes ({stats.pending})
                    </Button>
                  )}
                </div>

                {/* Filter */}
                <div className="flex gap-2 flex-wrap">
                  {(["all", "sent", "failed", "pending", "no_email"] as FilterStatus[]).map(status => (
                    <Button
                      key={status}
                      variant={filterStatus === status ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilterStatus(status)}
                    >
                      {status === "all" && "Todos"}
                      {status === "sent" && `Enviados (${stats.sent})`}
                      {status === "failed" && `Fallidos (${stats.failed})`}
                      {status === "pending" && `Pendientes (${stats.pending})`}
                      {status === "no_email" && `Sin email (${stats.noEmail})`}
                    </Button>
                  ))}
                </div>

                {/* Participants List */}
                <div className="max-h-80 overflow-y-auto space-y-2">
                  {filteredParticipants.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No hay participantes en esta categoría
                    </div>
                  ) : (
                    filteredParticipants.map(participant => {
                      const log = getParticipantEmailStatus(participant.id);
                      const isSending = sendingIds.has(participant.id);
                      
                      return (
                        <div 
                          key={participant.id}
                          className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border"
                        >
                          <div className="flex items-center gap-3">
                            {participant.email ? getStatusIcon(log?.status || null) : <MailX className="w-4 h-4 text-muted-foreground" />}
                            <div>
                              <p className="font-medium text-sm">{participant.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {participant.email || "Sin email"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {participant.email && getStatusBadge(log?.status || null)}
                            {log?.sent_at && (
                              <span className="text-xs text-muted-foreground hidden sm:inline">
                                {new Date(log.sent_at).toLocaleDateString("es-ES", { 
                                  day: "numeric", 
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}
                              </span>
                            )}
                            {log?.status === 'failed' && log.error_message && (
                              <span className="text-xs text-destructive hidden md:inline max-w-32 truncate" title={log.error_message}>
                                {log.error_message}
                              </span>
                            )}
                            {participant.email && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleResend(participant.id)}
                                disabled={isSending || isSendingBulk}
                                className="h-7 px-2"
                              >
                                {isSending ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Send className="w-3 h-3" />
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export default EmailManagement;
