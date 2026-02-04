import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Heart, KeyRound, Table2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import konektumLogo from "@/assets/konektum-logo.png";

interface TableAssignment {
  round: number;
  table: number;
}

const ParticipantTables = () => {
  const { id: eventId } = useParams();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [verificationCode, setVerificationCode] = useState(searchParams.get('code') || "");
  const [participantName, setParticipantName] = useState("");
  const [assignments, setAssignments] = useState<TableAssignment[]>([]);
  const [currentRound, setCurrentRound] = useState<number | null>(null);
  const [totalRounds, setTotalRounds] = useState<number>(0);
  const [isLoaded, setIsLoaded] = useState(false);
  
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

      setEventExists(true);
      setEventStatus(data.status);
      setIsLoading(false);

      // Auto-load if code is in URL and event is active/completed
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
        description: "Introduce un código de 6 dígitos",
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
        description: data?.error || "No se pudieron cargar las mesas",
        variant: "destructive",
      });
      setIsVerifying(false);
      return;
    }

    setParticipantName(data.participantName);
    setAssignments(data.assignments || []);
    setCurrentRound(data.currentRound);
    setTotalRounds(data.totalRounds);
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
            <h2 className="font-display text-xl font-semibold mb-2">Evento no encontrado</h2>
            <p className="text-muted-foreground">
              Este evento no existe o ha sido eliminado.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Event not started yet
  if (eventStatus === 'pending') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="font-display text-xl font-semibold mb-2">Evento no iniciado</h2>
            <p className="text-muted-foreground">
              Las asignaciones de mesa estarán disponibles cuando el evento haya comenzado.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Tables loaded successfully
  if (isLoaded) {
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
                <Table2 className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="font-display text-2xl">Tus mesas asignadas</CardTitle>
              <CardDescription>
                Hola, <span className="font-medium text-foreground">{participantName}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentRound && (
                <div className="bg-primary/10 rounded-lg p-3 text-center">
                  <p className="text-sm text-primary">
                    Ronda actual: <span className="font-bold">{currentRound}</span> de {totalRounds}
                  </p>
                </div>
              )}

              {assignments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Las mesas aún no han sido asignadas.</p>
                  <p className="text-sm mt-2">Espera a que el organizador genere las mesas.</p>
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
                          Ronda {assignment.round}
                        </span>
                        {currentRound === assignment.round && (
                          <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full animate-pulse">
                            AHORA
                          </span>
                        )}
                      </div>
                      <div className={`text-2xl font-bold ${
                        currentRound === assignment.round ? 'text-primary' : 'text-foreground'
                      }`}>
                        Mesa {assignment.table}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-center text-muted-foreground pt-4">
                Busca el número de tu mesa en el local
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Code input form
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
              <KeyRound className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="font-display text-2xl">Ver mis mesas</CardTitle>
            <CardDescription>
              Introduce tu código de verificación para ver tus mesas asignadas
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
              onClick={handleLoadTables}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cargando...
                </>
              ) : (
                <>
                  <Table2 className="w-4 h-4 mr-2" />
                  Ver mis mesas
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Tu código está en el email que recibiste al registrarte
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ParticipantTables;
