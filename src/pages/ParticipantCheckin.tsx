import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Loader2, Heart, KeyRound, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import konektumLogo from "@/assets/konektum-logo.png";

interface ParticipantInfo {
  id: string;
  name: string;
  email: string;
  gender: string;
  ageRange: string;
}

const ParticipantCheckin = () => {
  const { id: eventId } = useParams();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
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
        .select("id, status")
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

      setEventExists(true);
      setIsLoading(false);

      // Auto-verify if code is in URL
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
        description: "Introduce un código de 6 dígitos",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);

    // Check participant by verification code without doing check-in yet
    const { data, error } = await supabase.functions.invoke('get-event-participants', {
      body: { eventId, type: 'verify', verificationCode }
    });

    if (error || data?.error) {
      toast({
        title: "Código incorrecto",
        description: "El código introducido no es válido para este evento",
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
      // Check if already checked in
      if (data?.participant?.alreadyCheckedIn) {
        setAlreadyCheckedIn(true);
        setIsCheckedIn(true);
      } else {
        toast({
          title: "Error",
          description: data?.error || "No se pudo realizar el check-in",
          variant: "destructive",
        });
      }
      setIsConfirming(false);
      return;
    }

    setIsCheckedIn(true);
    setIsConfirming(false);
    toast({
      title: "¡Check-in completado!",
      description: "Ya estás registrado para el evento",
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
            <h2 className="font-display text-xl font-semibold mb-2">Evento no disponible</h2>
            <p className="text-muted-foreground">
              Este evento no existe o el check-in está cerrado.
            </p>
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
              {alreadyCheckedIn ? "Ya tenías check-in" : "¡Check-in completado!"}
            </h2>
            <p className="text-muted-foreground mb-4">
              {alreadyCheckedIn 
                ? "Tu check-in ya estaba confirmado anteriormente."
                : "Ya estás registrado. Espera a que comience el evento."
              }
            </p>
            {participantInfo && (
              <div className="bg-muted/50 rounded-lg p-4 mb-4 text-left">
                <p className="font-medium">{participantInfo.name}</p>
                <p className="text-sm text-muted-foreground">{participantInfo.email}</p>
              </div>
            )}
            <div className="flex items-center justify-center gap-2">
              <img src={konektumLogo} alt="Konektum" className="h-10 w-auto" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If we have participant info, show confirmation screen
  if (participantInfo) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 h-16 flex items-center justify-center">
            <img src={konektumLogo} alt="Konektum" className="h-9 w-auto" />
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 max-w-md">
          <Card className="animate-fade-in">
            <CardHeader className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="font-display text-2xl">Confirma tu identidad</CardTitle>
              <CardDescription>
                ¿Eres tú?
              </CardDescription>
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
                    Ya has realizado el check-in previamente
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
                    No soy yo
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
                        Confirmando...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Sí, confirmar
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
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-center">
          <img src={konektumLogo} alt="Konektum" className="h-9 w-auto" />
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8 max-w-md">
        <Card className="animate-fade-in">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <KeyRound className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="font-display text-2xl">Check-in</CardTitle>
            <CardDescription>
              Introduce el código de 6 dígitos que recibiste por email
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="code">Código de verificación</Label>
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
                  Verificando...
                </>
              ) : (
                "Verificar código"
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Si no recibiste el código, revisa tu carpeta de spam o contacta con el organizador.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ParticipantCheckin;
