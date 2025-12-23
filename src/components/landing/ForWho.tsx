import { Wine, Building2, Users, Landmark, PartyPopper, Briefcase } from "lucide-react";

const audiences = [
  {
    icon: Wine,
    title: "Bares y restaurantes",
    description: "Aumenta la afluencia en noches especiales con eventos únicos que atraen nuevos clientes."
  },
  {
    icon: PartyPopper,
    title: "Empresas de eventos",
    description: "Profesionaliza tus speed dating con herramientas que te ahorran horas de trabajo manual."
  },
  {
    icon: Building2,
    title: "Hoteles y resorts",
    description: "Ofrece experiencias diferenciadas a tus huéspedes con eventos de networking social."
  },
  {
    icon: Landmark,
    title: "Ayuntamientos",
    description: "Organiza actividades sociales para combatir la soledad y fomentar relaciones en tu municipio."
  },
  {
    icon: Users,
    title: "Asociaciones",
    description: "Conecta a los miembros de tu comunidad en eventos diseñados para crear vínculos reales."
  },
  {
    icon: Briefcase,
    title: "Coworkings",
    description: "Facilita el networking entre profesionales con eventos de conexión rápida."
  }
];

export const ForWho = () => {
  return (
    <section id="para-quien" className="py-24 md:py-32">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
            Casos de uso
          </span>
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">
            ¿Para quién es SpeedMatch?
          </h2>
          <p className="text-lg text-muted-foreground">
            Diseñado para cualquier organización que quiera conectar personas de forma eficiente
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {audiences.map((audience, index) => (
            <div 
              key={index} 
              className="group p-8 rounded-2xl border border-border/50 hover:border-primary/30 bg-card hover:bg-gradient-to-br hover:from-card hover:to-primary/5 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-accent flex items-center justify-center mb-5">
                <audience.icon className="w-6 h-6 text-accent-foreground" />
              </div>
              <h3 className="font-display font-semibold text-lg mb-2">
                {audience.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {audience.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
