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
  MailX,
  Loader2,
  UserCheck,
  Bell,
  Heart,
  FileText
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
type FilterEmailType = "all" | "match" | "reminder" | "checkin_code" | "registration_confirmation";

const EMAIL_TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  match: { label: "Resultados", icon: <Heart className="w-3 h-3" />, color: "bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300" },
  connection: { label: "Conexiones", icon: <Heart className="w-3 h-3" />, color: "bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300" },
  reminder: { label: "Recordatorio", icon: <Bell className="w-3 h-3" />, color: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  checkin_code: { label: "Código acceso", icon: <UserCheck className="w-3 h-3" />, color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  registration_confirmation: { label: "Confirmación", icon: <FileText className="w-3 h-3" />, color: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300" },
};

const EmailManagement = ({ eventId, participants, onRefresh }: EmailManagementProps) => {
  const { toast } = useToast();
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterType, setFilterType] = useState<FilterEmailType>("all");
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());
  const [isSendingBulk, setIsSendingBulk] = useState(false);
  const [expandedParticipants, setExpandedParticipants] = useState<Set<string>>(new Set());

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

  // Get all logs for a participant, optionally filtered by type
  const getParticipantLogs = (participantId: string): EmailLog[] => {
    return emailLogs
      .filter(log => log.participant_id === participantId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  };

  // Get latest match/connection log for a participant (for status display)
  const getParticipantMatchStatus = (participantId: string): EmailLog | null => {
    const logs = emailLogs
      .filter(log => log.participant_id === participantId && (log.email_type === 'match' || log.email_type === 'connection'))
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
    const log = getParticipantMatchStatus(p.id);
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

  // Count by email type
  const typeCounts: Record<string, number> = {};
  emailLogs.forEach(log => {
    typeCounts[log.email_type] = (typeCounts[log.email_type] || 0) + 1;
  });

  // Filter participants
  const filteredParticipants = participants
    .filter(p => {
      if (filterStatus === "no_email") return !p.email;
      if (!p.email && filterStatus !== "all") return false;
      
      const log = getParticipantMatchStatus(p.id);
      
      switch (filterStatus) {
        case "sent": return log?.status === 'sent';
        case "failed": return log?.status === 'failed';
        case "pending": return !log || log.status === 'pending';
        default: return true;
      }
    })
    .filter(p => {
      if (filterType === "all") return true;
      const logs = getParticipantLogs(p.id);
      return logs.some(log => log.email_type === filterType);
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));

  const toggleParticipant = (id: string) => {
    setExpandedParticipants(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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

      toast({ title: "Email enviado", description: "Email enviado correctamente" });
      setTimeout(() => loadEmailLogs(), 2000);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "No se pudo enviar", variant: "destructive" });
      loadEmailLogs();
    } finally {
      setSendingIds(prev => {
        const next = new Set(prev);
        next.delete(participantId);
        return next;
      });
    }
  };

  const handleResendFailed = async () => {
    const failedIds = participants
      .filter(p => p.email && getParticipantMatchStatus(p.id)?.status === 'failed')
      .map(p => p.id);
    if (failedIds.length === 0) return;
    setIsSendingBulk(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No autenticado");
      const { error } = await supabase.functions.invoke('send-match-emails', {
        body: { event_id: eventId, participant_ids: failedIds }
      });
      if (error) throw error;
      toast({ title: "Emails reenviados", description: `${failedIds.length} emails reenviados` });
      loadEmailLogs();
      onRefresh();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSendingBulk(false);
    }
  };

  const handleSendPending = async () => {
    const pendingIds = participants
      .filter(p => {
        if (!p.email) return false;
        const log = getParticipantMatchStatus(p.id);
        return !log || log.status === 'pending';
      })
      .map(p => p.id);
    if (pendingIds.length === 0) return;
    setIsSendingBulk(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No autenticado");
      const { error } = await supabase.functions.invoke('send-match-emails', {
        body: { event_id: eventId, participant_ids: pendingIds }
      });
      if (error) throw error;
      toast({ title: "Emails enviados", description: `${pendingIds.length} emails enviados` });
      loadEmailLogs();
      onRefresh();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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
                  <CardDescription>Historial completo de emails por participante</CardDescription>
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
                  <Button variant="outline" size="sm" onClick={loadEmailLogs}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Actualizar
                  </Button>
                  {stats.failed > 0 && (
                    <Button variant="default" size="sm" onClick={handleResendFailed} disabled={isSendingBulk}>
                      {isSendingBulk ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                      Reenviar fallidos ({stats.failed})
                    </Button>
                  )}
                  {stats.pending > 0 && (
                    <Button variant="outline" size="sm" onClick={handleSendPending} disabled={isSendingBulk}>
                      {isSendingBulk ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                      Enviar pendientes ({stats.pending})
                    </Button>
                  )}
                </div>

                {/* Filters */}
                <div className="space-y-2">
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
                  {/* Type filter */}
                  <div className="flex gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground self-center">Tipo:</span>
                    {(["all", "match", "reminder", "checkin_code", "registration_confirmation"] as FilterEmailType[]).map(type => (
                      <Button
                        key={type}
                        variant={filterType === type ? "secondary" : "ghost"}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setFilterType(type)}
                      >
                        {type === "all" ? "Todos" : (EMAIL_TYPE_CONFIG[type]?.label || type)}
                        {type !== "all" && typeCounts[type] ? ` (${typeCounts[type]})` : ""}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Participants List */}
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {filteredParticipants.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No hay participantes en esta categoría
                    </div>
                  ) : (
                    filteredParticipants.map(participant => {
                      const matchLog = getParticipantMatchStatus(participant.id);
                      const allLogs = getParticipantLogs(participant.id);
                      const isSending = sendingIds.has(participant.id);
                      const isExpanded = expandedParticipants.has(participant.id);
                      
                      return (
                        <div key={participant.id} className="bg-muted/30 rounded-lg border overflow-hidden">
                          {/* Main row */}
                          <div 
                            className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50"
                            onClick={() => allLogs.length > 0 && toggleParticipant(participant.id)}
                          >
                            <div className="flex items-center gap-3">
                              {participant.email ? getStatusIcon(matchLog?.status || null) : <MailX className="w-4 h-4 text-muted-foreground" />}
                              <div>
                                <p className="font-medium text-sm">{participant.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {participant.email || "Sin email"}
                                  {allLogs.length > 0 && (
                                    <span className="ml-2 text-primary">· {allLogs.length} email{allLogs.length > 1 ? 's' : ''}</span>
                                  )}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {/* Show type badges for all email types this participant has */}
                              {participant.email && (
                                <div className="hidden sm:flex gap-1">
                                  {Array.from(new Set(allLogs.map(l => l.email_type))).map(type => {
                                    const config = EMAIL_TYPE_CONFIG[type];
                                    if (!config) return null;
                                    return (
                                      <Badge key={type} className={`text-[10px] px-1.5 py-0 ${config.color}`}>
                                        {config.label}
                                      </Badge>
                                    );
                                  })}
                                </div>
                              )}
                              {participant.email && getStatusBadge(matchLog?.status || null)}
                              {participant.email && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); handleResend(participant.id); }}
                                  disabled={isSending || isSendingBulk}
                                  className="h-7 px-2"
                                >
                                  {isSending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                                </Button>
                              )}
                              {allLogs.length > 0 && (
                                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                              )}
                            </div>
                          </div>
                          
                          {/* Timeline - expanded */}
                          {isExpanded && allLogs.length > 0 && (
                            <div className="border-t px-3 py-2 space-y-1.5 bg-background/50">
                              {allLogs.map(log => {
                                const config = EMAIL_TYPE_CONFIG[log.email_type] || { label: log.email_type, icon: <Mail className="w-3 h-3" />, color: "bg-muted text-muted-foreground" };
                                return (
                                  <div key={log.id} className="flex items-center gap-2 text-xs">
                                    <span className="text-muted-foreground w-3">{config.icon}</span>
                                    <Badge className={`text-[10px] px-1.5 py-0 ${config.color}`}>{config.label}</Badge>
                                    {log.status === 'sent' ? (
                                      <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
                                    ) : (
                                      <XCircle className="w-3 h-3 text-destructive shrink-0" />
                                    )}
                                    <span className="text-muted-foreground">
                                      {log.sent_at
                                        ? new Date(log.sent_at).toLocaleDateString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                                        : new Date(log.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                                      }
                                    </span>
                                    {log.error_message && (
                                      <span className="text-destructive truncate max-w-40" title={log.error_message}>
                                        {log.error_message}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
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
