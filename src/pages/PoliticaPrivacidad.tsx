import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";

const PoliticaPrivacidad = () => {
  return (
    <>
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <h1 className="text-4xl font-display font-bold mb-8">Política de Privacidad</h1>
          
          <div className="prose prose-gray max-w-none space-y-6">
            <p className="text-muted-foreground">Última actualización: Diciembre 2024</p>
            
            <section className="space-y-4">
              <h2 className="text-2xl font-display font-semibold">1. Responsable del tratamiento</h2>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Identidad:</strong> [TU_NOMBRE_O_RAZÓN_SOCIAL]</li>
                <li><strong>NIF/CIF:</strong> [TU_NIF_O_CIF]</li>
                <li><strong>Dirección:</strong> [TU_DIRECCIÓN]</li>
                <li><strong>Email:</strong> [TU_EMAIL]</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-display font-semibold">2. Finalidad del tratamiento</h2>
              <p className="text-muted-foreground">Los datos personales recabados serán tratados con las siguientes finalidades:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Gestionar el registro de usuarios en la plataforma</li>
                <li>Organizar y gestionar actividades de conexión social</li>
                <li>Comunicar los resultados de matches a los participantes</li>
                <li>Enviar comunicaciones comerciales (con consentimiento previo)</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-display font-semibold">3. Legitimación</h2>
              <p className="text-muted-foreground">La base legal para el tratamiento de sus datos es:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Ejecución del contrato de servicios</li>
                <li>Consentimiento del interesado</li>
                <li>Interés legítimo del responsable</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-display font-semibold">4. Conservación de datos</h2>
              <p className="text-muted-foreground">Los datos se conservarán durante el tiempo necesario para cumplir con la finalidad para la que se recabaron y para determinar las posibles responsabilidades que se pudieran derivar.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-display font-semibold">5. Derechos del usuario</h2>
              <p className="text-muted-foreground">Puede ejercer los siguientes derechos:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Acceso:</strong> conocer qué datos tratamos sobre usted</li>
                <li><strong>Rectificación:</strong> modificar datos inexactos</li>
                <li><strong>Supresión:</strong> solicitar la eliminación de sus datos</li>
                <li><strong>Oposición:</strong> oponerse al tratamiento de sus datos</li>
                <li><strong>Portabilidad:</strong> recibir sus datos en formato estructurado</li>
                <li><strong>Limitación:</strong> solicitar la limitación del tratamiento</li>
              </ul>
              <p className="text-muted-foreground">Para ejercer estos derechos, contacte con [TU_EMAIL]. También puede presentar una reclamación ante la Agencia Española de Protección de Datos (www.aepd.es).</p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default PoliticaPrivacidad;
