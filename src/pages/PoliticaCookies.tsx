import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
const PoliticaCookies = () => {
  return <>
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <h1 className="text-4xl font-display font-bold mb-8">Política de Cookies</h1>
          
          <div className="prose prose-gray max-w-none space-y-6">
            <p className="text-muted-foreground">Última actualización: 26 de enero de 2026</p>
            
            <section className="space-y-4">
              <h2 className="text-2xl font-display font-semibold">1. ¿Qué son las cookies?</h2>
              <p className="text-muted-foreground">Las cookies son pequeños archivos de texto que los sitios web almacenan en su dispositivo cuando los visita. Se utilizan para recordar sus preferencias, mejorar su experiencia de navegación y ofrecerle contenido personalizado.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-display font-semibold">2. Tipos de cookies que utilizamos</h2>
              
              <h3 className="text-xl font-display font-medium">Cookies técnicas (necesarias)</h3>
              <p className="text-muted-foreground">Son esenciales para el funcionamiento del sitio web. Sin ellas, el sitio no funcionaría correctamente.</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Sesión de usuario:</strong> mantiene su sesión iniciada</li>
                <li><strong>Preferencias de cookies:</strong> recuerda su configuración de cookies</li>
              </ul>

              <h3 className="text-xl font-display font-medium">Cookies analíticas</h3>
              <p className="text-muted-foreground">Nos permiten medir y analizar el uso del sitio web para mejorar nuestros servicios.</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Google Analytics:</strong> análisis de tráfico y comportamiento de usuarios</li>
              </ul>

              <h3 className="text-xl font-display font-medium">Cookies de marketing</h3>
              <p className="text-muted-foreground">Se utilizan para mostrar publicidad relevante y medir la efectividad de las campañas.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-display font-semibold">3. Gestión de cookies</h2>
              <p className="text-muted-foreground">Puede configurar sus preferencias de cookies en cualquier momento haciendo clic en "Configurar cookies" en el pie de página. También puede gestionar las cookies desde la configuración de su navegador.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-display font-semibold">4. Más información</h2>
              <p className="text-muted-foreground">Para más información sobre cómo tratamos sus datos, consulte nuestra <a href="/politica-privacidad" className="text-primary hover:underline">Política de Privacidad</a>.</p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>;
};
export default PoliticaCookies;