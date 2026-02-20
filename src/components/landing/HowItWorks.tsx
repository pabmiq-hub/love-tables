import { ClipboardList, Users, Shuffle, Heart } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

export const HowItWorks = () => {
  const { t } = useLanguage();

  const steps = [
    { icon: ClipboardList, title: t.howItWorks.step1Title, description: t.howItWorks.step1Desc },
    { icon: Users, title: t.howItWorks.step2Title, description: t.howItWorks.step2Desc },
    { icon: Shuffle, title: t.howItWorks.step3Title, description: t.howItWorks.step3Desc },
    { icon: Heart, title: t.howItWorks.step4Title, description: t.howItWorks.step4Desc },
  ];

  return (
    <section id="como-funciona" className="py-12 sm:py-16 md:py-20 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
          <div className="animate-fade-in mb-4 sm:mb-6">
            <span className="text-base sm:text-lg md:text-xl font-display font-medium text-primary">
              {t.howItWorks.nextMatch}
            </span>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-gradient">4</span>
              <span className="text-base sm:text-lg md:text-xl font-display font-medium text-muted-foreground">{t.howItWorks.steps}</span>
            </div>
          </div>
          <h2 className="text-xl sm:text-2xl md:text-4xl font-display font-bold mb-2 sm:mb-3 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            {t.howItWorks.title}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground animate-fade-in px-2" style={{ animationDelay: '0.2s' }}>
            {t.howItWorks.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative group animate-fade-in" style={{ animationDelay: `${0.4 + index * 0.15}s` }}>
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-10 sm:top-12 left-[60%] w-[80%] h-[2px] bg-gradient-to-r from-primary/30 to-transparent" />
              )}
              <div className="relative bg-card rounded-xl sm:rounded-2xl p-5 sm:p-6 md:p-8 shadow-card border border-border/50 hover:shadow-elevated transition-all duration-300 hover:-translate-y-1">
                <div className="absolute -top-2 -right-2 sm:-top-3 sm:-right-3 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground text-xs sm:text-sm font-bold">
                  {index + 1}
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-lg sm:rounded-xl bg-primary/10 flex items-center justify-center mb-4 sm:mb-6 group-hover:bg-primary/15 transition-colors">
                  <step.icon className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-base sm:text-lg md:text-xl mb-2 sm:mb-3">
                  {step.title}
                </h3>
                <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed text-justify">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
