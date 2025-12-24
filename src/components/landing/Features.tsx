import { useState } from "react";
import { 
  QrCode, 
  Timer, 
  Users,
  Heart,
  Mail,
  BarChart3,
  Sparkles,
  CheckCircle2,
  ArrowRight
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const featureTabs = [
  {
    id: "gestion",
    label: "Gestión de Eventos",
    icon: Users,
    title: "Organiza eventos sin esfuerzo",
    description: "Desde la inscripción hasta el final, todo automatizado para que te centres en lo importante: crear conexiones.",
    features: [
      { icon: QrCode, text: "Check-in instantáneo con QR único por evento" },
      { icon: Timer, text: "Temporizador de rondas con alarmas configurables" },
      { icon: Users, text: "Importación masiva desde Excel en segundos" },
      { icon: Sparkles, text: "Algoritmo inteligente de combinaciones de mesas" }
    ],
    visual: (
      <div className="relative w-full h-64 md:h-80 bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="grid grid-cols-3 gap-4 p-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div 
                key={i} 
                className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-card shadow-lg flex items-center justify-center animate-pulse"
                style={{ animationDelay: `${i * 150}ms` }}
              >
                <Users className="w-8 h-8 text-primary/50" />
              </div>
            ))}
          </div>
        </div>
        <div className="absolute bottom-4 left-4 right-4 bg-card/90 backdrop-blur-sm rounded-xl p-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Timer className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Ronda 3 de 8</p>
              <p className="text-xs text-muted-foreground">2:45 restantes</p>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: "participantes",
    label: "Experiencia Participante",
    icon: Heart,
    title: "Votación simple y discreta",
    description: "Los participantes votan desde su móvil sin complicaciones. Sin papeles, sin colas, sin errores.",
    features: [
      { icon: Heart, text: "Votación en tiempo real desde cualquier dispositivo" },
      { icon: CheckCircle2, text: "Interfaz intuitiva que cualquiera puede usar" },
      { icon: Sparkles, text: "Sistema de 'me gusta' y 'super like'" },
      { icon: Users, text: "Filtros por preferencias y rangos de edad" }
    ],
    visual: (
      <div className="relative w-full h-64 md:h-80 bg-gradient-to-br from-accent/10 to-primary/10 rounded-2xl overflow-hidden flex items-center justify-center">
        <div className="w-48 md:w-56 bg-card rounded-3xl shadow-2xl overflow-hidden border border-border/50">
          <div className="p-4 bg-primary/5 border-b border-border/30">
            <p className="text-sm font-medium text-center">¿Te gustó?</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="w-full h-24 rounded-xl bg-muted/50 flex items-center justify-center">
              <Users className="w-12 h-12 text-muted-foreground/30" />
            </div>
            <p className="text-center font-medium">Participante #5</p>
            <div className="flex gap-3 justify-center">
              <button className="w-14 h-14 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
                <span className="text-2xl">👎</span>
              </button>
              <button className="w-14 h-14 rounded-full bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors animate-pulse">
                <Heart className="w-6 h-6 text-primary-foreground" />
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: "resultados",
    label: "Matches y Resultados",
    icon: BarChart3,
    title: "Matches perfectos, enviados automáticamente",
    description: "Cuando termina el evento, calculamos los matches mutuos y enviamos los resultados por email.",
    features: [
      { icon: BarChart3, text: "Dashboard con estadísticas en tiempo real" },
      { icon: Mail, text: "Emails personalizados con los matches" },
      { icon: CheckCircle2, text: "Exportación de datos para análisis" },
      { icon: Sparkles, text: "Detección automática de matches mutuos" }
    ],
    visual: (
      <div className="relative w-full h-64 md:h-80 bg-gradient-to-br from-green-500/10 to-primary/10 rounded-2xl overflow-hidden p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Matches del evento</h4>
            <span className="text-2xl font-bold text-primary">12</span>
          </div>
          
          {[1, 2, 3].map((i) => (
            <div 
              key={i} 
              className="bg-card rounded-xl p-4 shadow-md flex items-center gap-4 animate-fade-in"
              style={{ animationDelay: `${i * 200}ms` }}
            >
              <div className="flex -space-x-2">
                <div className="w-10 h-10 rounded-full bg-primary/20 border-2 border-card" />
                <div className="w-10 h-10 rounded-full bg-accent/20 border-2 border-card" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Match #{i}</p>
                <p className="text-xs text-muted-foreground">Email enviado ✓</p>
              </div>
              <Heart className="w-5 h-5 text-primary fill-primary" />
            </div>
          ))}
        </div>
      </div>
    )
  }
];

export const Features = () => {
  const [activeTab, setActiveTab] = useState("gestion");

  return (
    <section id="caracteristicas" className="py-24 md:py-32 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Todo en uno
          </span>
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">
            Una plataforma completa
          </h2>
          <p className="text-lg text-muted-foreground">
            Gestiona cada fase del evento con herramientas diseñadas para el éxito
          </p>
        </div>

        {/* Interactive Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-6xl mx-auto">
          <TabsList className="grid w-full grid-cols-3 h-auto p-1.5 bg-card border border-border/50 rounded-xl mb-8">
            {featureTabs.map((tab) => (
              <TabsTrigger 
                key={tab.id} 
                value={tab.id}
                className="flex items-center gap-2 py-3 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg transition-all duration-300"
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {featureTabs.map((tab) => (
            <TabsContent 
              key={tab.id} 
              value={tab.id}
              className="animate-fade-in"
            >
              <div className="grid md:grid-cols-2 gap-8 items-center">
                {/* Content */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-2xl md:text-3xl font-display font-bold mb-3">
                      {tab.title}
                    </h3>
                    <p className="text-muted-foreground text-lg">
                      {tab.description}
                    </p>
                  </div>
                  
                  <ul className="space-y-4">
                    {tab.features.map((feature, index) => (
                      <li 
                        key={index}
                        className="flex items-center gap-3 group"
                      >
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                          <feature.icon className="w-5 h-5 text-primary" />
                        </div>
                        <span className="text-foreground">{feature.text}</span>
                      </li>
                    ))}
                  </ul>

                  <button className="inline-flex items-center gap-2 text-primary font-medium group">
                    Ver más detalles
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>

                {/* Visual */}
                <div className="order-first md:order-last">
                  {tab.visual}
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
};
