import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import konektumLogo from "@/assets/konektum-logo.png";

export const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img src={konektumLogo} alt="Konektum" className="h-10 w-auto" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#como-funciona" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Cómo funciona
            </a>
            <a href="#caracteristicas" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Características
            </a>
            <a href="#para-quien" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Para quién
            </a>
            <a href="#testimonios" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Testimonios
            </a>
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/admin/login">
              <Button variant="ghost" size="sm">
                Iniciar sesión
              </Button>
            </Link>
            <Link to="/admin/register">
              <Button size="sm" className="bg-gradient-primary hover:opacity-90 transition-opacity">
                Crear cuenta
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col gap-4">
              <a 
                href="#como-funciona" 
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Cómo funciona
              </a>
              <a 
                href="#caracteristicas" 
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Características
              </a>
              <a 
                href="#para-quien" 
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Para quién
              </a>
              <a 
                href="#testimonios" 
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Testimonios
              </a>
              <div className="flex flex-col gap-2 pt-4 border-t border-border">
                <Link to="/admin/login" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-center">
                    Iniciar sesión
                  </Button>
                </Link>
                <Link to="/admin/register" onClick={() => setIsMenuOpen(false)}>
                  <Button className="w-full bg-gradient-primary hover:opacity-90 transition-opacity">
                    Crear cuenta
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
