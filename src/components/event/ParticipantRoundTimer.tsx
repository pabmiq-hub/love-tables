import { useState, useEffect, useCallback } from "react";
import { Timer, Clock, Check, Pause } from "lucide-react";
import { Language, translations } from "@/i18n/translations";

interface ParticipantRoundTimerProps {
  roundDuration: number; // in minutes
  activeRound: number;
  totalRounds: number;
  roundStartedAt: string | null;
  roundPausedAt: string | null;
  roundElapsedSeconds: number;
  completedRounds: number[];
  lang: Language;
}

const ParticipantRoundTimer = ({
  roundDuration,
  activeRound,
  totalRounds,
  roundStartedAt,
  roundPausedAt,
  roundElapsedSeconds,
  completedRounds,
  lang,
}: ParticipantRoundTimerProps) => {
  const totalSeconds = roundDuration * 60;
  const t = translations[lang];
  const isRoundCompleted = completedRounds.includes(activeRound);

  const calculateTimeLeft = useCallback(() => {
    if (!roundStartedAt) return totalSeconds;
    if (roundPausedAt) return Math.max(0, totalSeconds - roundElapsedSeconds);
    const startTime = new Date(roundStartedAt).getTime();
    const now = Date.now();
    const elapsedSinceStart = Math.floor((now - startTime) / 1000);
    const totalElapsed = roundElapsedSeconds + elapsedSinceStart;
    return Math.max(0, totalSeconds - totalElapsed);
  }, [roundStartedAt, roundPausedAt, roundElapsedSeconds, totalSeconds]);

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft);

  const isRunning = roundStartedAt !== null && roundPausedAt === null;
  const isPaused = roundStartedAt !== null && roundPausedAt !== null;
  const hasNotStarted = roundStartedAt === null;
  const isFinished = timeLeft === 0 && !hasNotStarted;
  const isWarning = timeLeft <= 30 && timeLeft > 0;

  useEffect(() => {
    setTimeLeft(calculateTimeLeft());
  }, [calculateTimeLeft]);

  useEffect(() => {
    if (!isRunning || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, timeLeft, calculateTimeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = ((totalSeconds - timeLeft) / totalSeconds) * 100;

  // All rounds completed
  if (isRoundCompleted && activeRound >= totalRounds) {
    return (
      <div className="bg-green-500/10 rounded-lg p-4 text-center space-y-2">
        <div className="flex items-center justify-center gap-2 text-green-600">
          <Check className="w-5 h-5" />
          <span className="font-medium">
            {lang === 'es' ? '¡Todas las rondas completadas!' : 'All rounds completed!'}
          </span>
        </div>
      </div>
    );
  }

  // Round not started yet
  if (hasNotStarted) {
    return (
      <div className="bg-muted rounded-lg p-4 text-center space-y-2">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Clock className="w-5 h-5" />
          <span className="font-medium">
            {t.access.round} {activeRound} {lang === 'es' ? 'de' : 'of'} {totalRounds}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {lang === 'es' ? 'La ronda aún no ha empezado' : 'The round has not started yet'}
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-lg p-4 text-center space-y-3 transition-colors ${
      isWarning ? 'bg-yellow-500/10' : isFinished ? 'bg-green-500/10' : 'bg-primary/5'
    }`}>
      <div className="flex items-center justify-center gap-2">
        <Timer className={`w-4 h-4 ${isWarning ? 'text-yellow-600' : isFinished ? 'text-green-600' : 'text-primary'}`} />
        <span className={`text-sm font-medium ${isWarning ? 'text-yellow-600' : isFinished ? 'text-green-600' : 'text-primary'}`}>
          {t.access.round} {activeRound} {lang === 'es' ? 'de' : 'of'} {totalRounds}
        </span>
      </div>

      <div className={`font-display text-4xl font-bold tabular-nums ${
        isWarning ? 'text-yellow-600' : isFinished ? 'text-green-600' : 'text-foreground'
      }`}>
        {formatTime(timeLeft)}
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ease-linear ${
            isWarning ? 'bg-yellow-500' : isFinished ? 'bg-green-500' : 'bg-primary'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {isPaused && (
        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
          <Pause className="w-3 h-3" />
          {lang === 'es' ? 'En pausa' : 'Paused'}
        </p>
      )}

      {isWarning && !isFinished && (
        <p className="text-xs text-yellow-600 animate-pulse">
          {lang === 'es' ? '¡Últimos 30 segundos!' : 'Last 30 seconds!'}
        </p>
      )}

      {isFinished && (
        <p className="text-xs text-green-600 font-medium">
          {lang === 'es' ? '¡Tiempo agotado! Espera instrucciones del organizador.' : 'Time is up! Wait for organizer instructions.'}
        </p>
      )}
    </div>
  );
};

export default ParticipantRoundTimer;
