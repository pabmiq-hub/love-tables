import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, ArrowRight, Send, Users, Mail, Eye, AlertTriangle } from "lucide-react";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { RichTextRenderer } from "@/components/ui/rich-text-renderer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganizer } from "@/hooks/useOrganizer";
import { useToast } from "@/hooks/use-toast";
import type { CRMUser } from "@/hooks/useCRM";

interface RemarketingCampaignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedUsers: CRMUser[];
  allUsers: CRMUser[];
  events: Array<{ id: string; name: string; date: string; status: string }>;
}

type Step = 'recipients' | 'event' | 'compose' | 'confirm';

const DEFAULT_BODY = `<p>Hola {{nombre}},</p>
<p>Nos encantaría volver a verte en nuestro próximo evento: <strong>{{evento}}</strong>.</p>
<p>Puedes inscribirte directamente desde este enlace:</p>
<p><a href="{{enlace_inscripcion}}">Inscribirme al evento</a></p>
<p>¡Esperamos verte pronto!</p>`;

export function RemarketingCampaignModal({ open, onOpenChange, selectedUsers, allUsers, events }: RemarketingCampaignModalProps) {
  const { user } = useAuth();
  const { organizer } = useOrganizer();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('recipients');
  const [recipientMode, setRecipientMode] = useState<'selected' | 'all'>('selected');
  const [targetEventId, setTargetEventId] = useState<string>("");
  const [subject, setSubject] = useState("Te invitamos a nuestro próximo evento");
  const [body, setBody] = useState(DEFAULT_BODY);
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [alreadySentEmails, setAlreadySentEmails] = useState<string[]>([]);
  const [alreadyRegisteredEmails, setAlreadyRegisteredEmails] = useState<string[]>([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);

  const recipients = recipientMode === 'selected' ? selectedUsers : allUsers;
  const recipientsWithEmail = useMemo(() => recipients.filter(u => u.email), [recipients]);
  const targetEvent = events.find(e => e.id === targetEventId);
  const upcomingEvents = events.filter(e => e.status === 'pending' || e.status === 'active');

  const registrationLink = targetEventId && organizer?.slug
    ? `https://konektum.com/o/${organizer.slug}/join/${targetEventId}`
    : '';

  // Check for already-sent emails and already-registered participants when reaching confirm step
  useEffect(() => {
    if (step !== 'confirm' || !targetEventId || !organizer?.id) return;
    
    const checkDuplicates = async () => {
      setCheckingDuplicates(true);
      try {
        // Check already-sent campaigns
        const { data: campaigns } = await supabase
          .from("remarketing_campaigns")
          .select("id")
          .eq("organizer_id", organizer.id)
          .eq("target_event_id", targetEventId)
          .in("status", ["sent", "sending"]);

        if (campaigns?.length) {
          const campaignIds = campaigns.map(c => c.id);
          const { data: sentRecipients } = await supabase
            .from("remarketing_recipients")
            .select("email")
            .in("campaign_id", campaignIds)
            .eq("status", "sent");

          const sentEmailSet = new Set((sentRecipients || []).map(r => r.email.toLowerCase()));
          setAlreadySentEmails(
            recipientsWithEmail.filter(u => sentEmailSet.has(u.email!.toLowerCase())).map(u => u.email!)
          );
        } else {
          setAlreadySentEmails([]);
        }

        // Check already-registered participants in target event
        const { data: eventParticipants } = await supabase
          .from("participants")
          .select("email")
          .eq("event_id", targetEventId)
          .not("email", "is", null);

        const registeredSet = new Set((eventParticipants || []).map(p => p.email!.toLowerCase()));
        setAlreadyRegisteredEmails(
          recipientsWithEmail.filter(u => registeredSet.has(u.email!.toLowerCase())).map(u => u.email!)
        );
      } catch (err) {
        console.error("Error checking duplicates:", err);
      } finally {
        setCheckingDuplicates(false);
      }
    };
    
    checkDuplicates();
  }, [step, targetEventId, organizer?.id, recipientsWithEmail]);
  const previewHtml = body
    .replace(/\{\{nombre\}\}/g, 'María García')
    .replace(/\{\{evento\}\}/g, targetEvent?.name || 'Evento de ejemplo')
    .replace(/\{\{enlace_inscripcion\}\}/g, registrationLink || '#');

  const steps: Step[] = ['recipients', 'event', 'compose', 'confirm'];
  const stepIdx = steps.indexOf(step);

  // Eligible recipients = those NOT already registered in target event
  const eligibleRecipients = useMemo(() => {
    if (!alreadyRegisteredEmails.length) return recipientsWithEmail;
    const registeredSet = new Set(alreadyRegisteredEmails.map(e => e.toLowerCase()));
    return recipientsWithEmail.filter(u => !registeredSet.has(u.email!.toLowerCase()));
  }, [recipientsWithEmail, alreadyRegisteredEmails]);

  const canProceed = () => {
    switch (step) {
      case 'recipients': return recipientsWithEmail.length > 0;
      case 'event': return !!targetEventId;
      case 'compose': return subject.trim().length > 0 && body.trim().length > 0;
      case 'confirm': return true;
    }
  };

  const handleSend = async () => {
    if (!user?.id || !organizer?.id) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-remarketing-email', {
        body: {
          organizer_id: organizer.id,
          target_event_id: targetEventId,
          target_event_name: targetEvent?.name || '',
          registration_link: registrationLink,
          subject,
          body,
          recipients: eligibleRecipients.map(u => ({
            global_participant_id: u.id,
            email: u.email!,
            name: u.display_name,
          })),
        },
      });

      if (error) throw error;
      toast({ title: "Campaña enviada", description: `Se enviaron ${eligibleRecipients.length} correos electrónicos` });
      onOpenChange(false);
      resetState();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "No se pudo enviar la campaña", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const resetState = () => {
    setStep('recipients');
    setRecipientMode('selected');
    setTargetEventId('');
    setSubject("Te invitamos a nuestro próximo evento");
    setBody(DEFAULT_BODY);
    setAlreadySentEmails([]);
    setAlreadyRegisteredEmails([]);
  };

  const stepLabels = ['Destinatarios', 'Evento', 'Correo', 'Confirmar'];

  return (
    <Dialog open={open} onOpenChange={open => { if (!open) resetState(); onOpenChange(open); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Campaña de remarketing
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-4">
          {stepLabels.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                i <= stepIdx ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {i + 1}
              </div>
              <span className={`text-sm hidden sm:inline ${i <= stepIdx ? 'text-foreground' : 'text-muted-foreground'}`}>
                {label}
              </span>
              {i < stepLabels.length - 1 && <Separator className="w-4" />}
            </div>
          ))}
        </div>

        {/* Step content */}
        {step === 'recipients' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">¿A quién quieres enviar la campaña?</p>
            <div className="grid grid-cols-2 gap-3">
              <Card className={`cursor-pointer transition-colors ${recipientMode === 'selected' ? 'border-primary' : ''}`}
                    onClick={() => setRecipientMode('selected')}>
                <CardContent className="pt-4 pb-3 px-4 text-center">
                  <Users className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="font-medium text-sm">Seleccionados</p>
                  <p className="text-xs text-muted-foreground">{selectedUsers.filter(u => u.email).length} con email</p>
                </CardContent>
              </Card>
              <Card className={`cursor-pointer transition-colors ${recipientMode === 'all' ? 'border-primary' : ''}`}
                    onClick={() => setRecipientMode('all')}>
                <CardContent className="pt-4 pb-3 px-4 text-center">
                  <Mail className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="font-medium text-sm">Todos</p>
                  <p className="text-xs text-muted-foreground">{allUsers.filter(u => u.email).length} con email</p>
                </CardContent>
              </Card>
            </div>
            {recipientsWithEmail.length === 0 && (
              <p className="text-sm text-destructive">No hay destinatarios con email. Selecciona usuarios con email válido.</p>
            )}
          </div>
        )}

        {step === 'event' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">¿Para qué evento quieres invitarles?</p>
            <Select value={targetEventId} onValueChange={setTargetEventId}>
              <SelectTrigger><SelectValue placeholder="Selecciona un evento..." /></SelectTrigger>
              <SelectContent>
                {upcomingEvents.map(e => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name} — {new Date(e.date).toLocaleDateString("es-ES")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {targetEventId && registrationLink && (
              <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                Enlace de inscripción: <code className="text-primary">{registrationLink}</code>
              </div>
            )}
          </div>
        )}

        {step === 'compose' && (
          <div className="space-y-4">
            <div>
              <Label>Asunto</Label>
              <Input value={subject} onChange={e => setSubject(e.target.value)} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Cuerpo del email</Label>
                <Button variant="ghost" size="sm" onClick={() => setShowPreview(!showPreview)}>
                  <Eye className="w-4 h-4 mr-1" />
                  {showPreview ? 'Editar' : 'Vista previa'}
                </Button>
              </div>
              {showPreview ? (
                <Card>
                  <CardContent className="p-4">
                    <RichTextRenderer content={previewHtml} />
                  </CardContent>
                </Card>
              ) : (
                <RichTextEditor value={body} onChange={setBody} />
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Variables disponibles: <code>{'{{nombre}}'}</code>, <code>{'{{evento}}'}</code>, <code>{'{{enlace_inscripcion}}'}</code>
              </p>
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-4">
            <h3 className="font-semibold">Resumen de la campaña</h3>

            {checkingDuplicates && (
              <p className="text-sm text-muted-foreground">Comprobando envíos anteriores...</p>
            )}

            {alreadySentEmails.length > 0 && !checkingDuplicates && (
              <Alert variant="destructive" className="border-yellow-500 bg-yellow-50 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-200">
                <AlertTriangle className="h-4 w-4 !text-yellow-600" />
                <AlertDescription>
                  <p className="font-medium mb-1">
                    {alreadySentEmails.length} destinatario{alreadySentEmails.length > 1 ? 's' : ''} ya recibió un correo para este evento:
                  </p>
                  <ul className="text-xs space-y-0.5 max-h-24 overflow-y-auto">
                    {alreadySentEmails.map(email => (
                      <li key={email}>• {email}</li>
                    ))}
                  </ul>
                  <p className="text-xs mt-2">Puedes continuar igualmente, pero estos usuarios recibirán el correo de nuevo.</p>
                </AlertDescription>
              </Alert>
            )}

            {alreadyRegisteredEmails.length > 0 && !checkingDuplicates && (
              <Alert className="border-destructive bg-destructive/10">
                <AlertTriangle className="h-4 w-4 !text-destructive" />
                <AlertDescription>
                  <p className="font-medium mb-1">
                    {alreadyRegisteredEmails.length} destinatario{alreadyRegisteredEmails.length > 1 ? 's' : ''} ya está{alreadyRegisteredEmails.length > 1 ? 'n' : ''} inscrito{alreadyRegisteredEmails.length > 1 ? 's' : ''} en este evento y no recibirá{alreadyRegisteredEmails.length > 1 ? 'n' : ''} el correo:
                  </p>
                  <ul className="text-xs space-y-0.5 max-h-24 overflow-y-auto">
                    {alreadyRegisteredEmails.map(email => (
                      <li key={email}>• {email}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Destinatarios seleccionados:</span>
                <Badge variant="secondary">{recipientsWithEmail.length} usuarios</Badge>
              </div>
              {alreadyRegisteredEmails.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ya inscritos (excluidos):</span>
                  <Badge variant="destructive">-{alreadyRegisteredEmails.length}</Badge>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Se enviarán:</span>
                <Badge>{eligibleRecipients.length} correos</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Evento objetivo:</span>
                <span className="font-medium">{targetEvent?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Asunto:</span>
                <span className="font-medium">{subject}</span>
              </div>
            </div>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-2">Vista previa:</p>
                <RichTextRenderer content={previewHtml} />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Button variant="outline" disabled={stepIdx === 0} onClick={() => setStep(steps[stepIdx - 1])}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Anterior
          </Button>
          {step === 'confirm' ? (
            <Button onClick={handleSend} disabled={sending || eligibleRecipients.length === 0}>
              <Send className="w-4 h-4 mr-2" />
              {sending ? 'Enviando...' : eligibleRecipients.length === 0 ? 'Sin destinatarios' : `Enviar a ${eligibleRecipients.length} usuarios`}
            </Button>
          ) : (
            <Button disabled={!canProceed()} onClick={() => setStep(steps[stepIdx + 1])}>
              Siguiente
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
