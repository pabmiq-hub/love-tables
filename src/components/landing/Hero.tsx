import { Button } from "@/components/ui/button";
import { Users, Calendar, Sparkles, ArrowRight, ChevronDown, Handshake, Network } from "lucide-react";
import { Link } from "react-router-dom";
export const Hero = () => {
  return <section className="relative min-h-screen bg-gradient-hero overflow-hidden pt-16 md:pt-20">
      {/* Decorative elements - hidden on mobile for performance */}
      <div className="absolute inset-0 overflow-hidden hidden sm:block">
        <div className="absolute top-20 left-10 w-48 md:w-72 h-48 md:h-72 bg-primary/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-64 md:w-96 h-64 md:h-96 bg-accent/5 rounded-full blur-3xl animate-float" style={{
        animationDelay: '2s'
      }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] md:w-[800px] h-[400px] md:h-[800px] bg-primary/3 rounded-full blur-3xl" />
      </div>

      {/* Floating icons - hidden on mobile */}
      <div className="absolute inset-0 pointer-events-none hidden md:block">
        <Handshake className="absolute top-1/4 left-1/4 w-6 h-6 text-primary/20 animate-float" style={{
        animationDelay: '0s'
      }} />
        <Network className="absolute top-1/3 right-1/4 w-4 h-4 text-primary/15 animate-float" style={{
        animationDelay: '1s'
      }} />
        <Users className="absolute bottom-1/3 left-1/3 w-5 h-5 text-primary/20 animate-float" style={{
        animationDelay: '2s'
      }} />
        <Handshake className="absolute top-1/2 right-1/3 w-3 h-3 text-accent/20 animate-float" style={{
        animationDelay: '3s'
      }} />
      </div>

      <div className="relative container mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20 flex flex-col items-center justify-center min-h-[calc(100vh-64px)] md:min-h-[calc(100vh-80px)]">
        {/* Badge */}
        <div className="animate-fade-in mb-6 sm:mb-8">
          <span className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium">
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">La plataforma líder para conectar personas</span>
            <span className="xs:hidden">Conecta personas y profesionales afines con un algoritmo inteligente.</span>
          </span>
        </div>

        {/* Main heading */}
        <h1 className="animate-fade-in text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-display font-bold text-center max-w-5xl mb-4 sm:mb-6 leading-tight px-2" style={{
        animationDelay: '0.1s'
      }}>
          Conecta personas,
          <span className="text-gradient block sm:inline"> crea momentos</span>
        </h1>

        {/* Subtitle */}
        <p className="animate-fade-in text-base sm:text-lg md:text-xl text-muted-foreground text-center max-w-2xl mb-8 sm:mb-10 leading-relaxed px-2" style={{
        animationDelay: '0.2s'
      }}>
          Organiza eventos de speed dating y networking profesional. Gestiona participantes, 
          genera mesas inteligentes y descubre las conexiones perfectas.
        </p>

        {/* CTA Buttons */}
        <div className="animate-fade-in flex flex-col sm:flex-row gap-3 sm:gap-4 mb-10 sm:mb-16 w-full sm:w-auto px-4 sm:px-0" style={{
        animationDelay: '0.3s'
      }}>
          <Link to="/admin/register" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto bg-gradient-primary hover:opacity-90 transition-opacity gap-2 text-sm sm:text-base px-6 sm:px-8">
              Crear mi primer evento
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link to="/admin/login" className="w-full sm:w-auto">
            <Button size="lg" variant="outline" className="w-full sm:w-auto text-sm sm:text-base px-6 sm:px-8">
              Ya tengo cuenta
            </Button>
          </Link>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 max-w-4xl w-full px-2 sm:px-0">
          <div className="animate-fade-in flex flex-col sm:flex-col items-center sm:items-center text-center sm:text-center p-4 sm:p-6 rounded-2xl glass hover:scale-105 transition-transform duration-300 cursor-pointer" style={{
          animationDelay: '0.4s'
        }}>
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-primary flex items-center justify-center mb-3 sm:mb-4 shadow-soft shrink-0">
              <Calendar className="w-6 h-6 sm:w-7 sm:h-7 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-base sm:text-lg mb-1 sm:mb-2">Gestión de Eventos</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Crea y administra eventos de dating y networking desde un solo lugar
              </p>
            </div>
          </div>

          <div className="animate-fade-in flex flex-col sm:flex-col items-center sm:items-center text-center sm:text-center p-4 sm:p-6 rounded-2xl glass hover:scale-105 transition-transform duration-300 cursor-pointer" style={{
          animationDelay: '0.5s'
        }}>
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-accent flex items-center justify-center mb-3 sm:mb-4 shrink-0">
              <Users className="w-6 h-6 sm:w-7 sm:h-7 text-accent-foreground" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-base sm:text-lg mb-1 sm:mb-2">Mesas Inteligentes</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Algoritmo que genera combinaciones óptimas según preferencias
              </p>
            </div>
          </div>

          <div className="animate-fade-in flex flex-col sm:flex-col items-center sm:items-center text-center sm:text-center p-4 sm:p-6 rounded-2xl glass hover:scale-105 transition-transform duration-300 cursor-pointer" style={{
          animationDelay: '0.6s'
        }}>
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-primary flex items-center justify-center mb-3 sm:mb-4 shadow-soft shrink-0">
              <Handshake className="w-6 h-6 sm:w-7 sm:h-7 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-base sm:text-lg mb-1 sm:mb-2">Conexiones Perfectas</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Los participantes eligen y descubren sus matches ideales
              </p>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="animate-fade-in mt-10 sm:mt-16 flex flex-col items-center cursor-pointer group" style={{
        animationDelay: '0.7s'
      }} onClick={() => document.getElementById('como-funciona')?.scrollIntoView({
        behavior: 'smooth'
      })}>
          <span className="text-xs sm:text-sm text-muted-foreground mb-2 group-hover:text-primary transition-colors">Descubre cómo funciona</span>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-primary/30 flex items-center justify-center animate-bounce group-hover:border-primary transition-colors">
            <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-primary/50 group-hover:text-primary transition-colors" />
          </div>
        </div>
      </div>
    </section>;
};