import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Pause, RotateCcw, Volume2 } from "lucide-react";

interface RoundTimerProps {
  roundDuration: number; // in minutes
  currentRound: number;
  totalRounds: number;
  onRoundComplete?: () => void;
}

const RoundTimer = ({ roundDuration, currentRound, totalRounds, onRoundComplete }: RoundTimerProps) => {
  const [timeLeft, setTimeLeft] = useState(roundDuration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const playSound = useCallback(() => {
    // Create a simple beep sound using Web Audio API
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

  useEffect(() => {
    setTimeLeft(roundDuration * 60);
    setIsRunning(false);
    setHasStarted(false);
  }, [currentRound, roundDuration]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            playSound();
            onRoundComplete?.();
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
  }, [isRunning, timeLeft, playSound, onRoundComplete]);

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

  const handleReset = () => {
    setTimeLeft(roundDuration * 60);
    setIsRunning(false);
    setHasStarted(false);
  };

  const progress = ((roundDuration * 60 - timeLeft) / (roundDuration * 60)) * 100;
  const isWarning = timeLeft <= 30 && timeLeft > 0;
  const isFinished = timeLeft === 0;

  return (
    <Card className={`transition-all duration-300 ${isWarning ? "border-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20" : ""} ${isFinished ? "border-green-500 bg-green-50/50 dark:bg-green-950/20" : ""}`}>
      <CardContent className="p-6">
        <div className="flex flex-col items-center gap-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">
              Ronda {currentRound} de {totalRounds}
            </p>
            <div className={`font-display text-5xl font-bold tabular-nums transition-colors ${isWarning ? "text-yellow-600" : ""} ${isFinished ? "text-green-600" : ""}`}>
              {formatTime(timeLeft)}
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ease-linear ${isWarning ? "bg-yellow-500" : "bg-primary"} ${isFinished ? "bg-green-500" : ""}`}
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            {!isRunning && !isFinished && (
              <Button variant="hero" size="lg" onClick={handleStart}>
                <Play className="w-5 h-5 mr-2" />
                {hasStarted ? "Continuar" : "Iniciar Ronda"}
              </Button>
            )}
            
            {isRunning && (
              <Button variant="outline" size="lg" onClick={handlePause}>
                <Pause className="w-5 h-5 mr-2" />
                Pausar
              </Button>
            )}

            {(hasStarted || isFinished) && (
              <Button variant="outline" size="icon" onClick={handleReset}>
                <RotateCcw className="w-4 h-4" />
              </Button>
            )}
          </div>

          {isFinished && (
            <p className="text-green-600 font-medium flex items-center gap-2">
              <Volume2 className="w-4 h-4" />
              ¡Ronda completada!
            </p>
          )}

          {isWarning && !isFinished && (
            <p className="text-yellow-600 text-sm animate-pulse">
              ¡Últimos 30 segundos!
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RoundTimer;
