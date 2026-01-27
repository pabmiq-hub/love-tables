import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Eye, EyeOff, Handshake } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import konektumLogo from "@/assets/konektum-logo.png";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [recoveryEmailSent, setRecoveryEmailSent] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading, signIn, resetPassword } = useAuth();

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/admin/dashboard`,
      },
    });
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setIsGoogleLoading(false);
    }
  };

  const isRedirecting = useRef(false);

  // Redirect if already authenticated
  useEffect(() => {
    const checkOrganizerAndRedirect = async () => {
      if (!user || isRedirecting.current) return;
      
      isRedirecting.current = true;
      
      try {
        // First check if super admin
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "super_admin")
          .maybeSingle();
        
        if (roleData) {
          navigate("/super-admin", { replace: true });
          return;
        }
        
        // Check organizer profile
        const { data: orgData } = await supabase
          .from("organizers")
          .select("status")
          .eq("user_id", user.id)
          .maybeSingle();
        
        if (orgData) {
          if (orgData.status === "active") {
            navigate("/admin/dashboard", { replace: true });
          } else if (orgData.status === "pending") {
            navigate("/admin/pending-approval", { replace: true });
          } else if (orgData.status === "suspended") {
            toast({
              title: "Cuenta suspendida",
              description: "Tu cuenta ha sido suspendida. Contacta con soporte.",
              variant: "destructive",
            });
            isRedirecting.current = false;
          }
        } else {
          // No organizer profile, maybe old user - redirect to register
          navigate("/admin/register", { replace: true });
        }
      } catch (error) {
        console.error("Error checking organizer status:", error);
        isRedirecting.current = false;
      }
    };

    if (!loading && user) {
      checkOrganizerAndRedirect();
    }
  }, [user, loading, navigate, toast]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Error",
        description: "Por favor, introduce tus credenciales",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    const { error } = await signIn(email, password);
    
    if (error) {
      toast({
        title: "Error de autenticación",
        description: error.message === "Invalid login credentials" 
          ? "Credenciales incorrectas" 
          : error.message,
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    toast({
      title: "Bienvenido",
      description: "Has iniciado sesión correctamente",
    });
    // The useEffect will handle proper redirection based on organizer status
    setIsLoading(false);
  };

  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Error",
        description: "Por favor, introduce tu email",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    const { error } = await resetPassword(email);
    
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    setRecoveryEmailSent(true);
    setIsLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col items-center justify-center p-4">
      {/* Back button */}
      <Link 
        to="/" 
        className="absolute top-6 left-6 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver
      </Link>

      {/* Logo */}
      <div className="flex items-center gap-2 mb-8 animate-fade-in">
        <img src={konektumLogo} alt="Konektum" className="h-12 w-auto" />
      </div>

      {/* Login Card */}
      <Card className="w-full max-w-md animate-scale-in bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Panel de Administración</CardTitle>
          <CardDescription>
            Accede para gestionar tus eventos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isRecoveryMode ? (
            recoveryEmailSent ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <Handshake className="w-8 h-8 text-primary" />
                </div>
                <p className="text-muted-foreground">
                  Hemos enviado un enlace de recuperación a <strong>{email}</strong>.
                  Revisa tu bandeja de entrada.
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsRecoveryMode(false);
                    setRecoveryEmailSent(false);
                    setEmail("");
                  }}
                  className="w-full"
                >
                  Volver al login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleRecovery} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@ejemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" variant="hero" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    "Enviar enlace de recuperación"
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setIsRecoveryMode(false)}
                  className="w-full"
                >
                  Volver al login
                </Button>
              </form>
            )
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Contraseña</Label>
                  <button
                    type="button"
                    onClick={() => setIsRecoveryMode(true)}
                    className="text-xs text-primary hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" variant="hero" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Iniciando sesión...
                  </>
                ) : (
                  "Iniciar Sesión"
                )}
              </Button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">o continúa con</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGoogleLogin}
                disabled={isGoogleLoading}
              >
                {isGoogleLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                )}
                Continuar con Google
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {!isRecoveryMode && (
        <p className="mt-6 text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: '0.3s' }}>
          ¿No tienes cuenta?{" "}
          <Link to="/admin/register" className="text-primary hover:underline">
            Regístrate aquí
          </Link>
        </p>
      )}
    </div>
  );
};

export default AdminLogin;
