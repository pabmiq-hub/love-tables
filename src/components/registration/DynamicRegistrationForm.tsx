import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import type { FormField } from "@/components/event/RegistrationFormEditor";
import { RichTextRenderer } from "@/components/ui/rich-text-renderer";
import GDPRConsent from "@/components/registration/GDPRConsent";

interface DynamicRegistrationFormProps {
  fields: FormField[];
  eventName: string;
  eventDate: Date | null;
  eventTime: string | null;
  eventLocation: string | null;
  registrationSubtitle: string | null;
  registrationDescription: string | null;
  eventLang: "es" | "en";
  isSubmitting: boolean;
  onSubmit: (values: Record<string, any>) => void;
}

const DynamicRegistrationForm = ({
  fields,
  eventName,
  eventDate,
  eventTime,
  eventLocation,
  registrationSubtitle,
  registrationDescription,
  eventLang,
  isSubmitting,
  onSubmit,
}: DynamicRegistrationFormProps) => {
  const [values, setValues] = useState<Record<string, any>>({});
  const [dataConsent, setDataConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);

  const setValue = (fieldId: string, value: any) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const toggleMultiSelect = (fieldId: string, option: string) => {
    const current = (values[fieldId] as string[]) || [];
    setValue(
      fieldId,
      current.includes(option)
        ? current.filter((v: string) => v !== option)
        : [...current, option]
    );
  };

  const isValid = () => {
    return fields
      .filter((f) => f.required)
      .every((f) => {
        const val = values[f.id];
        if (f.type === "multiselect") return Array.isArray(val) && val.length > 0;
        if (f.type === "checkbox") return val === true;
        return val && String(val).trim() !== "";
      });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid() || !dataConsent) return;
    onSubmit({ ...values, marketingConsent });
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader className="text-center">
        <CardTitle className="font-display text-2xl">
          {eventLang === "en" ? "Join" : "Inscripción"} {eventName}
        </CardTitle>
        <CardDescription>
          {registrationSubtitle ||
            (eventLang === "en"
              ? "Fill in your details to participate"
              : "Completa tus datos para participar")}
          {eventDate && (
            <span className="block mt-2 text-primary font-medium">
              📅{" "}
              {eventDate.toLocaleDateString(
                eventLang === "en" ? "en-US" : "es-ES",
                { weekday: "long", day: "numeric", month: "long" }
              )}
              {eventTime && ` · 🕐 ${eventTime}`}
            </span>
          )}
          {eventLocation && (
            <span className="block mt-1 text-foreground/70 font-medium">
              📍 {eventLocation}
            </span>
          )}
        </CardDescription>
        {registrationDescription && (
          <div className="mt-4 text-sm text-foreground/80 text-left border-t pt-4">
            <RichTextRenderer
              content={registrationDescription}
              className="prose-p:mb-4 prose-p:leading-relaxed prose-headings:mb-2 prose-ul:mb-3 prose-ol:mb-3 prose-li:mb-1 [&_p]:mb-4 [&_p]:leading-relaxed [&_br]:block [&_br]:mb-2"
            />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field) => (
            <div key={field.id} className="space-y-2">
              <Label>
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              {field.description && (
                <p className="text-xs text-muted-foreground">{field.description}</p>
              )}

              {/* Text / Email / Phone / Number */}
              {(field.type === "text" ||
                field.type === "email" ||
                field.type === "phone" ||
                field.type === "number") && (
                <Input
                  type={field.type === "phone" ? "tel" : field.type}
                  value={(values[field.id] as string) || ""}
                  onChange={(e) => setValue(field.id, e.target.value)}
                  placeholder={field.placeholder || field.label}
                  required={field.required}
                />
              )}

              {/* Textarea */}
              {field.type === "textarea" && (
                <Textarea
                  value={(values[field.id] as string) || ""}
                  onChange={(e) => setValue(field.id, e.target.value)}
                  placeholder={field.placeholder || field.label}
                  rows={3}
                />
              )}

              {/* Date */}
              {field.type === "date" && (
                <Input
                  type="date"
                  value={(values[field.id] as string) || ""}
                  onChange={(e) => setValue(field.id, e.target.value)}
                  required={field.required}
                />
              )}

              {/* Select */}
              {field.type === "select" && (
                <Select
                  value={(values[field.id] as string) || ""}
                  onValueChange={(v) => setValue(field.id, v)}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        field.placeholder ||
                        (eventLang === "en" ? "Select..." : "Seleccionar...")
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {(field.options || []).map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Multiselect */}
              {field.type === "multiselect" && (
                <div className="space-y-2">
                  {(field.options || []).map((opt) => {
                    const selected = ((values[field.id] as string[]) || []).includes(opt);
                    return (
                      <label
                        key={opt}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          selected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/40"
                        }`}
                      >
                        <Checkbox
                          checked={selected}
                          onCheckedChange={() => toggleMultiSelect(field.id, opt)}
                        />
                        <span className="text-sm">{opt}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {/* Checkbox */}
              {field.type === "checkbox" && (
                <label className="flex items-center gap-3 cursor-pointer">
                  <Checkbox
                    checked={!!values[field.id]}
                    onCheckedChange={(v) => setValue(field.id, !!v)}
                  />
                  <span className="text-sm">
                    {field.placeholder || field.label}
                  </span>
                </label>
              )}
            </div>
          ))}

          <Button
            type="submit"
            variant="hero"
            className="w-full mt-6"
            disabled={isSubmitting || !isValid()}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {eventLang === "en" ? "Registering..." : "Registrando..."}
              </>
            ) : eventLang === "en" ? (
              "Register"
            ) : (
              "Inscribirme"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default DynamicRegistrationForm;
