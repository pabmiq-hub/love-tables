import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { AlertCircle, CheckCircle2, Loader2, MailX } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BrandedFooter, BrandedHeader } from "@/components/BrandedHeader";
import { useEventBranding } from "@/hooks/useEventBranding";
import { supabase } from "@/integrations/supabase/client";

type ViewState = "loading" | "ready" | "submitting" | "success" | "error";
type EventLanguage = "es" | "en";

const COPY = {
  es: {
    title: "Confirmar baja del evento",
    description: "Si continúas, avisaremos al organizador y tu registro quedará conservado como no asistente por si debe recuperarse más adelante.",
    invalidLink: "El enlace de baja no es válido o está incompleto.",
    genericError: "No hemos podido tramitar la baja. Inténtalo de nuevo desde el enlace del correo.",
    confirm: "Confirmar baja",
    sending: "Procesando baja…",
    successTitle: "Baja confirmada",
    successDescription: "Ya hemos avisado al organizador y tu asistencia ha quedado marcada como cancelada.",
    backHome: "Volver al inicio",
    retry: "Reintentar",
    loadingEvent: "Preparando tu solicitud…",
  },
  en: {
    title: "Confirm event cancellation",
    description: "If you continue, we will notify the organizer and keep your record as a non-attendee in case it needs to be restored later.",
    invalidLink: "This cancellation link is invalid or incomplete.",
    genericError: "We could not process your cancellation. Please try again from the email link.",
    confirm: "Confirm cancellation",
    sending: "Processing cancellation…",
    successTitle: "Cancellation confirmed",
    successDescription: "We have already notified the organizer and marked your attendance as cancelled.",
    backHome: "Back to home",
    retry: "Try again",
    loadingEvent: "Preparing your request…",
  },
} satisfies Record<EventLanguage, Record<string, string>>;

const ParticipantCancellation = () => {
  const { id: eventId, participantId } = useParams<{ id: string; participantId: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const branding = useEventBranding(eventId);

  const [status, setStatus] = useState<ViewState>("loading");
  const [eventName, setEventName] = useState("");
  const [eventLang, setEventLang] = useState<EventLanguage>("es");
  const [errorMessage, setErrorMessage] = useState("");

  const copy = useMemo(() => COPY[eventLang], [eventLang]);

  useEffect(() => {
    let cancelled = false;

    const loadEvent = async () => {
      if (!eventId || !participantId || !token) {
        setStatus("error");
        setErrorMessage(COPY.es.invalidLink);
        return;
      }

      const { data } = await supabase
        .from("events")
        .select("name, language")
        .eq("id", eventId)
        .maybeSingle();

      if (cancelled) return;

      if (data?.language === "en") {
        setEventLang("en");
      }

      if (data?.name) {
        setEventName(data.name);
      }

      setStatus("ready");
    };

    loadEvent();

    return () => {
      cancelled = true;
    };
  }, [eventId, participantId, token]);

  const handleConfirm = async () => {
    if (!eventId || !participantId || !token) {
      setStatus("error");
      setErrorMessage(copy.invalidLink);
      return;
    }

    setStatus("submitting");
    setErrorMessage("");

    const { data, error } = await supabase.functions.invoke("handle-participant-cancellation", {
      body: {
        event_id: eventId,
        participant_id: participantId,
        token,
      },
    });

    if (error || data?.error) {
      setStatus("error");
      setErrorMessage(data?.error || error?.message || copy.genericError);
      return;
    }

    setStatus("success");
  };

  return (
    <div className="min-h-screen bg-muted/40">
      <BrandedHeader
        centered
        logoUrl={branding.logoUrl}
        companyName={branding.companyName}
        isWhiteLabel={branding.isWhiteLabel}
        backgroundColor={branding.backgroundColor}
        fontFamily={branding.fontFamily}
      />

      <main className="container mx-auto flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10">
        <Card className="w-full max-w-xl shadow-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              {status === "success" ? (
                <CheckCircle2 className="h-7 w-7" />
              ) : status === "error" ? (
                <AlertCircle className="h-7 w-7" />
              ) : status === "submitting" || status === "loading" ? (
                <Loader2 className="h-7 w-7 animate-spin" />
              ) : (
                <MailX className="h-7 w-7" />
              )}
            </div>
            <CardTitle>{status === "success" ? copy.successTitle : copy.title}</CardTitle>
            <CardDescription>
              {status === "loading"
                ? copy.loadingEvent
                : status === "success"
                  ? copy.successDescription
                  : copy.description}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 text-center">
            {eventName ? <p className="text-sm text-muted-foreground">{eventName}</p> : null}

            {status === "error" ? (
              <p className="text-sm text-destructive">{errorMessage || copy.genericError}</p>
            ) : null}

            {status === "ready" ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button onClick={handleConfirm}>{copy.confirm}</Button>
                <Button variant="outline" onClick={() => (window.location.href = "/")}>
                  {copy.backHome}
                </Button>
              </div>
            ) : null}

            {status === "submitting" ? (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{copy.sending}</span>
              </div>
            ) : null}

            {status === "success" ? (
              <Button onClick={() => (window.location.href = "/")}>{copy.backHome}</Button>
            ) : null}

            {status === "error" ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button onClick={handleConfirm} disabled={!eventId || !participantId || !token}>
                  {copy.retry}
                </Button>
                <Button variant="outline" onClick={() => (window.location.href = "/")}>
                  {copy.backHome}
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </main>

      <BrandedFooter
        isWhiteLabel={branding.isWhiteLabel}
        hideKonektumBranding={branding.hideKonektumBranding}
        customFooterText={branding.customFooterText}
      />
    </div>
  );
};

export default ParticipantCancellation;