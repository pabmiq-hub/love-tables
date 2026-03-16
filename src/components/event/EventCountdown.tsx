import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, CalendarDays, Info } from "lucide-react";
import { Language, translations } from "@/i18n/translations";

interface EventCountdownProps {
  eventName: string;
  eventDate: string;
  eventTime?: string | null;
  language?: Language;
  checkinOpensMinutesBefore?: number;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const EventCountdown = ({ eventName, eventDate, eventTime, language = "es", checkinOpensMinutesBefore = 60 }: EventCountdownProps) => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
  const t = language === "es" ? {
    countdown: "Cuenta atrás",
    days: "días",
    hours: "horas",
    minutes: "min",
    seconds: "seg",
    eventStartsIn: "El evento comienza en",
    checkinInfo: `El check-in se abrirá ${checkinOpensMinutesBefore} minutos antes del inicio del evento. En ese momento podrás acceder a tu cuenta de usuario.`,
    waitingForEvent: "Esperando al inicio del evento",
  } : {
    countdown: "Countdown",
    days: "days",
    hours: "hours",
    minutes: "min",
    seconds: "sec",
    eventStartsIn: "Event starts in",
    checkinInfo: `Check-in will open ${checkinOpensMinutesBefore} minutes before the event starts. You'll be able to access your user account then.`,
    waitingForEvent: "Waiting for the event to start",
  };

  useEffect(() => {
    const getTargetDate = () => {
      if (eventTime) {
        return new Date(`${eventDate}T${eventTime}`);
      }
      const d = new Date(eventDate);
      d.setHours(18, 0, 0, 0); // Default to 18:00
      return d;
    };

    const target = getTargetDate();

    const update = () => {
      const now = new Date();
      const diff = target.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft(null);
        return;
      }

      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [eventDate, eventTime]);

  if (!timeLeft) return null;

  const blocks = [
    { value: timeLeft.days, label: t.days },
    { value: timeLeft.hours, label: t.hours },
    { value: timeLeft.minutes, label: t.minutes },
    { value: timeLeft.seconds, label: t.seconds },
  ];

  return (
    <Card className="w-full max-w-md animate-scale-in bg-card/80 backdrop-blur-sm">
      <CardContent className="pt-8 pb-8 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <CalendarDays className="w-8 h-8 text-primary" />
        </div>

        <div>
          <h2 className="font-display text-xl font-bold mb-1">{eventName}</h2>
          <p className="text-sm text-muted-foreground">{t.eventStartsIn}</p>
        </div>

        <div className="flex justify-center gap-3">
          {blocks.map((block) => (
            <div key={block.label} className="flex flex-col items-center">
              <div className="bg-primary/10 rounded-xl w-16 h-16 flex items-center justify-center">
                <span className="text-2xl font-bold font-mono text-primary">
                  {String(block.value).padStart(2, "0")}
                </span>
              </div>
              <span className="text-xs text-muted-foreground mt-1.5 uppercase tracking-wide">
                {block.label}
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-start gap-2 bg-muted/50 rounded-lg p-3 text-left">
          <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">{t.checkinInfo}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default EventCountdown;
