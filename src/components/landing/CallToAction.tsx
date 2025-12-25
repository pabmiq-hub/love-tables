import { Button } from "@/components/ui/button";
import { ArrowRight, Heart } from "lucide-react";
import { Link } from "react-router-dom";

export const CallToAction = () => {
  return (
    <section className="py-16 md:py-20 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 relative">
        <div className="max-w-3xl mx-auto text-center">
          {/* Icon */}
          <div className="w-20 h-20 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto mb-8 shadow-glow">
            <Heart className="w-10 h-10 text-primary-foreground" fill="currentColor" />
          </div>
          
          {/* Heading */}
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-6">
            ¿Listo para crear conexiones?
          </h2>
          
          {/* Description */}
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Únete a cientos de organizadores que ya utilizan SpeedMatch para crear momentos inolvidables. Empieza gratis hoy mismo.
          </p>
          
          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
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
          
          {/* Trust indicators */}
          <p className="mt-8 text-sm text-muted-foreground">
            Sin tarjeta de crédito · Configuración en 5 minutos · Soporte en español
          </p>
        </div>
      </div>
    </section>
  );
};
