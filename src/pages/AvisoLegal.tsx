import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";

const AvisoLegal = () => {
  return (
    <>
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <h1 className="text-4xl font-display font-bold mb-8">Aviso Legal</h1>
          
          <div className="prose prose-gray max-w-none space-y-6">
            <p className="text-muted-foreground">Última actualización: Diciembre 2024</p>
            
            <section className="space-y-4">
              <h2 className="text-2xl font-display font-semibold">1. Datos identificativos</h2>
              <p>En cumplimiento del artículo 10 de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y Comercio Electrónico (LSSI-CE), se informa:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Titular:</strong> [TU_NOMBRE_O_RAZÓN_SOCIAL]</li>
                <li><strong>NIF/CIF:</strong> [TU_NIF_O_CIF]</li>
                <li><strong>Domicilio:</strong> [TU_DIRECCIÓN_COMPLETA]</li>
                <li><strong>Email:</strong> [TU_EMAIL_DE_CONTACTO]</li>
                <li><strong>Nombre de dominio:</strong> speedmatch.app</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-display font-semibold">2. Objeto</h2>
              <p className="text-muted-foreground">El presente Aviso Legal regula el uso del sitio web speedmatch.app, del que es titular [TU_NOMBRE]. La navegación por el sitio web atribuye la condición de usuario e implica la aceptación plena de las disposiciones incluidas en este Aviso Legal.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-display font-semibold">3. Propiedad intelectual e industrial</h2>
              <p className="text-muted-foreground">El sitio web, incluyendo a título enunciativo pero no limitativo su programación, edición, compilación y demás elementos necesarios para su funcionamiento, los diseños, logotipos, texto y/o gráficos, son propiedad del titular o dispone de licencia o autorización expresa por parte de los autores.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-display font-semibold">4. Exención de responsabilidades</h2>
              <p className="text-muted-foreground">El titular se exime de cualquier tipo de responsabilidad derivada de la información publicada en su sitio web siempre que no tenga conocimiento efectivo de que esta información haya sido manipulada por terceros ajenos.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-display font-semibold">5. Ley aplicable y jurisdicción</h2>
              <p className="text-muted-foreground">Para la resolución de todas las controversias o cuestiones relacionadas con el presente sitio web, será de aplicación la legislación española, a la que se someten expresamente las partes, siendo competentes los Juzgados y Tribunales de [TU_CIUDAD].</p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default AvisoLegal;
