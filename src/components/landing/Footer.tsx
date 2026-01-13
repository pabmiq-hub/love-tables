import { Link } from "react-router-dom";
import konektumLogo from "@/assets/konektum-logo.png";

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-8 sm:mb-12">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <img src={konektumLogo} alt="Konektum" className="h-10 sm:h-12 w-auto" />
            </Link>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              La plataforma líder para organizar eventos de speed dating y networking profesional en España.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-display font-semibold text-sm sm:text-base mb-3 sm:mb-4">Producto</h4>
            <ul className="space-y-2 sm:space-y-3">
              <li>
                <a href="#como-funciona" className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Cómo funciona
                </a>
              </li>
              <li>
                <a href="#caracteristicas" className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Características
                </a>
              </li>
              <li>
                <a href="#precios" className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Precios
                </a>
              </li>
              <li>
                <a href="#testimonios" className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Testimonios
                </a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-display font-semibold text-sm sm:text-base mb-3 sm:mb-4">Empresa</h4>
            <ul className="space-y-2 sm:space-y-3">
              <li>
                <Link to="/aviso-legal" className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Aviso Legal
                </Link>
              </li>
              <li>
                <Link to="/politica-privacidad" className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Política de Privacidad
                </Link>
              </li>
              <li>
                <Link to="/politica-cookies" className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Política de Cookies
                </Link>
              </li>
              <li>
                <Link to="/terminos-condiciones" className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Términos y Condiciones
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="col-span-2 sm:col-span-1">
            <h4 className="font-display font-semibold text-sm sm:text-base mb-3 sm:mb-4">Contacto</h4>
            <ul className="space-y-2 sm:space-y-3">
              <li>
                <a href="mailto:hola@konektum.app" className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors">
                  hola@konektum.app
                </a>
              </li>
              <li>
                <Link to="/admin/login" className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Acceso organizadores
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 sm:pt-8 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
          <p className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
            © {currentYear} Konektum. Todos los derechos reservados.
          </p>
          <button 
            onClick={() => {
              // Trigger cookie settings modal
              window.dispatchEvent(new CustomEvent('open-cookie-settings'));
            }}
            className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Configurar cookies
          </button>
        </div>
      </div>
    </footer>
  );
};
