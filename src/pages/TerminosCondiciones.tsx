import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
const TerminosCondiciones = () => {
  return <>
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <h1 className="text-4xl font-display font-bold mb-8">Términos y Condiciones</h1>
          
          <div className="prose prose-gray max-w-none space-y-6">
            <p className="text-muted-foreground">Última actualización: 26 de enero de 2026</p>
            
            <section className="space-y-4">
              <h2 className="text-2xl font-display font-semibold">1. Aceptación de los términos</h2>
              <p className="text-muted-foreground">Al acceder y utilizar Konektum, aceptas estar vinculado por estos Términos y Condiciones. Si no estás de acuerdo con alguna parte, no deberás utilizar nuestros servicios.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-display font-semibold">2. Descripción del servicio</h2>
              <p className="text-muted-foreground">Konektum es una plataforma digital que permite a organizadores gestionar actividades de conexión social y networking profesional, incluyendo registro de participantes, generación de mesas, sistema de votación y comunicación de matches.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-display font-semibold">3. Registro y cuenta</h2>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Debes proporcionar información veraz y actualizada</li>
                <li>Eres responsable de mantener la confidencialidad de tu cuenta</li>
                <li>Debes tener al menos 18 años para usar el servicio</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-display font-semibold">4. Uso aceptable</h2>
              <p className="text-muted-foreground">Te comprometes a:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>No usar el servicio para fines ilegales</li>
                <li>No suplantar la identidad de terceros</li>
                <li>No compartir contenido ofensivo o inapropiado</li>
                <li>Respetar los derechos de otros usuarios</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-display font-semibold">5. Propiedad intelectual</h2>
              <p className="text-muted-foreground">Todo el contenido de Konektum, incluyendo diseño, código, textos e imágenes, está protegido por las leyes de propiedad intelectual.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-display font-semibold">6. Limitación de responsabilidad</h2>
              <p className="text-muted-foreground">Konektum no garantiza que el servicio esté libre de errores o interrupciones. No nos hacemos responsables de las relaciones personales o profesionales que surjan entre participantes de los eventos.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-display font-semibold">7. Modificaciones</h2>
              <p className="text-muted-foreground">Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios serán efectivos desde su publicación en el sitio web.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-display font-semibold">8. Contacto</h2>
              <p className="text-muted-foreground">Para cualquier consulta sobre estos términos, contacta con hola@konektum.com</p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>;
};
export default TerminosCondiciones;