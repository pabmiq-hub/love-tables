import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, LogOut, Mail, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useOrganizer } from "@/hooks/useOrganizer";
import konektumLogo from "@/assets/konektum-logo.png";

const PendingApproval = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { organizer, loading: orgLoading, refresh } = useOrganizer();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/admin/login");
      return;
    }
  }, [user, authLoading, navigate]);

  // Check if approved and redirect
  useEffect(() => {
    if (!orgLoading && organizer?.status === "active") {
      navigate("/admin/dashboard");
    }
  }, [organizer, orgLoading, navigate]);

  // Periodically check status
  useEffect(() => {
    const interval = setInterval(() => {
      refresh();
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [refresh]);

  const handleLogout = async () => {
    await signOut();
    navigate("/admin/login");
  };

  if (authLoading || orgLoading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col items-center justify-center p-4">
      <Link 
        to="/" 
        className="absolute top-6 left-6 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver
      </Link>

      <div className="flex items-center gap-2 mb-8 animate-fade-in">
        <img src={konektumLogo} alt="Konektum" className="h-12 w-auto" />
      </div>

      <Card className="w-full max-w-md animate-scale-in bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Clock className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <CardTitle className="text-2xl">Cuenta Pendiente de Aprobación</CardTitle>
          <CardDescription className="mt-2">
            Tu solicitud está siendo revisada por nuestro equipo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Te notificaremos por email</p>
                <p className="text-xs text-muted-foreground">
                  Recibirás un correo cuando tu cuenta sea activada
                </p>
              </div>
            </div>
          </div>

          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Email registrado: <span className="font-medium text-foreground">{user?.email}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              La aprobación suele completarse en menos de 24 horas
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Button 
              variant="outline" 
              onClick={() => refresh()}
              className="w-full"
            >
              Verificar estado
            </Button>
            <Button 
              variant="ghost" 
              onClick={handleLogout}
              className="w-full text-muted-foreground"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar sesión
            </Button>
          </div>
        </CardContent>
      </Card>

      <p className="mt-6 text-sm text-muted-foreground animate-fade-in text-center max-w-md">
        ¿Tienes preguntas? Contacta con nosotros en{" "}
        <a href="mailto:hola@konektum.com" className="text-primary hover:underline">
          hola@konektum.com
        </a>
      </p>
    </div>
  );
};

export default PendingApproval;
