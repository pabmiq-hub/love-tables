import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Heart, KeyRound, Table2, AlertCircle } from "lucide-react";
import ParticipantRoundTimer from "@/components/event/ParticipantRoundTimer";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { BrandedHeader, BrandedLogo } from "@/components/BrandedHeader";
import { useEventBranding } from "@/hooks/useEventBranding";
import { translations, Language } from "@/i18n/translations";

interface TableAssignment {
  round: number;
  table: number;
}

const ParticipantTables = () => {
  const { id: eventId } = useParams();
  const eb = useEventBranding(eventId);
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [eventLang, setEventLang] = useState<Language>("es");
  const t = translations[eventLang];

  const [verificationCode, setVerificationCode] = useState(searchParams.get('code') || "");
  const [participantName, setParticipantName] = useState("");
  const [assignments, setAssignments] = useState<TableAssignment[]>([]);
  const [currentRound, setCurrentRound] = useState<number | null>(null);
  const [totalRounds, setTotalRounds] = useState<number>(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [timerData, setTimerData] = useState<{
    roundDuration: number;
    roundStartedAt: string | null;
    roundPausedAt: string | null;
    roundElapsedSeconds: number;
    completedRounds: number[];
  } | null>(null);
  
  const [eventExists, setEventExists] = useState<boolean | null>(null);
  const [eventStatus, setEventStatus] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    const checkEvent = async () => {
      if (!eventId) {
        setEventExists(false);
        setIsLoading(false);
        return;
      }

      const { data, error } = await (supabase as any)
        .from("events_public")
        .select("id, status, language")
        .eq("id", eventId)
        .single();

      if (error || !data) {
        setEventExists(false);
        setIsLoading(false);
        return;
      }

      if (data.language === 'en' || data.language === 'es') {
        setEventLang(data.language as Language);
      }

      setEventExists(true);
      setEventStatus(data.status);
      setIsLoading(false);

      if (searchParams.get('code') && (data.status === 'active' || data.status === 'completed')) {
        handleLoadTables();
      }
    };

    checkEvent();
  }, [eventId]);

  const handleLoadTables = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        title: "Error",
        description: t.tables.errorNoCode,
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);

    const { data, error } = await supabase.functions.invoke('get-table-assignments', {
      body: { eventId, verificationCode }
    });

    if (error || data?.error) {
      toast({
        title: "Error",
        description: data?.error || "Error",
        variant: "destructive",
      });
      setIsVerifying(false);
      return;
    }

    setParticipantName(data.participantName);
    setAssignments(data.assignments || []);
    setCurrentRound(data.currentRound);
    setTotalRounds(data.totalRounds);
    if (data.timer) {
      setTimerData(data.timer);
    }
    setIsLoaded(true);
    setIsVerifying(false);
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
            <h2 className="font-display text-xl font-semibold mb-2">{t.tables.eventNotFound}</h2>
            <p className="text-muted-foreground">{t.tables.eventNotFoundDesc}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (eventStatus === 'pending') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="font-display text-xl font-semibold mb-2">{t.tables.eventNotStarted}</h2>
            <p className="text-muted-foreground">{t.tables.eventNotStartedDesc}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoaded) {
    return (
      <div className="min-h-screen bg-background">
        <BrandedHeader logoUrl={eb.logoUrl} companyName={eb.companyName} isWhiteLabel={eb.isWhiteLabel} centered />

        <main className="container mx-auto px-4 py-8 max-w-md">
          <Card className="animate-fade-in">
            <CardHeader className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Table2 className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="font-display text-2xl">{t.tables.yourTables}</CardTitle>
              <CardDescription>
                {t.tables.hello} <span className="font-medium text-foreground">{participantName}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Round Timer */}
              {timerData && currentRound && currentRound > 0 && (
                <ParticipantRoundTimer
                  roundDuration={timerData.roundDuration}
                  activeRound={currentRound}
                  totalRounds={totalRounds}
                  roundStartedAt={timerData.roundStartedAt}
                  roundPausedAt={timerData.roundPausedAt}
                  roundElapsedSeconds={timerData.roundElapsedSeconds}
                  completedRounds={timerData.completedRounds}
                  lang={eventLang}
                />
              )}

              {currentRound && !timerData && (
                <div className="bg-primary/10 rounded-lg p-3 text-center">
                  <p className="text-sm text-primary">
                    {t.tables.currentRound} <span className="font-bold">{currentRound}</span> {t.tables.of} {totalRounds}
                  </p>
                </div>
              )}
              {assignments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>{t.tables.noTablesYet}</p>
                  <p className="text-sm mt-2">{t.tables.waitForOrganizer}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {assignments.map((assignment) => (
                    <div
                      key={assignment.round}
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        currentRound === assignment.round
                          ? 'bg-primary/10 border-primary'
                          : 'bg-muted/50 border-border'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-medium ${
                          currentRound === assignment.round ? 'text-primary' : 'text-muted-foreground'
                        }`}>
                          {assignment.round === 0 ? t.tables.round + ' 0 — ' + (eventLang === 'es' ? 'Bienvenida' : 'Welcome') : `${t.tables.round} ${assignment.round}`}
                        </span>
                        {currentRound === assignment.round && (
                          <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full animate-pulse">
                            {t.tables.now}
                          </span>
                        )}
                      </div>
                      <div className={`text-2xl font-bold ${
                        currentRound === assignment.round ? 'text-primary' : 'text-foreground'
                      }`}>
                        {t.tables.table} {assignment.table}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-center text-muted-foreground pt-4">
                {t.tables.findTable}
              </p>
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
            <CardTitle className="font-display text-2xl">{t.tables.title}</CardTitle>
            <CardDescription>{t.tables.subtitle}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="code">{t.tables.verificationCode}</Label>
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
              onClick={handleLoadTables}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t.tables.loading}
                </>
              ) : (
                <>
                  <Table2 className="w-4 h-4 mr-2" />
                  {t.tables.viewTables}
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              {t.tables.codeHint}
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ParticipantTables;
