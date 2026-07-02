import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Loader2, Sparkles, Send, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TopMatch {
  participantId: string;
  gender: string;
  ageRange: string;
  topHobbyLabel: string;
  compat: number;
  outgoing: { id: string; status: string } | null;
}

interface ReceivedRequest {
  requestId: string;
  status: string;
  senderParticipantId: string;
  gender: string;
  ageRange: string;
  topHobbyLabel: string;
  compat: number | null;
}

interface Props {
  eventId: string;
  participantId: string;
  verificationCode: string;
  lang: "es" | "en";
}

export default function WrappedCompatibilityTab({ eventId, participantId, verificationCode, lang }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [top, setTop] = useState<TopMatch[]>([]);
  const [received, setReceived] = useState<ReceivedRequest[]>([]);
  const [sentCount, setSentCount] = useState(0);
  const [maxRequests, setMaxRequests] = useState(3);
  const [myProfileMissing, setMyProfileMissing] = useState(false);
  const [target, setTarget] = useState<TopMatch | null>(null);
  const [sending, setSending] = useState(false);
  const [responding, setResponding] = useState<string | null>(null);

  const T = {
    es: {
      title: "Compatibilidad ✨",
      subtitle: "Tus 10 personas más compatibles en este evento (anónimo).",
      empty: "Aún no hay perfiles compatibles suficientes en el evento.",
      profileMissing: "No hay un perfil Wrapped asociado a tu inscripción, no podemos calcular compatibilidades.",
      compat: "compatibilidad",
      topHobby: "Hobby favorito",
      age: "Edad",
      gender: "Género",
      askMatch: "Pedir coincidir en mesa",
      pending: "Pendiente",
      accepted: "Aceptada",
      rejected: "Rechazada",
      remaining: "Solicitudes restantes",
      confirmTitle: "Enviar solicitud",
      confirmDesc: "La persona verá tu retrato robot anónimo (género, franja de edad, hobby y % de compatibilidad). Si acepta, os sentaréis juntos en la próxima ronda.",
      confirmSend: "Enviar",
      cancel: "Cancelar",
      received: "Solicitudes recibidas",
      accept: "Aceptar",
      reject: "Rechazar",
      noReceived: "No has recibido solicitudes aún.",
      limitReached: "Has alcanzado el límite de solicitudes.",
      sent: "Enviada ✓",
    },
    en: {
      title: "Compatibility ✨",
      subtitle: "Your top 10 most compatible people at this event (anonymous).",
      empty: "Not enough compatible profiles in the event yet.",
      profileMissing: "No Wrapped profile is linked to your registration, we can't compute compatibility.",
      compat: "compatibility",
      topHobby: "Favorite hobby",
      age: "Age",
      gender: "Gender",
      askMatch: "Request to match at a table",
      pending: "Pending",
      accepted: "Accepted",
      rejected: "Rejected",
      remaining: "Remaining requests",
      confirmTitle: "Send request",
      confirmDesc: "They'll see your anonymous profile (gender, age range, hobby and compatibility %). If they accept, you'll be seated together in the next round.",
      confirmSend: "Send",
      cancel: "Cancel",
      received: "Received requests",
      accept: "Accept",
      reject: "Reject",
      noReceived: "You haven't received any requests yet.",
      limitReached: "Request limit reached.",
      sent: "Sent ✓",
    },
  }[lang];

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-wrapped-compatibility", {
        body: { eventId, participantId, verificationCode, lang },
      });
      if (error) throw error;
      setTop(data.topMatches || []);
      setReceived(data.receivedRequests || []);
      setSentCount(data.sentCount || 0);
      setMaxRequests(data.maxRequests || 3);
      setMyProfileMissing(!!data.myProfileMissing);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || String(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [eventId, participantId]);

  const sendRequest = async () => {
    if (!target) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("request-wrapped-table", {
        body: {
          event_id: eventId,
          sender_participant_id: participantId,
          receiver_participant_id: target.participantId,
          access_code: verificationCode,
          compatibility_score: target.compat,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: T.sent });
      setTarget(null);
      await load();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || String(err), variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const respond = async (requestId: string, action: "accept" | "reject") => {
    setResponding(requestId);
    try {
      const { data, error } = await supabase.functions.invoke("respond-wrapped-table", {
        body: {
          request_id: requestId,
          receiver_participant_id: participantId,
          access_code: verificationCode,
          action,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: action === "accept" ? T.accepted : T.rejected });
      await load();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || String(err), variant: "destructive" });
    } finally {
      setResponding(null);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  if (myProfileMissing) {
    return <p className="text-sm text-muted-foreground text-center py-6">{T.profileMissing}</p>;
  }

  const remaining = Math.max(0, maxRequests - sentCount);
  const pendingReceived = received.filter(r => r.status === "pending");

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" />{T.title}</h3>
          <p className="text-xs text-muted-foreground">{T.subtitle}</p>
        </div>
        <Badge variant="outline" className="text-xs">{T.remaining}: {remaining}/{maxRequests}</Badge>
      </div>

      {pendingReceived.length > 0 && (
        <Card className="p-3 border-primary/40 bg-primary/5">
          <p className="text-sm font-medium mb-2">{T.received}</p>
          <div className="space-y-2">
            {pendingReceived.map(r => (
              <div key={r.requestId} className="flex items-center justify-between gap-2 p-2 rounded bg-background">
                <div className="text-xs space-y-0.5">
                  <div className="font-medium">
                    {r.gender || "—"} · {r.ageRange || "—"} · {r.topHobbyLabel || "—"}
                  </div>
                  {typeof r.compat === "number" && (
                    <div className="text-primary font-semibold">{r.compat}% {T.compat}</div>
                  )}
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="default" disabled={responding === r.requestId} onClick={() => respond(r.requestId, "accept")}>
                    <Check className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="outline" disabled={responding === r.requestId} onClick={() => respond(r.requestId, "reject")}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {top.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">{T.empty}</p>
      ) : (
        <div className="space-y-2">
          {top.map((m, idx) => {
            const out = m.outgoing;
            const statusLabel = out?.status === "pending" ? T.pending
              : out?.status === "accepted" ? T.accepted
              : out?.status === "rejected" ? T.rejected : null;
            return (
              <Card key={m.participantId} className="p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-primary font-bold text-lg">{m.compat}%</span>
                    <span className="text-xs text-muted-foreground">{T.compat}</span>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {[m.gender, m.ageRange, m.topHobbyLabel].filter(Boolean).join(" · ")}
                  </div>
                </div>
                {statusLabel ? (
                  <Badge variant={out?.status === "accepted" ? "default" : "outline"} className="text-xs">
                    {statusLabel}
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={remaining <= 0}
                    onClick={() => setTarget(m)}
                    title={remaining <= 0 ? T.limitReached : T.askMatch}
                  >
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{T.confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{T.confirmDesc}</AlertDialogDescription>
          </AlertDialogHeader>
          {target && (
            <div className="rounded border p-3 text-sm bg-muted/40">
              <div className="text-primary font-bold text-xl">{target.compat}% {T.compat}</div>
              <div className="text-muted-foreground text-xs mt-1">
                {[target.gender, target.ageRange, target.topHobbyLabel].filter(Boolean).join(" · ")}
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sending}>{T.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); sendRequest(); }} disabled={sending}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : T.confirmSend}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
