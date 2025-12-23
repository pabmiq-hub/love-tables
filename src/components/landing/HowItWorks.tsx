import { ClipboardList, Users, Shuffle, Heart } from "lucide-react";

const steps = [
  {
    icon: ClipboardList,
    title: "Crea tu evento",
    description: "Configura fecha, número de participantes, duración de las rondas y preferencias del evento en minutos."
  },
  {
    icon: Users,
    title: "Registra participantes",
    description: "Importa desde Excel o permite que se registren con código QR. Gestiona check-in el día del evento."
  },
  {
    icon: Shuffle,
    title: "Genera las mesas",
    description: "Nuestro algoritmo crea combinaciones óptimas respetando preferencias de género y edad."
  },
  {
    icon: Heart,
    title: "Descubre los matches",
    description: "Los participantes votan tras cada ronda. Al finalizar, revelamos las coincidencias mutuas."
  }
];

export const HowItWorks = () => {
  return (
    <section id="como-funciona" className="py-24 md:py-32 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Proceso sencillo
          </span>
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">
            ¿Cómo funciona?
          </h2>
          <p className="text-lg text-muted-foreground">
            Organiza eventos de speed dating profesionales en cuatro simples pasos
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative group">
              {/* Connection line for desktop */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-[60%] w-[80%] h-[2px] bg-gradient-to-r from-primary/30 to-transparent" />
              )}
              
              <div className="relative bg-card rounded-2xl p-8 shadow-card border border-border/50 hover:shadow-elevated transition-all duration-300 hover:-translate-y-1">
                {/* Step number */}
                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
                  {index + 1}
                </div>
                
                {/* Icon */}
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/15 transition-colors">
                  <step.icon className="w-7 h-7 text-primary" />
                </div>
                
                {/* Content */}
                <h3 className="font-display font-semibold text-xl mb-3">
                  {step.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
