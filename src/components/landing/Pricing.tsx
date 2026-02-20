import { Button } from "@/components/ui/button";
import { Check, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";

export const Pricing = () => {
  const { t } = useLanguage();

  const plans = [
    {
      name: t.pricing.plan1Name,
      price: t.pricing.plan1Price,
      period: t.pricing.plan1Period,
      description: t.pricing.plan1Desc,
      features: [t.pricing.plan1Feat1, t.pricing.plan1Feat2, t.pricing.plan1Feat3, t.pricing.plan1Feat4, t.pricing.plan1Feat5],
      cta: t.pricing.plan1Cta,
      highlighted: false,
    },
    {
      name: t.pricing.plan2Name,
      price: t.pricing.plan2Price,
      period: t.pricing.plan2Period,
      description: t.pricing.plan2Desc,
      features: [t.pricing.plan2Feat1, t.pricing.plan2Feat2, t.pricing.plan2Feat3, t.pricing.plan2Feat4, t.pricing.plan2Feat5, t.pricing.plan2Feat6],
      cta: t.pricing.plan2Cta,
      highlighted: true,
    },
    {
      name: t.pricing.plan3Name,
      price: t.pricing.plan3Price,
      period: t.pricing.plan3Period,
      description: t.pricing.plan3Desc,
      features: [t.pricing.plan3Feat1, t.pricing.plan3Feat2, t.pricing.plan3Feat3, t.pricing.plan3Feat4, t.pricing.plan3Feat5, t.pricing.plan3Feat6],
      cta: t.pricing.plan3Cta,
      highlighted: false,
    },
  ];

  return (
    <section id="precios" className="py-12 sm:py-16 md:py-20 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
          <span className="inline-block px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium mb-3 sm:mb-4">
            {t.pricing.badge}
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-display font-bold mb-3 sm:mb-4">
            {t.pricing.title}
          </h2>
          <p className="text-sm sm:text-lg text-muted-foreground px-2">
            {t.pricing.subtitle}
          </p>
        </div>

        {/* Pricing grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <div 
              key={index} 
              className={`relative p-5 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl border ${
                plan.highlighted 
                  ? 'bg-gradient-to-b from-primary/5 to-card border-primary/30 shadow-elevated sm:col-span-2 lg:col-span-1' 
                  : 'bg-card border-border/50 shadow-card'
              }`}
            >
              {/* Popular badge */}
              {plan.highlighted && (
                <div className="absolute -top-3 sm:-top-4 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-gradient-primary text-primary-foreground text-xs sm:text-sm font-medium">
                    <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
                    {t.pricing.popular}
                  </span>
                </div>
              )}
              
              {/* Plan info */}
              <div className="mb-4 sm:mb-6">
                <h3 className="font-display font-semibold text-lg sm:text-xl mb-1 sm:mb-2">
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-1 mb-1 sm:mb-2">
                  <span className="text-2xl sm:text-3xl md:text-4xl font-display font-bold">
                    {plan.price}
                  </span>
                  <span className="text-sm sm:text-base text-muted-foreground">
                    {plan.period}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {plan.description}
                </p>
              </div>
              
              {/* Features */}
              <ul className="space-y-2 sm:space-y-3 mb-6 sm:mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                    <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center shrink-0 ${
                      plan.highlighted ? 'bg-primary/20' : 'bg-muted'
                    }`}>
                      <Check className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${plan.highlighted ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              
              {/* CTA */}
              <Link to="/admin/register" className="block">
                <Button 
                  className={`w-full ${
                    plan.highlighted 
                      ? 'bg-gradient-primary hover:opacity-90' 
                      : ''
                  }`}
                  variant={plan.highlighted ? "default" : "outline"}
                >
                  {plan.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
