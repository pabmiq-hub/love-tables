import { Wine, PartyPopper, Building2, Briefcase } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

export const ForWho = () => {
  const { language } = useLanguage();

  const audiences = language === "en"
    ? [
        { icon: Wine, title: "Bars & Restaurants", description: "Boost footfall on special nights with unique social connection or networking events that attract new customers." },
        { icon: PartyPopper, title: "Event Companies", description: "Professionalise your social connection and networking events with tools that save you hours of manual work." },
        { icon: Building2, title: "Chambers of Commerce & Associations", description: "Organise professional networking for entrepreneurs, startups and companies looking for new contacts." },
        { icon: Briefcase, title: "Coworkings & Innovation Spaces", description: "Facilitate connections between professionals, investors and entrepreneurs with structured networking events." },
      ]
    : [
        { icon: Wine, title: "Bares y restaurantes", description: "Aumenta la afluencia en noches especiales con actividades de conexión social o networking que atraen nuevos clientes." },
        { icon: PartyPopper, title: "Empresas de eventos", description: "Profesionaliza tus eventos de conexión social y networking con herramientas que te ahorran horas de trabajo manual." },
        { icon: Building2, title: "Cámaras de comercio y asociaciones", description: "Organiza networking profesional para emprendedores, startups y empresas que buscan nuevos contactos." },
        { icon: Briefcase, title: "Coworkings y espacios de innovación", description: "Facilita conexiones entre profesionales, inversores y emprendedores con eventos de networking estructurado." },
      ];

  const heading = language === "en"
    ? { badge: "Use cases", title: "Who is Konektum for?", subtitle: "Ideal for any business that wants to connect people" }
    : { badge: "Casos de uso", title: "¿Para quién es Konektum?", subtitle: "Ideal para cualquier negocio que quiera conectar personas" };

  return (
    <section id="para-quien" className="py-12 sm:py-16 md:py-20">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
          <span className="inline-block px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-accent/10 text-accent text-xs sm:text-sm font-medium mb-3 sm:mb-4">
            {heading.badge}
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-display font-bold mb-3 sm:mb-4">
            {heading.title}
          </h2>
          <p className="text-sm sm:text-lg text-muted-foreground px-2">
            {heading.subtitle}
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
              <p className="text-xs sm:text-sm md:text-base text-muted-foreground leading-relaxed text-justify">
                {audience.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
