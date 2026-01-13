import { Button } from "@/components/ui/button";
import { ArrowRight, Handshake } from "lucide-react";
import { Link } from "react-router-dom";

export const CallToAction = () => {
  return (
    <section className="py-12 sm:py-16 md:py-20 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[400px] md:w-[600px] h-[300px] sm:h-[400px] md:h-[600px] bg-primary/5 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 sm:px-6 relative">
        <div className="max-w-3xl mx-auto text-center">
          {/* Icon */}
          <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-xl sm:rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto mb-6 sm:mb-8 shadow-glow">
            <Handshake className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 text-primary-foreground" />
          </div>
          
          {/* Heading */}
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-display font-bold mb-4 sm:mb-6 px-2">
            ¿Listo para crear conexiones?
          </h2>
          
          {/* Description */}
          <p className="text-sm sm:text-lg md:text-xl text-muted-foreground mb-8 sm:mb-10 max-w-2xl mx-auto px-2">
            Únete a cientos de organizadores que ya utilizan Konektum para crear eventos de dating y networking inolvidables. Empieza gratis hoy mismo.
          </p>
          
          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 sm:px-0">
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
          
          {/* Trust indicators */}
          <p className="mt-6 sm:mt-8 text-xs sm:text-sm text-muted-foreground px-2">
            Sin tarjeta de crédito · Configuración en 5 minutos · Soporte en español
          </p>
        </div>
      </div>
    </section>
  );
};
