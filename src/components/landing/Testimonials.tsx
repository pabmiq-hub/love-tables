import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "María García",
    role: "Propietaria de Bar El Encuentro",
    location: "Madrid",
    content: "SpeedMatch ha transformado nuestras noches de jueves. Antes organizábamos todo con papel y era un caos. Ahora en 5 minutos tengo todo listo y los clientes adoran la experiencia.",
    rating: 5
  },
  {
    name: "Carlos Rodríguez",
    role: "Director de Eventos Conexión",
    location: "Barcelona",
    content: "Llevo 8 años organizando speed dating y probé muchas herramientas. SpeedMatch es la más completa y fácil de usar. El sistema de matches automático me ahorra horas.",
    rating: 5
  },
  {
    name: "Ana Martínez",
    role: "Técnica de Juventud",
    location: "Ayuntamiento de Alcobendas",
    content: "Organizamos eventos para combatir la soledad no deseada en jóvenes. La plataforma nos permite gestionar eventos de 50+ personas sin esfuerzo.",
    rating: 5
  }
];

export const Testimonials = () => {
  return (
    <section id="testimonios" className="py-16 md:py-20">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
            Testimonios
          </span>
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">
            Lo que dicen nuestros usuarios
          </h2>
          <p className="text-lg text-muted-foreground">
            Organizadores de toda España confían en SpeedMatch para sus eventos
          </p>
        </div>

        {/* Testimonials grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div 
              key={index} 
              className="relative p-8 rounded-2xl bg-card border border-border/50 shadow-card"
            >
              {/* Quote icon */}
              <Quote className="absolute top-6 right-6 w-10 h-10 text-primary/10" />
              
              {/* Rating */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-accent fill-accent" />
                ))}
              </div>
              
              {/* Content */}
              <p className="text-foreground mb-6 leading-relaxed">
                "{testimonial.content}"
              </p>
              
              {/* Author */}
              <div>
                <p className="font-display font-semibold">
                  {testimonial.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {testimonial.role}
                </p>
                <p className="text-sm text-muted-foreground">
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
