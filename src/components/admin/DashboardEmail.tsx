import { EmailConnectionManager } from "@/components/email/EmailConnectionManager";

export function DashboardEmail() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold mb-1">Configuración de Email</h1>
        <p className="text-muted-foreground">Gestiona tu dominio y conexiones de correo electrónico</p>
      </div>

      <EmailConnectionManager />
    </div>
  );
}
