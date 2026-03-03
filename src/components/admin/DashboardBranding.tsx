import { Palette } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function DashboardBranding() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold mb-1">Marca blanca</h1>
        <p className="text-muted-foreground">Personaliza la experiencia con tu marca</p>
      </div>

      <Card>
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Palette className="w-8 h-8 text-primary" />
          </div>
          <h3 className="font-display text-xl font-semibold mb-2">Próximamente</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Pronto podrás personalizar colores, tipografías y la experiencia completa de tus participantes con tu propia marca.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
