import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { WrappedQuestion, WrappedAnswers } from "@/lib/wrappedQuestions";

interface Props {
  questions: WrappedQuestion[];
  lang: "es" | "en";
  values: WrappedAnswers;
  onChange: (values: WrappedAnswers) => void;
}

const WrappedInterestsForm = ({ questions, lang, values, onChange }: Props) => {
  const set = (id: string, v: any) => onChange({ ...values, [id]: v });

  const t = (q: WrappedQuestion) => q.i18n[lang] || q.i18n.es;

  return (
    <div className="space-y-5 p-4 rounded-lg border bg-muted/30">
      <div>
        <h3 className="font-semibold text-sm">
          {lang === "en" ? "A few interest questions ✨" : "Unas preguntas de intereses ✨"}
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          {lang === "en"
            ? "This helps us compute your compatibility with other attendees."
            : "Nos ayudan a calcular tu compatibilidad con el resto de asistentes."}
        </p>
      </div>

      {questions.map((q) => {
        const label = t(q).label;
        const options = t(q).options || [];
        const keys = q.options_key || options;
        const value = values[q.id];

        return (
          <div key={q.id} className="space-y-2">
            <Label>
              {label}
              {q.required && <span className="text-destructive ml-1">*</span>}
            </Label>

            {q.type === "yes_no" && (
              <RadioGroup
                value={value === true ? "yes" : value === false ? "no" : ""}
                onValueChange={(v) => set(q.id, v === "yes")}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id={`${q.id}-yes`} />
                  <Label htmlFor={`${q.id}-yes`} className="font-normal cursor-pointer">
                    {lang === "en" ? "Yes" : "Sí"}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id={`${q.id}-no`} />
                  <Label htmlFor={`${q.id}-no`} className="font-normal cursor-pointer">
                    No
                  </Label>
                </div>
              </RadioGroup>
            )}

            {q.type === "single_choice" && (
              <RadioGroup value={(value as string) || ""} onValueChange={(v) => set(q.id, v)}>
                {options.map((opt, i) => (
                  <div key={keys[i]} className="flex items-center space-x-2">
                    <RadioGroupItem value={keys[i]} id={`${q.id}-${keys[i]}`} />
                    <Label htmlFor={`${q.id}-${keys[i]}`} className="font-normal cursor-pointer">
                      {opt}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {q.type === "multi_choice" && (
              <div className="grid grid-cols-2 gap-2">
                {options.map((opt, i) => {
                  const key = keys[i];
                  const arr = Array.isArray(value) ? (value as string[]) : [];
                  const checked = arr.includes(key);
                  return (
                    <label
                      key={key}
                      className={`flex items-center gap-2 p-2 rounded border cursor-pointer text-sm transition-all ${
                        checked ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                      }`}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(c) => {
                          const next = c ? [...arr, key] : arr.filter((k) => k !== key);
                          set(q.id, next);
                        }}
                      />
                      <span>{opt}</span>
                    </label>
                  );
                })}
              </div>
            )}

            {q.type === "ranked_top3" && (
              <RankedTop3
                options={options}
                keys={keys}
                lang={lang}
                value={(value as any) || {}}
                onChange={(v) => set(q.id, v)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

interface RankedProps {
  options: string[];
  keys: string[];
  lang: "es" | "en";
  value: { top1?: string; top2?: string; top3?: string };
  onChange: (v: { top1?: string; top2?: string; top3?: string }) => void;
}

const RankedTop3 = ({ options, keys, lang, value, onChange }: RankedProps) => {
  const slots: Array<"top1" | "top2" | "top3"> = ["top1", "top2", "top3"];
  const labels = { top1: lang === "en" ? "#1 Favorite" : "#1 Favorito", top2: "#2", top3: "#3" };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      {slots.map((slot) => {
        const used = slots.filter((s) => s !== slot).map((s) => value[s]).filter(Boolean) as string[];
        return (
          <div key={slot}>
            <Label className="text-xs text-muted-foreground">{labels[slot]}</Label>
            <Select value={value[slot] || ""} onValueChange={(v) => onChange({ ...value, [slot]: v })}>
              <SelectTrigger>
                <SelectValue placeholder={lang === "en" ? "Choose..." : "Elige..."} />
              </SelectTrigger>
              <SelectContent>
                {options.map((opt, i) => (
                  <SelectItem key={keys[i]} value={keys[i]} disabled={used.includes(keys[i])}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      })}
    </div>
  );
};

export default WrappedInterestsForm;
