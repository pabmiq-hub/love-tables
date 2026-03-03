import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Building2, Briefcase, ShoppingCart, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Language, translations } from "@/i18n/translations";

interface ProfessionalConfig {
  sectors?: string[];
  predefined_needs?: string[];
  predefined_solutions?: string[];
  rotation_type?: string;
}

interface B2BRegistrationFormProps {
  eventName: string;
  eventDate: Date | null;
  eventTime: string | null;
  eventLocation: string | null;
  eventLang: Language;
  registrationSubtitle: string | null;
  registrationDescription: string | null;
  professionalConfig: ProfessionalConfig | null;
  isSubmitting: boolean;
  onSubmit: (data: B2BFormData) => void;
}

export interface B2BFormData {
  name: string;
  email: string;
  phone: string;
  entityType: "client" | "provider";
  companyName: string;
  sector: string;
  companySize: string;
  needs: string[];
  solutions: string[];
}

const COMPANY_SIZES_ES = ["1-10 empleados", "11-50 empleados", "51-200 empleados", "201-500 empleados", "500+ empleados"];
const COMPANY_SIZES_EN = ["1-10 employees", "11-50 employees", "51-200 employees", "201-500 employees", "500+ employees"];

const DEFAULT_SECTORS_ES = ["Tecnología", "Marketing", "Finanzas", "Salud", "Educación", "Consultoría", "Industria", "Servicios", "Otro"];
const DEFAULT_SECTORS_EN = ["Technology", "Marketing", "Finance", "Healthcare", "Education", "Consulting", "Industry", "Services", "Other"];

