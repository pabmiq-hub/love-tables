import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Eye, EyeOff, ChevronRight, ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import konektumLogo from "@/assets/konektum-logo.png";
import { ModuleSelector } from "@/components/registration/ModuleSelector";

const AdminRegister = () => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedModules, setSelectedModules] = useState<string[]>(["social"]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading, signUp } = useAuth();

  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/admin/complete-registration`,
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

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && user) {
      // Check if they already have an organizer profile
      checkOrganizerProfile();
    }
  }, [user, loading]);

  const checkOrganizerProfile = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("organizers")
      .select("id, status")
      .eq("user_id", user.id)
      .maybeSingle();
    
    if (data) {
      if (data.status === "active") {
        navigate("/admin/dashboard");
      } else {
        navigate("/admin/pending-approval");
      }
    }
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!email || !password || !confirmPassword) {
        toast({
          title: "Error",
          description: "Por favor, completa todos los campos",
          variant: "destructive",
        });
        return;
      }
      if (password !== confirmPassword) {
        toast({
          title: "Error",
          description: "Las contraseñas no coinciden",
          variant: "destructive",
        });
        return;
      }
      if (password.length < 6) {
        toast({
          title: "Error",
          description: "La contraseña debe tener al menos 6 caracteres",
          variant: "destructive",
        });
        return;
      }
    }
    setStep(step + 1);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedModules.length === 0) {
      toast({
        title: "Error",
        description: "Debes seleccionar al menos un módulo",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    // First create the auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          company_name: companyName,
        }
      }
    });
    
    if (authError) {
      let errorMessage = authError.message;
      if (authError.message.includes("already registered")) {
        errorMessage = "Este email ya está registrado";
      }
      toast({
        title: "Error al registrar",
        description: errorMessage,
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (authData.user) {
      // Get the default plan
      const { data: defaultPlan } = await supabase
        .from("subscription_plans")
        .select("id")
        .eq("is_default", true)
        .single();

      // Create organizer profile with pending status
      const { error: orgError } = await supabase
        .from("organizers")
        .insert({
          user_id: authData.user.id,
          contact_email: email,
          company_name: companyName || null,
          status: "pending",
          plan_id: defaultPlan?.id || null,
          active_modules: selectedModules,
          slug: "",
        });

      if (orgError) {
        console.error("Error creating organizer:", orgError);
        toast({
          title: "Error al crear perfil",
          description: "Tu cuenta fue creada pero hubo un error al crear tu perfil de organizador. Contacta con soporte.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
    }

    toast({
      title: "Registro exitoso",
      description: "Tu cuenta ha sido creada y está pendiente de aprobación.",
    });
    navigate("/admin/pending-approval");
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

      {/* Progress indicator */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2].map((s) => (
          <div key={s} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
              s <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              {s}
            </div>
            {s < 2 && (
              <div className={`w-12 h-1 mx-2 rounded ${s < step ? 'bg-primary' : 'bg-muted'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Register Card */}
      <Card className="w-full max-w-md animate-scale-in bg-card/80 backdrop-blur-sm">
        {step === 1 && (
          <>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Crear Cuenta</CardTitle>
              <CardDescription>
                Regístrate para comenzar a organizar eventos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => { e.preventDefault(); handleNextStep(); }} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre completo</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Tu nombre"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyName">Nombre de empresa (opcional)</Label>
                  <Input
                    id="companyName"
                    type="text"
                    placeholder="Tu empresa o marca"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>
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
                  <Label htmlFor="password">Contraseña</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
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
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" variant="hero" className="w-full">
                  <span>Continuar</span>
                  <ChevronRight className="w-4 h-4 ml-2" />
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
                  onClick={handleGoogleSignUp}
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
            </CardContent>
          </>
        )}

        {step === 2 && (
          <>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Selecciona tus Módulos</CardTitle>
              <CardDescription>
                Elige los tipos de eventos que organizarás
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRegister} className="space-y-6">
                <ModuleSelector 
                  selectedModules={selectedModules}
                  onModulesChange={setSelectedModules}
                />

                <div className="flex gap-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setStep(1)}
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Atrás
                  </Button>
                  <Button 
                    type="submit" 
                    variant="hero" 
                    className="flex-1" 
                    disabled={isLoading || selectedModules.length === 0}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creando cuenta...
                      </>
                    ) : (
                      "Crear Cuenta"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </>
        )}
      </Card>

      <p className="mt-6 text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: '0.3s' }}>
        ¿Ya tienes cuenta?{" "}
        <Link to="/admin/login" className="text-primary hover:underline">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
};

export default AdminRegister;
