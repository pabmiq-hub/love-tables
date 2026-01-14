import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Pause, StopCircle, SkipForward, Volume2, Check, Lock } from "lucide-react";

interface RoundTimerProps {
  roundDuration: number; // in minutes
  activeRound: number; // The current active round from DB
  completedRounds: number[]; // Array of completed round numbers
  totalRounds: number;
  onCompleteRound: (roundNumber: number) => void; // Called when a round is completed
  // Timer persistence props
  roundStartedAt: string | null;
  roundPausedAt: string | null;
  roundElapsedSeconds: number;
  onTimerStart: () => void;
  onTimerPause: (elapsedSeconds: number) => void;
  onTimerResume: () => void;
}

const RoundTimer = ({ 
  roundDuration, 
  activeRound, 
  completedRounds,
  totalRounds, 
  onCompleteRound,
  roundStartedAt,
  roundPausedAt,
  roundElapsedSeconds,
  onTimerStart,
  onTimerPause,
  onTimerResume,
}: RoundTimerProps) => {
  const totalSeconds = roundDuration * 60;
  
  // Calculate initial time left based on persisted state
  const calculateTimeLeft = useCallback(() => {
    if (!roundStartedAt) {
      // Timer never started for this round
      return totalSeconds;
    }
    
    if (roundPausedAt) {
      // Timer is paused - return time left at pause
      return Math.max(0, totalSeconds - roundElapsedSeconds);
    }
    
    // Timer is running - calculate based on start time
    const startTime = new Date(roundStartedAt).getTime();
    const now = Date.now();
    const elapsedSinceStart = Math.floor((now - startTime) / 1000);
    const totalElapsed = roundElapsedSeconds + elapsedSinceStart;
    return Math.max(0, totalSeconds - totalElapsed);
  }, [roundStartedAt, roundPausedAt, roundElapsedSeconds, totalSeconds]);

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft);
  const [localIsRunning, setLocalIsRunning] = useState(false);

  // Determine if timer is running from persisted state
  const isTimerRunning = roundStartedAt !== null && roundPausedAt === null;
  const hasStarted = roundStartedAt !== null;

  const isRoundCompleted = (round: number) => completedRounds.includes(round);

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

  // Sync local running state with persisted state
  useEffect(() => {
    setLocalIsRunning(isTimerRunning);
    setTimeLeft(calculateTimeLeft());
  }, [isTimerRunning, calculateTimeLeft]);

  // Timer countdown effect
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (localIsRunning && timeLeft > 0) {
      interval = setInterval(() => {
        const newTimeLeft = calculateTimeLeft();
        setTimeLeft(newTimeLeft);
        
        // Play warning sound at 30 seconds
        if (newTimeLeft === 30) {
          playSound();
        }
        
        // Timer finished
        if (newTimeLeft <= 0) {
          setLocalIsRunning(false);
          playSound();
        }
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [localIsRunning, timeLeft, calculateTimeLeft, playSound]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStart = () => {
    setLocalIsRunning(true);
    onTimerStart();
  };

  const handlePause = () => {
    const currentElapsed = totalSeconds - timeLeft;
    setLocalIsRunning(false);
    onTimerPause(currentElapsed);
  };

  const handleResume = () => {
    setLocalIsRunning(true);
    onTimerResume();
  };

  const handleCloseRound = () => {
    setLocalIsRunning(false);
    onCompleteRound(activeRound);
  };

  const handleNextRound = () => {
    onCompleteRound(activeRound);
  };

  const progress = ((totalSeconds - timeLeft) / totalSeconds) * 100;
  const isWarning = timeLeft <= 30 && timeLeft > 0;
  const isTimerFinished = timeLeft === 0;
  const isLastRound = activeRound >= totalRounds;
  const isCurrentRoundCompleted = isRoundCompleted(activeRound);
  const isPaused = hasStarted && roundPausedAt !== null;

  // Generate round indicators
  const roundIndicators = [];
  for (let i = 1; i <= totalRounds; i++) {
    const completed = isRoundCompleted(i);
    const active = i === activeRound && !completed;
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
                {/* Start button - only if timer never started */}
                {!hasStarted && !isTimerFinished && (
                  <Button variant="hero" size="lg" onClick={handleStart}>
                    <Play className="w-5 h-5 mr-2" />
                    Iniciar Ronda
                  </Button>
                )}

                {/* Resume button - only if paused */}
                {isPaused && !isTimerFinished && (
                  <Button variant="hero" size="lg" onClick={handleResume}>
                    <Play className="w-5 h-5 mr-2" />
                    Continuar
                  </Button>
                )}
                
                {/* Pause button */}
                {localIsRunning && (
                  <Button variant="outline" size="lg" onClick={handlePause}>
                    <Pause className="w-5 h-5 mr-2" />
                    Pausar
                  </Button>
                )}

                {/* Close round button - available when timer has started and not finished */}
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

              {isPaused && !isTimerFinished && (
                <p className="text-muted-foreground text-sm flex items-center gap-2">
                  <Pause className="w-4 h-4" />
                  Temporizador en pausa
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
