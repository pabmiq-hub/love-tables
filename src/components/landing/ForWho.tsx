import { Wine, PartyPopper, Music } from "lucide-react";

const audiences = [
  {
    icon: Wine,
    title: "Bares y restaurantes",
    description: "Aumenta la afluencia en noches especiales con eventos únicos que atraen nuevos clientes y fidelizan a los habituales."
  },
  {
    icon: PartyPopper,
    title: "Empresas de eventos",
    description: "Profesionaliza tus speed dating con herramientas que te ahorran horas de trabajo manual y mejoran la experiencia."
  },
  {
    icon: Music,
    title: "Locales de ocio",
    description: "Diferénciate ofreciendo experiencias sociales memorables que generan repetición y boca a boca."
  }
];

export const ForWho = () => {
  return (
    <section id="para-quien" className="py-16 md:py-20">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
            Casos de uso
          </span>
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">
            ¿Para quién es SpeedMatch?
          </h2>
          <p className="text-lg text-muted-foreground">
            Ideal para cualquier negocio que quiera conectar personas
          </p>
        </div>

        {/* Grid - 3 columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {audiences.map((audience, index) => (
            <div 
              key={index} 
              className="group p-8 rounded-2xl border border-border/50 hover:border-primary/30 bg-card hover:bg-gradient-to-br hover:from-card hover:to-primary/5 transition-all duration-300 hover:shadow-card animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="w-14 h-14 rounded-xl bg-gradient-accent flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <audience.icon className="w-7 h-7 text-accent-foreground" />
              </div>
              <h3 className="font-display font-semibold text-xl mb-3">
                {audience.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {audience.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