const B2BRegistrationForm = ({
  eventName,
  eventDate,
  eventTime,
  eventLocation,
  eventLang,
  registrationSubtitle,
  registrationDescription,
  professionalConfig,
  isSubmitting,
  onSubmit,
}: B2BRegistrationFormProps) => {
  const t = translations[eventLang];
  const b2b = (t as any).b2b || translations.es.b2b;

  const [step, setStep] = useState(1);
  const totalSteps = 4;

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [entityType, setEntityType] = useState<"client" | "provider" | "">("");
  const [companyName, setCompanyName] = useState("");
  const [sector, setSector] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [selectedNeeds, setSelectedNeeds] = useState<string[]>([]);
  const [selectedSolutions, setSelectedSolutions] = useState<string[]>([]);

  const companySizes = eventLang === "en" ? COMPANY_SIZES_EN : COMPANY_SIZES_ES;
  const sectors = professionalConfig?.sectors?.length
    ? professionalConfig.sectors
    : eventLang === "en" ? DEFAULT_SECTORS_EN : DEFAULT_SECTORS_ES;
  const needs = professionalConfig?.predefined_needs || [];
  const solutions = professionalConfig?.predefined_solutions || [];

  const canAdvance = (s: number): boolean => {
    switch (s) {
      case 1: return !!(name.trim() && email.trim() && phone.trim());
      case 2: return !!entityType;
      case 3: return !!(companyName.trim() && sector && companySize);
      case 4: return entityType === "client" ? selectedNeeds.length > 0 : selectedSolutions.length > 0;
      default: return false;
    }
  };

  const handleNext = () => {
    if (step < totalSteps && canAdvance(step)) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAdvance(4)) return;
    onSubmit({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      entityType: entityType as "client" | "provider",
      companyName: companyName.trim(),
      sector,
      companySize,
      needs: entityType === "client" ? selectedNeeds : [],
      solutions: entityType === "provider" ? selectedSolutions : [],
    });
  };

  const toggleItem = (item: string, list: string[], setter: (v: string[]) => void) => {
    setter(list.includes(item) ? list.filter(i => i !== item) : [...list, item]);
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader className="text-center">
        <CardTitle className="font-display text-2xl">{b2b.joinEvent} {eventName}</CardTitle>
        <CardDescription>
          {registrationSubtitle || b2b.formSubtitle}
          {registrationDescription && (
            <span className="block mt-2 text-sm text-foreground/80 whitespace-pre-line">{registrationDescription}</span>
          )}
          {eventDate && (
            <span className="block mt-2 text-primary font-medium">
              📅 {eventDate.toLocaleDateString(eventLang === "en" ? "en-US" : "es-ES", { weekday: "long", day: "numeric", month: "long" })}
              {eventTime && ` · 🕐 ${eventTime}`}
            </span>
          )}
          {eventLocation && (
            <span className="block mt-1 text-foreground/70 font-medium">📍 {eventLocation}</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>{b2b.step} {step} {b2b.of} {totalSteps}</span>
            <span>{Math.round((step / totalSteps) * 100)}%</span>
          </div>
          <Progress value={(step / totalSteps) * 100} className="h-2" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Step 1: Contact info */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="font-semibold text-lg">{b2b.step1Title}</h3>
              <div className="space-y-2">
                <Label htmlFor="b2b-name">{b2b.nameLabel}</Label>
                <Input id="b2b-name" value={name} onChange={e => setName(e.target.value)} placeholder={b2b.namePlaceholder} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="b2b-email">{b2b.emailLabel}</Label>
                <Input id="b2b-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={b2b.emailPlaceholder} required />
                <p className="text-xs text-muted-foreground">{b2b.emailHint}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="b2b-phone">{b2b.phoneLabel}</Label>
                <Input id="b2b-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder={b2b.phonePlaceholder} required />
              </div>
            </div>
          )}

          {/* Step 2: Client or Provider */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="font-semibold text-lg">{b2b.step2Title}</h3>
              <p className="text-sm text-muted-foreground">{b2b.step2Desc}</p>
              <div className="grid grid-cols-1 gap-3">
                <button
                  type="button"
                  onClick={() => setEntityType("client")}
                  className={`p-5 rounded-xl border-2 text-left transition-all ${
                    entityType === "client"
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      entityType === "client" ? "bg-primary text-primary-foreground" : "bg-muted"
                    }`}>
                      <ShoppingCart className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-semibold">{b2b.clientLabel}</p>
                      <p className="text-sm text-muted-foreground">{b2b.clientDesc}</p>
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setEntityType("provider")}
                  className={`p-5 rounded-xl border-2 text-left transition-all ${
                    entityType === "provider"
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      entityType === "provider" ? "bg-primary text-primary-foreground" : "bg-muted"
                    }`}>
                      <Briefcase className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-semibold">{b2b.providerLabel}</p>
                      <p className="text-sm text-muted-foreground">{b2b.providerDesc}</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Company info */}
          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="font-semibold text-lg">{b2b.step3Title}</h3>
              <div className="space-y-2">
                <Label htmlFor="b2b-company">{b2b.companyNameLabel}</Label>
                <Input id="b2b-company" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder={b2b.companyNamePlaceholder} required />
              </div>
              <div className="space-y-2">
                <Label>{b2b.sectorLabel}</Label>
                <Select value={sector} onValueChange={setSector}>
                  <SelectTrigger>
                    <SelectValue placeholder={b2b.sectorPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {sectors.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{b2b.companySizeLabel}</Label>
                <Select value={companySize} onValueChange={setCompanySize}>
                  <SelectTrigger>
                    <SelectValue placeholder={b2b.companySizePlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {companySizes.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 4: Needs or Solutions */}
          {step === 4 && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="font-semibold text-lg">
                {entityType === "client" ? b2b.needsTitle : b2b.solutionsTitle}
              </h3>
              <p className="text-sm text-muted-foreground">
                {entityType === "client" ? b2b.needsDesc : b2b.solutionsDesc}
              </p>
              <div className="space-y-3">
                {(entityType === "client" ? needs : solutions).map(item => {
                  const list = entityType === "client" ? selectedNeeds : selectedSolutions;
                  const setter = entityType === "client" ? setSelectedNeeds : setSelectedSolutions;
                  return (
                    <label
                      key={item}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        list.includes(item) ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                      }`}
                    >
                      <Checkbox
                        checked={list.includes(item)}
                        onCheckedChange={() => toggleItem(item, list, setter)}
                      />
                      <span className="text-sm">{item}</span>
                    </label>
                  );
                })}
              </div>
              {(entityType === "client" ? needs : solutions).length === 0 && (
                <p className="text-sm text-muted-foreground italic">{b2b.noOptionsConfigured}</p>
              )}
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex gap-3 pt-4">
            {step > 1 && (
              <Button type="button" variant="outline" onClick={handleBack} className="flex-1">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {b2b.back}
              </Button>
            )}
            {step < totalSteps ? (
              <Button
                type="button"
                variant="hero"
                onClick={handleNext}
                disabled={!canAdvance(step)}
                className="flex-1"
              >
                {b2b.next}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="submit"
                variant="hero"
                disabled={isSubmitting || !canAdvance(4)}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {b2b.submitting}
                  </>
                ) : (
                  b2b.submitButton
                )}
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default B2BRegistrationForm;
