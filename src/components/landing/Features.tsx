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
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/i18n/LanguageContext";

const es = (a: string, b: string, lang: string) => lang === "es" ? a : b;

export const Features = () => {
  const [activeTab, setActiveTab] = useState("gestion");
  const { t, language } = useLanguage();

  const featureTabs = [
    {
      id: "gestion",
      label: t.features.tab1,
      icon: Users,
      title: t.features.tab1Title,
      description: t.features.tab1Desc,
      features: [
        { icon: QrCode, text: es("Check-in instantáneo con QR único por evento", "Instant QR check-in unique to each event", language) },
        { icon: Timer, text: es("Temporizador de rondas con alarmas configurables", "Round timer with configurable alarms", language) },
        { icon: Users, text: es("Importación masiva desde Excel en segundos", "Bulk import from Excel in seconds", language) },
        { icon: Sparkles, text: es("Algoritmo inteligente de combinaciones de mesas", "Smart table combination algorithm", language) },
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
                <p className="text-sm font-medium">{es("Ronda 3 de 8", "Round 3 of 8", language)}</p>
                <p className="text-xs text-muted-foreground">{es("2:45 restantes", "2:45 remaining", language)}</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "participantes",
      label: t.features.tab2,
      icon: Heart,
      title: t.features.tab2Title,
      description: t.features.tab2Desc,
      features: [
        { icon: Heart, text: es("Votación en tiempo real desde cualquier dispositivo", "Real-time voting from any device", language) },
        { icon: CheckCircle2, text: es("Interfaz intuitiva que cualquiera puede usar", "Intuitive interface anyone can use", language) },
        { icon: Sparkles, text: es("Sistema de votación con 'me gusta'", "Like-based voting system", language) },
        { icon: Users, text: es("Filtros por preferencias y rangos de edad", "Filters by preferences and age ranges", language) },
      ],
      visual: (
        <div className="relative w-full h-64 md:h-80 bg-gradient-to-br from-accent/10 to-primary/10 rounded-2xl overflow-hidden flex items-center justify-center">
          <div className="w-48 md:w-56 bg-card rounded-3xl shadow-2xl overflow-hidden border border-border/50">
            <div className="p-4 bg-primary/5 border-b border-border/30">
              <p className="text-sm font-medium text-center">{es("¿Te gustó?", "Did you like them?", language)}</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="w-full h-24 rounded-xl bg-muted/50 flex items-center justify-center">
                <Users className="w-12 h-12 text-muted-foreground/30" />
              </div>
              <p className="text-center font-medium">{es("Participante #5", "Participant #5", language)}</p>
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
      label: t.features.tab3,
      icon: BarChart3,
      title: t.features.tab3Title,
      description: t.features.tab3Desc,
      features: [
        { icon: BarChart3, text: es("Dashboard con estadísticas en tiempo real", "Dashboard with real-time statistics", language) },
        { icon: Mail, text: es("Emails personalizados con los matches", "Personalised emails with matches", language) },
        { icon: CheckCircle2, text: es("Exportación de datos para análisis", "Data export for analysis", language) },
        { icon: Sparkles, text: es("Detección automática de matches mutuos", "Automatic mutual match detection", language) },
      ],
      visual: (
        <div className="relative w-full h-64 md:h-80 bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl overflow-hidden p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">{es("Matches del evento", "Event matches", language)}</h4>
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
                  <p className="text-xs text-muted-foreground">{es("Email enviado ✓", "Email sent ✓", language)}</p>
                </div>
                <Heart className="w-5 h-5 text-primary fill-primary" />
              </div>
            ))}
          </div>
        </div>
      )
    }
  ];

  return (
    <section id="caracteristicas" className="py-12 sm:py-16 md:py-20 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
          <span className="inline-block px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium mb-3 sm:mb-4">
            {t.features.badge}
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-display font-bold mb-3 sm:mb-4">
            {t.features.title}
          </h2>
          <p className="text-sm sm:text-lg text-muted-foreground px-2">
            {t.features.subtitle}
          </p>
        </div>

        {/* Interactive Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-6xl mx-auto">
          <TabsList className="grid w-full grid-cols-3 h-auto p-1 sm:p-1.5 bg-card border border-border/50 rounded-lg sm:rounded-xl mb-6 sm:mb-8">
            {featureTabs.map((tab) => (
              <TabsTrigger 
                key={tab.id} 
                value={tab.id}
                className="flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-3 px-2 sm:px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md sm:rounded-lg transition-all duration-300 text-xs sm:text-sm"
              >
                <tab.icon className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {featureTabs.map((tab) => (
            <TabsContent 
              key={tab.id} 
              value={tab.id}
              className="animate-fade-in"
            >
              <div className="grid md:grid-cols-2 gap-6 sm:gap-8 items-center">
                {/* Content */}
                <div className="space-y-4 sm:space-y-6">
                  <div>
                    <h3 className="text-xl sm:text-2xl md:text-3xl font-display font-bold mb-2 sm:mb-3">
                      {tab.title}
                    </h3>
                    <p className="text-sm sm:text-base md:text-lg text-muted-foreground">
                      {tab.description}
                    </p>
                  </div>
                  
                  <ul className="space-y-3 sm:space-y-4">
                    {tab.features.map((feature, index) => (
                      <li 
                        key={index}
                        className="flex items-center gap-2 sm:gap-3 group"
                      >
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-md sm:rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors shrink-0">
                          <feature.icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                        </div>
                        <span className="text-sm sm:text-base text-foreground">{feature.text}</span>
                      </li>
                    ))}
                  </ul>
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
