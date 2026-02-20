import { Star, Quote } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

export const Testimonials = () => {
  const { language } = useLanguage();

  const testimonials = language === "en"
    ? [
        {
          name: "María García",
          role: "Owner of Bar El Encuentro",
          location: "Madrid",
          content: "Konektum has transformed our Thursday nights. Before we managed everything on paper and it was chaos. Now in 5 minutes everything is ready and customers love the experience.",
          rating: 5
        },
        {
          name: "Carlos Rodríguez",
          role: "Director at Conexión Events",
          location: "Barcelona",
          content: "I've been organising speed dating and networking for 8 years. Konektum is the most complete and easy-to-use tool. The automatic match system saves me hours.",
          rating: 5
        },
        {
          name: "Ana Martínez",
          role: "Networking Manager",
          location: "Valencia Chamber of Commerce",
          content: "We organise professional networking events for entrepreneurs. The platform lets us manage events with 80+ people effortlessly.",
          rating: 5
        }
      ]
    : [
        {
          name: "María García",
          role: "Propietaria de Bar El Encuentro",
          location: "Madrid",
          content: "Konektum ha transformado nuestras noches de jueves. Antes organizábamos todo con papel y era un caos. Ahora en 5 minutos tengo todo listo y los clientes adoran la experiencia.",
          rating: 5
        },
        {
          name: "Carlos Rodríguez",
          role: "Director de Eventos Conexión",
          location: "Barcelona",
          content: "Llevo 8 años organizando speed dating y networking. Konektum es la herramienta más completa y fácil de usar. El sistema de matches automático me ahorra horas.",
          rating: 5
        },
        {
          name: "Ana Martínez",
          role: "Responsable de Networking",
          location: "Cámara de Comercio de Valencia",
          content: "Organizamos eventos de networking profesional para emprendedores. La plataforma nos permite gestionar eventos de 80+ personas sin esfuerzo.",
          rating: 5
        }
      ];

  const heading = language === "en"
    ? { badge: "Testimonials", title: "What our users say", subtitle: "Organizers across Spain trust Konektum for their events" }
    : { badge: "Testimonios", title: "Lo que dicen nuestros usuarios", subtitle: "Organizadores de toda España confían en Konektum para sus eventos" };

  return (
    <section id="testimonios" className="py-12 sm:py-16 md:py-20">
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

        {/* Testimonials grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
          {testimonials.map((testimonial, index) => (
            <div 
              key={index} 
              className={`relative p-5 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl bg-card border border-border/50 shadow-card ${
                index === 2 ? 'sm:col-span-2 lg:col-span-1' : ''
              }`}
            >
              {/* Quote icon */}
              <Quote className="absolute top-4 right-4 sm:top-6 sm:right-6 w-8 h-8 sm:w-10 sm:h-10 text-primary/10" />
              
              {/* Rating */}
              <div className="flex gap-0.5 sm:gap-1 mb-3 sm:mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-3 h-3 sm:w-4 sm:h-4 text-accent fill-accent" />
                ))}
              </div>
              
              {/* Content */}
              <p className="text-sm sm:text-base text-foreground mb-4 sm:mb-6 leading-relaxed">
                "{testimonial.content}"
              </p>
              
              {/* Author */}
              <div>
                <p className="font-display font-semibold text-sm sm:text-base">
                  {testimonial.name}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {testimonial.role}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {testimonial.location}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
