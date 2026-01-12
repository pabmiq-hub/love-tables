import { Link } from "react-router-dom";
import konektumLogo from "@/assets/konektum-logo.png";

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <img src={konektumLogo} alt="Konektum" className="h-10 w-auto" />
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              La plataforma líder para organizar eventos de speed dating y networking profesional en España.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-display font-semibold mb-4">Producto</h4>
            <ul className="space-y-3">
              <li>
                <a href="#como-funciona" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Cómo funciona
                </a>
              </li>
              <li>
                <a href="#caracteristicas" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Características
                </a>
              </li>
              <li>
                <a href="#precios" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Precios
                </a>
              </li>
              <li>
                <a href="#testimonios" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Testimonios
                </a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-display font-semibold mb-4">Empresa</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/aviso-legal" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Aviso Legal
                </Link>
              </li>
              <li>
                <Link to="/politica-privacidad" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Política de Privacidad
                </Link>
              </li>
              <li>
                <Link to="/politica-cookies" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Política de Cookies
                </Link>
              </li>
              <li>
                <Link to="/terminos-condiciones" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Términos y Condiciones
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display font-semibold mb-4">Contacto</h4>
            <ul className="space-y-3">
              <li>
                <a href="mailto:hola@konektum.app" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  hola@konektum.app
                </a>
              </li>
              <li>
                <Link to="/admin/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Acceso organizadores
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {currentYear} Konektum. Todos los derechos reservados.
          </p>
          <button 
            onClick={() => {
              // Trigger cookie settings modal
              window.dispatchEvent(new CustomEvent('open-cookie-settings'));
            }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Configurar cookies
          </button>
        </div>
      </div>
    </footer>
  );
};
