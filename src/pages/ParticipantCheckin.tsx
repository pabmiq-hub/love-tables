import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Loader2, Heart, KeyRound, User } from "lucide-react";
import EventCountdown from "@/components/event/EventCountdown";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { BrandedHeader, BrandedLogo } from "@/components/BrandedHeader";
import { useEventBranding } from "@/hooks/useEventBranding";
import { translations, Language } from "@/i18n/translations";

interface ParticipantInfo {
  id: string;
  name: string;
  email: string;
  gender: string;
  ageRange: string;
}

const ParticipantCheckin = () => {
  const { id: eventId } = useParams();
  const eb = useEventBranding(eventId);
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [eventLang, setEventLang] = useState<Language>("es");
  const t = translations[eventLang];

  const [verificationCode, setVerificationCode] = useState(searchParams.get('code') || "");
  const [participantInfo, setParticipantInfo] = useState<ParticipantInfo | null>(null);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false);
  const [eventExists, setEventExists] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    const checkEvent = async () => {
      if (!eventId) {
        setEventExists(false);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("events")
        .select("id, status, language, date, event_time, checkin_open, checkin_opens_minutes_before")
        .eq("id", eventId)
        .single();

      if (error || !data) {
        setEventExists(false);
        setIsLoading(false);
        return;
      }

      if (data.status !== 'pending') {
        setEventExists(false);
        setIsLoading(false);
        return;
      }

      // Check if check-in is allowed based on timing or manual override
      const checkinOpen = (data as any).checkin_open;
      const checkinMinutes = (data as any).checkin_opens_minutes_before ?? 60;
      
      let isCheckinAllowed = checkinOpen; // Manual override
      
      if (!isCheckinAllowed && checkinMinutes > 0 && data.date && (data as any).event_time) {
        // Calculate if we're within the check-in window
        const eventDateTime = new Date(`${data.date}T${(data as any).event_time}`);
        const checkinOpensAt = new Date(eventDateTime.getTime() - checkinMinutes * 60 * 1000);
        isCheckinAllowed = new Date() >= checkinOpensAt;
      } else if (!isCheckinAllowed && checkinMinutes === 99999) {
        isCheckinAllowed = true; // Always open
      }

      if (!isCheckinAllowed) {
        setEventExists(false);
        setIsLoading(false);
        return;
      }

      if (data.language === 'en' || data.language === 'es') {
        setEventLang(data.language as Language);
      }

      setEventExists(true);
      setIsLoading(false);

      if (searchParams.get('code')) {
        handleVerifyCode();
      }
    };

    checkEvent();
  }, [eventId]);

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        title: "Error",
        description: t.tables.errorNoCode,
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);

    const { data, error } = await supabase.functions.invoke('get-event-participants', {
      body: { eventId, type: 'verify', verificationCode }
    });

    if (error || data?.error) {
      toast({
        title: t.select.invalidCode,
        description: t.select.invalidCodeDesc,
        variant: "destructive",
      });
      setIsVerifying(false);
      return;
    }

    if (data.participant) {
      setParticipantInfo(data.participant);
      if (data.participant.alreadyCheckedIn) {
        setAlreadyCheckedIn(true);
      }
    }
    
    setIsVerifying(false);
  };

  const handleConfirmCheckin = async () => {
    if (!participantInfo) return;

    setIsConfirming(true);

    const { data, error } = await supabase.functions.invoke('checkin-participant', {
      body: { eventId, verificationCode }
    });

    if (error || data?.error) {
      if (data?.participant?.alreadyCheckedIn) {
        setAlreadyCheckedIn(true);
        setIsCheckedIn(true);
      } else {
        toast({
          title: "Error",
          description: data?.error || "Error",
          variant: "destructive",
        });
      }
      setIsConfirming(false);
      return;
    }

    setIsCheckedIn(true);
    setIsConfirming(false);
    toast({
      title: t.checkin.checkinComplete,
      description: t.checkin.successMsg,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!eventExists) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="font-display text-xl font-semibold mb-2">{t.checkin.eventNotAvailable}</h2>
            <p className="text-muted-foreground">{t.checkin.eventNotAvailableDesc}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isCheckedIn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center animate-scale-in">
          <CardContent className="pt-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <h2 className="font-display text-xl font-semibold mb-2">
              {alreadyCheckedIn ? t.checkin.alreadyCheckedIn : t.checkin.checkinComplete}
            </h2>
            <p className="text-muted-foreground mb-4">
              {alreadyCheckedIn ? t.checkin.alreadyCheckedInDesc : t.checkin.waitForEvent}
            </p>
            {participantInfo && (
              <div className="bg-muted/50 rounded-lg p-4 mb-4 text-left">
                <p className="font-medium">{participantInfo.name}</p>
                <p className="text-sm text-muted-foreground">{participantInfo.email}</p>
              </div>
            )}
            <div className="flex items-center justify-center gap-2">
              <BrandedLogo logoUrl={eb.logoUrl} companyName={eb.companyName} isWhiteLabel={eb.isWhiteLabel} />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (participantInfo) {
    return (
      <div className="min-h-screen bg-background">
      <BrandedHeader logoUrl={eb.logoUrl} companyName={eb.companyName} isWhiteLabel={eb.isWhiteLabel} centered />

        <main className="container mx-auto px-4 py-8 max-w-md">
          <Card className="animate-fade-in">
            <CardHeader className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="font-display text-2xl">{t.checkin.confirmIdentity}</CardTitle>
              <CardDescription>{t.checkin.areYouThis}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="font-semibold text-lg">{participantInfo.name}</p>
                <p className="text-sm text-muted-foreground">{participantInfo.email}</p>
                <div className="flex gap-2 text-sm">
                  <span className="bg-primary/10 text-primary px-2 py-0.5 rounded">{participantInfo.gender}</span>
                  <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded">{participantInfo.ageRange}</span>
                </div>
              </div>

              {alreadyCheckedIn ? (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-3 text-center">
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    {t.checkin.alreadyCheckedInWarning}
                  </p>
                </div>
              ) : (
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setParticipantInfo(null);
                      setVerificationCode("");
                    }}
                  >
                    {t.checkin.notMe}
                  </Button>
                  <Button
                    variant="hero"
                    className="flex-1"
                    onClick={handleConfirmCheckin}
                    disabled={isConfirming}
                  >
                    {isConfirming ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t.checkin.confirming}
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        {t.checkin.yesConfirm}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <BrandedHeader logoUrl={eb.logoUrl} companyName={eb.companyName} isWhiteLabel={eb.isWhiteLabel} centered />

      <main className="container mx-auto px-4 py-8 max-w-md">
        <Card className="animate-fade-in">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <KeyRound className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="font-display text-2xl">{t.checkin.title}</CardTitle>
            <CardDescription>{t.checkin.subtitle}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="code">{t.checkin.verificationCode}</Label>
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="text-center text-2xl font-mono tracking-widest"
              />
            </div>

            <Button
              variant="hero"
              className="w-full"
              disabled={verificationCode.length !== 6 || isVerifying}
              onClick={handleVerifyCode}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t.checkin.verifying}
                </>
              ) : (
                t.checkin.verify
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              {t.checkin.noCodeHint}
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ParticipantCheckin;
