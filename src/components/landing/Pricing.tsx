import { Button } from "@/components/ui/button";
import { Check, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const plans = [
  {
    name: "Gratuito",
    price: "0€",
    period: "para siempre",
    description: "Perfecto para probar la plataforma",
    features: [
      "1 evento activo",
      "Hasta 20 participantes",
      "Check-in con QR",
      "Sistema de votación",
      "Matches manuales"
    ],
    cta: "Empezar gratis",
    highlighted: false
  },
  {
    name: "Profesional",
    price: "29€",
    period: "/mes",
    description: "Para organizadores frecuentes",
    features: [
      "Eventos ilimitados",
      "Hasta 100 participantes",
      "Importación Excel",
      "Emails automáticos",
      "Dashboard analytics",
      "Soporte prioritario"
    ],
    cta: "Comenzar prueba",
    highlighted: true
  },
  {
    name: "Empresa",
    price: "Personalizado",
    period: "",
    description: "Soluciones a medida",
    features: [
      "Participantes ilimitados",
      "Multi-organizador",
      "API de integración",
      "Marca blanca",
      "Formación incluida",
      "Gestor de cuenta"
    ],
    cta: "Contactar",
    highlighted: false
  }
];

export const Pricing = () => {
  return (
    <section id="precios" className="py-24 md:py-32 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Precios transparentes
          </span>
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">
            Un plan para cada necesidad
          </h2>
          <p className="text-lg text-muted-foreground">
            Empieza gratis y escala cuando lo necesites
          </p>
        </div>

        {/* Pricing grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <div 
              key={index} 
              className={`relative p-8 rounded-2xl border ${
                plan.highlighted 
                  ? 'bg-gradient-to-b from-primary/5 to-card border-primary/30 shadow-elevated' 
                  : 'bg-card border-border/50 shadow-card'
              }`}
            >
              {/* Popular badge */}
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-primary text-primary-foreground text-sm font-medium">
                    <Sparkles className="w-4 h-4" />
                    Popular
                  </span>
                </div>
              )}
              
              {/* Plan info */}
              <div className="mb-6">
                <h3 className="font-display font-semibold text-xl mb-2">
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-4xl font-display font-bold">
                    {plan.price}
                  </span>
                  <span className="text-muted-foreground">
                    {plan.period}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {plan.description}
                </p>
              </div>
              
              {/* Features */}
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center gap-3 text-sm">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      plan.highlighted ? 'bg-primary/20' : 'bg-muted'
                    }`}>
                      <Check className={`w-3 h-3 ${plan.highlighted ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              
              {/* CTA */}
              <Link to="/admin/register" className="block">
                <Button 
                  className={`w-full ${
                    plan.highlighted 
                      ? 'bg-gradient-primary hover:opacity-90' 
                      : ''
                  }`}
                  variant={plan.highlighted ? "default" : "outline"}
                >
                  {plan.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
