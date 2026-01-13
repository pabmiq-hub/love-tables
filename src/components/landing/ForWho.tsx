import { Wine, PartyPopper, Building2, Briefcase } from "lucide-react";

const audiences = [
  {
    icon: Wine,
    title: "Bares y restaurantes",
    description: "Aumenta la afluencia en noches especiales con eventos únicos de speed dating o networking que atraen nuevos clientes."
  },
  {
    icon: PartyPopper,
    title: "Empresas de eventos",
    description: "Profesionaliza tus eventos de citas y networking con herramientas que te ahorran horas de trabajo manual."
  },
  {
    icon: Building2,
    title: "Cámaras de comercio y asociaciones",
    description: "Organiza networking profesional para emprendedores, startups y empresas que buscan nuevos contactos."
  },
  {
    icon: Briefcase,
    title: "Coworkings y espacios de innovación",
    description: "Facilita conexiones entre profesionales, inversores y emprendedores con eventos de networking estructurado."
  }
];

export const ForWho = () => {
  return (
    <section id="para-quien" className="py-12 sm:py-16 md:py-20">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
          <span className="inline-block px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-accent/10 text-accent text-xs sm:text-sm font-medium mb-3 sm:mb-4">
            Casos de uso
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-display font-bold mb-3 sm:mb-4">
            ¿Para quién es Konektum?
          </h2>
          <p className="text-sm sm:text-lg text-muted-foreground px-2">
            Ideal para cualquier negocio que quiera conectar personas
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8 max-w-6xl mx-auto">
          {audiences.map((audience, index) => (
            <div 
              key={index} 
              className="group p-5 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl border border-border/50 hover:border-primary/30 bg-card hover:bg-gradient-to-br hover:from-card hover:to-primary/5 transition-all duration-300 hover:shadow-card animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-lg sm:rounded-xl bg-gradient-accent flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform duration-300">
                <audience.icon className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-accent-foreground" />
              </div>
              <h3 className="font-display font-semibold text-base sm:text-lg md:text-xl mb-2 sm:mb-3">
                {audience.title}
              </h3>
              <p className="text-xs sm:text-sm md:text-base text-muted-foreground leading-relaxed">
                {audience.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
