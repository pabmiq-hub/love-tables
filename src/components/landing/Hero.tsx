import { Button } from "@/components/ui/button";
import { Heart, Users, Calendar, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
export const Hero = () => {
  return <section className="relative min-h-screen bg-gradient-hero overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-float" style={{
        animationDelay: '2s'
      }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/3 rounded-full blur-3xl" />
      </div>

      {/* Floating hearts */}
      <div className="absolute inset-0 pointer-events-none">
        <Heart className="absolute top-1/4 left-1/4 w-6 h-6 text-primary/20 animate-float" style={{
        animationDelay: '0s'
      }} />
        <Heart className="absolute top-1/3 right-1/4 w-4 h-4 text-primary/15 animate-float" style={{
        animationDelay: '1s'
      }} />
        <Heart className="absolute bottom-1/3 left-1/3 w-5 h-5 text-primary/20 animate-float" style={{
        animationDelay: '2s'
      }} />
        <Heart className="absolute top-1/2 right-1/3 w-3 h-3 text-accent/20 animate-float" style={{
        animationDelay: '3s'
      }} />
      </div>

      <div className="relative container mx-auto px-4 py-20 flex flex-col items-center justify-center min-h-screen">
        {/* Badge */}
        <div className="animate-fade-in mb-8">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            La mejor plataforma de Speed Dating
          </span>
        </div>

        {/* Main heading */}
        <h1 className="animate-fade-in text-5xl md:text-7xl font-display font-bold text-center max-w-4xl mb-6" style={{
        animationDelay: '0.1s'
      }}>
          Conecta personas,
          <span className="text-gradient"> crea momentos</span>
        </h1>

        {/* Subtitle */}
        <p className="animate-fade-in text-lg md:text-xl text-muted-foreground text-center max-w-2xl mb-10" style={{
        animationDelay: '0.2s'
      }}>
          Organiza eventos de speed dating de forma sencilla. Gestiona participantes, 
          genera mesas inteligentes y descubre los matches perfectos.
        </p>

        {/* CTA Buttons */}
        <div className="animate-fade-in flex flex-col sm:flex-row gap-4 mb-16" style={{
        animationDelay: '0.3s'
      }}>
          <Link to="/admin/login">
            <Button variant="hero" size="xl">
              ¡Empieza a conectar personas!
            </Button>
          </Link>
          <Link to="/participant">
            
          </Link>
        </div>

        {/* Features */}
        <div className="animate-fade-in grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl w-full" style={{
        animationDelay: '0.4s'
      }}>
          <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50">
            <div className="w-14 h-14 rounded-xl bg-gradient-primary flex items-center justify-center mb-4">
              <Calendar className="w-7 h-7 text-primary-foreground" />
            </div>
            <h3 className="font-display font-semibold text-lg mb-2">Gestión de Eventos</h3>
            <p className="text-sm text-muted-foreground">Crea y administra múltiples eventos de speed dating desde un solo lugar</p>
          </div>

          <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50">
            <div className="w-14 h-14 rounded-xl bg-gradient-accent flex items-center justify-center mb-4">
              <Users className="w-7 h-7 text-accent-foreground" />
            </div>
            <h3 className="font-display font-semibold text-lg mb-2">Mesas Inteligentes</h3>
            <p className="text-sm text-muted-foreground">Algoritmo que genera combinaciones óptimas según preferencias</p>
          </div>

          <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50">
            <div className="w-14 h-14 rounded-xl bg-gradient-primary flex items-center justify-center mb-4">
              <Heart className="w-7 h-7 text-primary-foreground" />
            </div>
            <h3 className="font-display font-semibold text-lg mb-2">Matches Perfectos</h3>
            <p className="text-sm text-muted-foreground">Los participantes eligen y descubren sus coincidencias</p>
          </div>
        </div>
      </div>
    </section>;
};