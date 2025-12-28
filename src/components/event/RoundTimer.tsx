import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Pause, StopCircle, SkipForward, Volume2, Check, Circle, Lock } from "lucide-react";

interface RoundTimerProps {
  roundDuration: number; // in minutes
  activeRound: number; // The current active round from DB
  completedRounds: number[]; // Array of completed round numbers
  totalRounds: number;
  onCompleteRound: (roundNumber: number) => void; // Called when a round is completed
}

const RoundTimer = ({ 
  roundDuration, 
  activeRound, 
  completedRounds,
  totalRounds, 
  onCompleteRound,
}: RoundTimerProps) => {
  const [timeLeft, setTimeLeft] = useState(roundDuration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const isRoundCompleted = (round: number) => completedRounds.includes(round);
  const isRoundActive = (round: number) => round === activeRound && !isRoundCompleted(round);
  const isRoundPending = (round: number) => round > activeRound || (round < activeRound && !isRoundCompleted(round));

  const playSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = "sine";
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.log("Audio not supported");
    }
  }, []);

  // Reset timer when active round changes
  useEffect(() => {
    setTimeLeft(roundDuration * 60);
    setIsRunning(false);
    setHasStarted(false);
  }, [activeRound, roundDuration]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            playSound();
            return 0;
          }
          // Play warning sound at 30 seconds
          if (prev === 31) {
            playSound();
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning, timeLeft, playSound]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStart = () => {
    setIsRunning(true);
    setHasStarted(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleCloseRound = () => {
    setIsRunning(false);
    onCompleteRound(activeRound);
  };

  const handleNextRound = () => {
    onCompleteRound(activeRound);
  };

  const progress = ((roundDuration * 60 - timeLeft) / (roundDuration * 60)) * 100;
  const isWarning = timeLeft <= 30 && timeLeft > 0;
  const isTimerFinished = timeLeft === 0;
  const isLastRound = activeRound >= totalRounds;
  const isCurrentRoundCompleted = isRoundCompleted(activeRound);

  // Generate round indicators
  const roundIndicators = [];
  for (let i = 1; i <= totalRounds; i++) {
    const completed = isRoundCompleted(i);
    const active = isRoundActive(i);
    const pending = i > activeRound;

    roundIndicators.push(
      <div
        key={i}
        className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium transition-all ${
          completed
            ? "bg-green-500 text-white"
            : active
            ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2"
            : "bg-muted text-muted-foreground"
        }`}
        title={completed ? `Ronda ${i} completada` : active ? `Ronda ${i} activa` : `Ronda ${i} pendiente`}
      >
        {completed ? (
          <Check className="w-5 h-5" />
        ) : active ? (
          i
        ) : (
          <Lock className="w-4 h-4" />
        )}
      </div>
    );
  }

  return (
    <Card className={`transition-all duration-300 ${isWarning ? "border-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20" : ""} ${isTimerFinished && !isCurrentRoundCompleted ? "border-green-500 bg-green-50/50 dark:bg-green-950/20" : ""}`}>
      <CardContent className="p-6">
        <div className="flex flex-col items-center gap-4">
          {/* Round progress indicators */}
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {roundIndicators}
          </div>

          {/* Show timer only for active round that's not completed */}
          {!isCurrentRoundCompleted && (
            <>
              <div className="text-center">
                <p className="text-lg font-semibold text-primary mb-1">
                  Ronda {activeRound} de {totalRounds}
                </p>
                <div className={`font-display text-5xl font-bold tabular-nums transition-colors ${isWarning ? "text-yellow-600" : ""} ${isTimerFinished ? "text-green-600" : ""}`}>
                  {formatTime(timeLeft)}
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 ease-linear ${isWarning ? "bg-yellow-500" : "bg-primary"} ${isTimerFinished ? "bg-green-500" : ""}`}
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Controls */}
              <div className="flex items-center gap-3 flex-wrap justify-center">
                {/* Start/Continue button - only if timer not finished */}
                {!isRunning && !isTimerFinished && (
                  <Button variant="hero" size="lg" onClick={handleStart}>
                    <Play className="w-5 h-5 mr-2" />
                    {hasStarted ? "Continuar" : "Iniciar Ronda"}
                  </Button>
                )}
                
                {/* Pause button */}
                {isRunning && (
                  <Button variant="outline" size="lg" onClick={handlePause}>
                    <Pause className="w-5 h-5 mr-2" />
                    Pausar
                  </Button>
                )}

                {/* Close round button - available when timer is running or paused */}
                {hasStarted && !isTimerFinished && (
                  <Button 
                    variant="destructive" 
                    size="lg" 
                    onClick={handleCloseRound}
                  >
                    <StopCircle className="w-5 h-5 mr-2" />
                    Cerrar Ronda
                  </Button>
                )}

                {/* Next round button - only when timer finished */}
                {isTimerFinished && !isLastRound && (
                  <Button 
                    variant="hero" 
                    size="lg" 
                    onClick={handleNextRound}
                  >
                    <SkipForward className="w-5 h-5 mr-2" />
                    Siguiente Ronda
                  </Button>
                )}

                {/* Complete event button - only when timer finished on last round */}
                {isTimerFinished && isLastRound && (
                  <Button 
                    variant="hero" 
                    size="lg" 
                    onClick={handleCloseRound}
                  >
                    <Check className="w-5 h-5 mr-2" />
                    Finalizar Rondas
                  </Button>
                )}
              </div>

              {isTimerFinished && (
                <p className="text-green-600 font-medium flex items-center gap-2">
                  <Volume2 className="w-4 h-4" />
                  ¡Tiempo de ronda agotado!
                </p>
              )}

              {isWarning && !isTimerFinished && (
                <p className="text-yellow-600 text-sm animate-pulse">
                  ¡Últimos 30 segundos!
                </p>
              )}
            </>
          )}

          {/* Show completed message when all rounds are done */}
          {isCurrentRoundCompleted && isLastRound && (
            <div className="text-center py-4">
              <p className="text-green-600 font-medium text-lg flex items-center justify-center gap-2">
                <Check className="w-5 h-5" />
                ¡Todas las rondas completadas!
              </p>
              <p className="text-muted-foreground mt-2">
                Los participantes pueden seguir enviando selecciones.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RoundTimer;
