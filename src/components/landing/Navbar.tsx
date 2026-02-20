import { Button } from "@/components/ui/button";
import { Menu, X, Globe } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import konektumLogo from "@/assets/konektum-logo.png";
import { useLanguage } from "@/i18n/LanguageContext";
import type { Language } from "@/i18n/translations";

export const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === "es" ? "en" : "es");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img src={konektumLogo} alt="Konektum" className="h-8 sm:h-10 md:h-12 w-auto" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#como-funciona" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              {t.nav.howItWorks}
            </a>
            <a href="#caracteristicas" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              {t.nav.features}
            </a>
            <a href="#para-quien" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              {t.nav.forWho}
            </a>
            <a href="#testimonios" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              {t.nav.testimonials}
            </a>
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            {/* Language selector */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
              aria-label="Switch language"
            >
              <Globe className="w-3.5 h-3.5" />
              {language === "es" ? "EN" : "ES"}
            </button>
            <Link to="/admin/login">
              <Button variant="ghost" size="sm">
                {t.nav.login}
              </Button>
            </Link>
            <Link to="/admin/register">
              <Button size="sm" className="bg-gradient-primary hover:opacity-90 transition-opacity">
                {t.nav.createAccount}
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
                {t.nav.howItWorks}
              </a>
              <a
                href="#caracteristicas"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                {t.nav.features}
              </a>
              <a
                href="#para-quien"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                {t.nav.forWho}
              </a>
              <a
                href="#testimonios"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                {t.nav.testimonials}
              </a>
              <div className="flex flex-col gap-2 pt-4 border-t border-border">
                {/* Language toggle */}
                <button
                  onClick={toggleLanguage}
                  className="flex items-center justify-center gap-2 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  {language === "es" ? "Switch to English" : "Cambiar a Español"}
                </button>
                <Link to="/admin/login" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-center">
                    {t.nav.login}
                  </Button>
                </Link>
                <Link to="/admin/register" onClick={() => setIsMenuOpen(false)}>
                  <Button className="w-full bg-gradient-primary hover:opacity-90 transition-opacity">
                    {t.nav.createAccount}
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
