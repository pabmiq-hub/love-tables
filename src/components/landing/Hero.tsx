import { Button } from "@/components/ui/button";
import { Users, Calendar, Sparkles, ArrowRight, ChevronDown, Handshake, Network } from "lucide-react";
import { Link } from "react-router-dom";

export const Hero = () => {
  return (
    <section className="relative min-h-screen bg-gradient-hero overflow-hidden pt-20">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-float" />
        <div 
          className="absolute bottom-20 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-float" 
          style={{ animationDelay: '2s' }} 
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/3 rounded-full blur-3xl" />
      </div>

      {/* Floating icons */}
      <div className="absolute inset-0 pointer-events-none">
        <Handshake 
          className="absolute top-1/4 left-1/4 w-6 h-6 text-primary/20 animate-float" 
          style={{ animationDelay: '0s' }} 
        />
        <Network 
          className="absolute top-1/3 right-1/4 w-4 h-4 text-primary/15 animate-float" 
          style={{ animationDelay: '1s' }} 
        />
        <Users 
          className="absolute bottom-1/3 left-1/3 w-5 h-5 text-primary/20 animate-float" 
          style={{ animationDelay: '2s' }} 
        />
        <Handshake 
          className="absolute top-1/2 right-1/3 w-3 h-3 text-accent/20 animate-float" 
          style={{ animationDelay: '3s' }} 
        />
      </div>

      <div className="relative container mx-auto px-4 py-20 flex flex-col items-center justify-center min-h-[calc(100vh-80px)]">
        {/* Badge */}
        <div className="animate-fade-in mb-8">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            La plataforma líder para conectar personas
          </span>
        </div>

        {/* Main heading */}
        <h1 
          className="animate-fade-in text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-bold text-center max-w-5xl mb-6 leading-tight" 
          style={{ animationDelay: '0.1s' }}
        >
          Conecta personas,
          <span className="text-gradient"> crea momentos</span>
        </h1>

        {/* Subtitle */}
        <p 
          className="animate-fade-in text-lg md:text-xl text-muted-foreground text-center max-w-2xl mb-10 leading-relaxed" 
          style={{ animationDelay: '0.2s' }}
        >
          Organiza eventos de speed dating y networking profesional. Gestiona participantes, 
          genera mesas inteligentes y descubre las conexiones perfectas.
        </p>

        {/* CTA Buttons */}
        <div 
          className="animate-fade-in flex flex-col sm:flex-row gap-4 mb-16" 
          style={{ animationDelay: '0.3s' }}
        >
          <Link to="/admin/register">
            <Button size="lg" className="bg-gradient-primary hover:opacity-90 transition-opacity gap-2 text-base px-8">
              Crear mi primer evento
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link to="/admin/login">
            <Button size="lg" variant="outline" className="text-base px-8">
              Ya tengo cuenta
            </Button>
          </Link>
        </div>

        {/* Features */}
        <div 
          className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full" 
        >
          <div 
            className="animate-fade-in flex flex-col items-center text-center p-6 rounded-2xl glass hover:scale-105 transition-transform duration-300 cursor-pointer"
            style={{ animationDelay: '0.4s' }}
          >
            <div className="w-14 h-14 rounded-xl bg-gradient-primary flex items-center justify-center mb-4 shadow-soft">
              <Calendar className="w-7 h-7 text-primary-foreground" />
            </div>
            <h3 className="font-display font-semibold text-lg mb-2">Gestión de Eventos</h3>
            <p className="text-sm text-muted-foreground">
              Crea y administra eventos de dating y networking desde un solo lugar
            </p>
          </div>

          <div 
            className="animate-fade-in flex flex-col items-center text-center p-6 rounded-2xl glass hover:scale-105 transition-transform duration-300 cursor-pointer"
            style={{ animationDelay: '0.5s' }}
          >
            <div className="w-14 h-14 rounded-xl bg-gradient-accent flex items-center justify-center mb-4">
              <Users className="w-7 h-7 text-accent-foreground" />
            </div>
            <h3 className="font-display font-semibold text-lg mb-2">Mesas Inteligentes</h3>
            <p className="text-sm text-muted-foreground">
              Algoritmo que genera combinaciones óptimas según preferencias
            </p>
          </div>

          <div 
            className="animate-fade-in flex flex-col items-center text-center p-6 rounded-2xl glass hover:scale-105 transition-transform duration-300 cursor-pointer"
            style={{ animationDelay: '0.6s' }}
          >
            <div className="w-14 h-14 rounded-xl bg-gradient-primary flex items-center justify-center mb-4 shadow-soft">
              <Handshake className="w-7 h-7 text-primary-foreground" />
            </div>
            <h3 className="font-display font-semibold text-lg mb-2">Conexiones Perfectas</h3>
            <p className="text-sm text-muted-foreground">
              Los participantes eligen y descubren sus matches ideales
            </p>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div 
          className="animate-fade-in mt-16 flex flex-col items-center cursor-pointer group"
          style={{ animationDelay: '0.7s' }}
          onClick={() => document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' })}
        >
          <span className="text-sm text-muted-foreground mb-2 group-hover:text-primary transition-colors">Descubre cómo funciona</span>
          <div className="w-10 h-10 rounded-full border-2 border-primary/30 flex items-center justify-center animate-bounce group-hover:border-primary transition-colors">
            <ChevronDown className="w-5 h-5 text-primary/50 group-hover:text-primary transition-colors" />
          </div>
        </div>
      </div>
    </section>
  );
};
