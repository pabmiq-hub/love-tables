import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Eye, EyeOff, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const SuperAdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const isRedirecting = useRef(false);
  const hasCheckedAuth = useRef(false);

  // Check if already authenticated as super admin
  useEffect(() => {
    const checkExistingSession = async () => {
      // Prevent multiple executions
      if (isRedirecting.current || hasCheckedAuth.current) return;
      
      hasCheckedAuth.current = true;
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", session.user.id)
            .eq("role", "super_admin")
            .maybeSingle();
          
          if (roleData) {
            isRedirecting.current = true;
            setIsCheckingAuth(false); // Set before navigate to prevent flash
            navigate("/super-admin", { replace: true });
            return;
          }
        }
      } catch (error) {
        console.error("Error checking session:", error);
        hasCheckedAuth.current = false;
      }
      
      setIsCheckingAuth(false);
    };

    checkExistingSession();
  }, [navigate]);

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

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
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

      if (!data.user) {
        toast({
          title: "Error",
          description: "No se pudo obtener información del usuario",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Verify super admin role
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .eq("role", "super_admin")
        .maybeSingle();

      if (roleError) {
        console.error("Error checking super admin role:", roleError);
        await supabase.auth.signOut();
        toast({
          title: "Error",
          description: "Error al verificar permisos",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      if (!roleData) {
        await supabase.auth.signOut();
        toast({
          title: "Acceso denegado",
          description: "Esta cuenta no tiene permisos de Super Admin",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      toast({
        title: "Bienvenido",
        description: "Acceso de Super Admin verificado",
      });
      
      navigate("/super-admin", { replace: true });
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error inesperado",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Back button */}
      <Link 
        to="/" 
        className="absolute top-6 left-6 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver
      </Link>

      {/* Login Card */}
      <Card className="w-full max-w-sm animate-fade-in border-border/50">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Shield className="w-6 h-6 text-muted-foreground" />
          </div>
          <CardTitle className="text-xl">Acceso Administrativo</CardTitle>
          <CardDescription className="text-xs">
            Exclusivo para Super Administradores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10 h-9"
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
            <Button type="submit" className="w-full h-9" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Verificando...
                </>
              ) : (
                "Acceder"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="mt-4 text-xs text-muted-foreground/50">
        Acceso restringido
      </p>
    </div>
  );
};

export default SuperAdminLogin;
