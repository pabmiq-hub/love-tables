import { 
  QrCode, 
  Mail, 
  Timer, 
  BarChart3, 
  Shield, 
  Smartphone,
  FileSpreadsheet,
  Settings2,
  Globe,
  Zap,
  Users,
  Heart
} from "lucide-react";

const features = [
  {
    icon: QrCode,
    title: "Check-in con QR",
    description: "Los participantes hacen check-in escaneando un código QR único para cada evento."
  },
  {
    icon: FileSpreadsheet,
    title: "Importación Excel",
    description: "Sube tu lista de participantes desde Excel y configura el evento en segundos."
  },
  {
    icon: Timer,
    title: "Temporizador de rondas",
    description: "Controla el tiempo de cada ronda con alarmas configurables para cambiar de mesa."
  },
  {
    icon: Users,
    title: "Mesas inteligentes",
    description: "Algoritmo que genera combinaciones óptimas respetando preferencias y evitando repeticiones."
  },
  {
    icon: Heart,
    title: "Sistema de votación",
    description: "Los participantes votan desde su móvil. Discreto, rápido y sin papeles."
  },
  {
    icon: Mail,
    title: "Emails de matches",
    description: "Envía automáticamente los resultados de matches mutuos a los participantes."
  },
  {
    icon: BarChart3,
    title: "Dashboard analytics",
    description: "Visualiza estadísticas de participación, matches y tendencias de tus eventos."
  },
  {
    icon: Settings2,
    title: "Personalizable",
    description: "Configura géneros, preferencias, rangos de edad y campos adicionales según tu evento."
  },
  {
    icon: Smartphone,
    title: "100% responsive",
    description: "Funciona perfectamente en cualquier dispositivo: móvil, tablet o escritorio."
  },
  {
    icon: Shield,
    title: "Datos seguros",
    description: "Información cifrada y cumplimiento total con la normativa RGPD española."
  },
  {
    icon: Globe,
    title: "Multiidioma",
    description: "Interfaz disponible en español, catalán, inglés y más idiomas próximamente."
  },
  {
    icon: Zap,
    title: "Resultados en tiempo real",
    description: "Visualiza los matches conforme los participantes votan durante el evento."
  }
];

export const Features = () => {
  return (
    <section id="caracteristicas" className="py-24 md:py-32 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Todo incluido
          </span>
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">
            Características que marcan la diferencia
          </h2>
          <p className="text-lg text-muted-foreground">
            Herramientas profesionales para organizar eventos de speed dating sin complicaciones
          </p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="group p-6 rounded-xl bg-card border border-border/50 hover:shadow-card transition-all duration-300"
            >
              <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                <feature.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-base mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
