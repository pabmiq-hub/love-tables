import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Sparkles, Check } from "lucide-react";

interface UpgradePromptProps {
  feature?: string;
  title?: string;
  description?: string;
  benefits?: string[];
  onUpgrade?: () => void;
}

export function UpgradePrompt({
  feature,
  title = "Mejora tu plan",
  description = "Desbloquea esta funcionalidad y muchas más con un plan superior",
  benefits = [
    "Más eventos activos",
    "Más participantes por evento",
    "Funcionalidades avanzadas",
    "Soporte prioritario",
  ],
  onUpgrade,
}: UpgradePromptProps) {
  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 mb-4">
          {benefits.map((benefit, index) => (
            <li key={index} className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-primary" />
              {benefit}
            </li>
          ))}
        </ul>
        <Button onClick={onUpgrade} className="w-full">
          <Sparkles className="h-4 w-4 mr-2" />
          Ver planes disponibles
        </Button>
      </CardContent>
    </Card>
  );
}

interface InlineUpgradeProps {
  message?: string;
  onUpgrade?: () => void;
}

export function InlineUpgrade({
  message = "Disponible en planes superiores",
  onUpgrade,
}: InlineUpgradeProps) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
      <Sparkles className="h-4 w-4 text-primary" />
      <span>{message}</span>
      <Button variant="link" size="sm" className="h-auto p-0" onClick={onUpgrade}>
        Mejorar
      </Button>
    </div>
  );
}
