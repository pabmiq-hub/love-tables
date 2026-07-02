import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import { DEFAULT_WRAPPED_QUESTIONS, type WrappedQuestion, type WrappedQuestionType } from "@/lib/wrappedQuestions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: WrappedQuestion[];
  onSave: (questions: WrappedQuestion[]) => void;
}

const TYPE_LABELS: Record<WrappedQuestionType, string> = {
  yes_no: "Sí / No",
  single_choice: "Opción única",
  multi_choice: "Opción múltiple",
  ranked_top3: "Ranking Top 3",
};

const slugify = (s: string) =>
  s.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40) || `opt_${Date.now()}`;

const emptyQuestion = (): WrappedQuestion => ({
  id: `q_${Date.now()}`,
  type: "single_choice",
  required: false,
  options_key: ["opcion_1", "opcion_2"],
  i18n: {
    es: { label: "Nueva pregunta", options: ["Opción 1", "Opción 2"] },
    en: { label: "New question", options: ["Option 1", "Option 2"] },
  },
});

export default function WrappedQuestionsEditor({ open, onOpenChange, value, onSave }: Props) {
  const [questions, setQuestions] = useState<WrappedQuestion[]>([]);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(0);

  useEffect(() => {
    if (open) {
      setQuestions(value && value.length > 0 ? JSON.parse(JSON.stringify(value)) : JSON.parse(JSON.stringify(DEFAULT_WRAPPED_QUESTIONS)));
      setExpandedIdx(0);
    }
  }, [open, value]);

  const updateQ = (idx: number, patch: Partial<WrappedQuestion>) => {
    setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  };

  const updateLabel = (idx: number, lang: "es" | "en", label: string) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, i18n: { ...q.i18n, [lang]: { ...q.i18n[lang], label } } } : q))
    );
  };

  const updateOption = (idx: number, optIdx: number, lang: "es" | "en", text: string) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== idx) return q;
        const arr = [...(q.i18n[lang].options || [])];
        arr[optIdx] = text;
        return { ...q, i18n: { ...q.i18n, [lang]: { ...q.i18n[lang], options: arr } } };
      })
    );
  };

  const addOption = (idx: number) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== idx) return q;
        const es = [...(q.i18n.es.options || []), `Opción ${(q.i18n.es.options?.length || 0) + 1}`];
        const en = [...(q.i18n.en.options || []), `Option ${(q.i18n.en.options?.length || 0) + 1}`];
        const keys = [...(q.options_key || []), slugify(`opcion_${es.length}_${Date.now()}`)];
        return {
          ...q,
          options_key: keys,
          i18n: { es: { ...q.i18n.es, options: es }, en: { ...q.i18n.en, options: en } },
        };
      })
    );
  };

  const removeOption = (idx: number, optIdx: number) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== idx) return q;
        const es = (q.i18n.es.options || []).filter((_, k) => k !== optIdx);
        const en = (q.i18n.en.options || []).filter((_, k) => k !== optIdx);
        const keys = (q.options_key || []).filter((_, k) => k !== optIdx);
        return {
          ...q,
          options_key: keys,
          i18n: { es: { ...q.i18n.es, options: es }, en: { ...q.i18n.en, options: en } },
        };
      })
    );
  };

  const addQuestion = () => {
    setQuestions((prev) => {
      const next = [...prev, emptyQuestion()];
      setExpandedIdx(next.length - 1);
      return next;
    });
  };

  const removeQuestion = (idx: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const resetDefaults = () => {
    setQuestions(JSON.parse(JSON.stringify(DEFAULT_WRAPPED_QUESTIONS)));
    setExpandedIdx(0);
  };

  const handleSave = () => {
    // sanitize options_key length to match options
    const clean = questions.map((q) => {
      if (q.type === "yes_no") {
        return { ...q, options_key: undefined, i18n: { es: { label: q.i18n.es.label }, en: { label: q.i18n.en.label } } };
      }
      const esOpts = q.i18n.es.options || [];
      const enOpts = q.i18n.en.options || [];
      const keys = (q.options_key || []).slice(0, esOpts.length);
      while (keys.length < esOpts.length) keys.push(slugify(esOpts[keys.length] || `opt_${keys.length}`));
      return { ...q, options_key: keys, i18n: { es: { label: q.i18n.es.label, options: esOpts }, en: { label: q.i18n.en.label, options: enOpts } } };
    });
    onSave(clean);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>✨ Personalizar preguntas Wrapped</DialogTitle>
          <DialogDescription>
            Añade, edita o elimina las preguntas de intereses. Los textos son bilingües (ES / EN) y se muestran según el idioma del evento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {questions.map((q, idx) => {
            const isOpen = expandedIdx === idx;
            const hasOptions = q.type !== "yes_no";
            const isRanked = q.type === "ranked_top3";
            return (
              <Card key={q.id + idx} className="border">
                <CardContent className="p-3 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      className="flex-1 flex items-center gap-2 text-left"
                      onClick={() => setExpandedIdx(isOpen ? null : idx)}
                    >
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      <span className="font-medium truncate">{q.i18n.es.label || "(sin título)"}</span>
                      <span className="text-xs text-muted-foreground">{TYPE_LABELS[q.type]}</span>
                    </button>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeQuestion(idx)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>

                  {isOpen && (
                    <div className="space-y-3 pt-2 border-t">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Pregunta (ES)</Label>
                          <Input value={q.i18n.es.label} onChange={(e) => updateLabel(idx, "es", e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Pregunta (EN)</Label>
                          <Input value={q.i18n.en.label} onChange={(e) => updateLabel(idx, "en", e.target.value)} />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Tipo</Label>
                          <Select
                            value={q.type}
                            onValueChange={(v) => updateQ(idx, { type: v as WrappedQuestionType })}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="yes_no">Sí / No</SelectItem>
                              <SelectItem value="single_choice">Opción única</SelectItem>
                              <SelectItem value="multi_choice">Opción múltiple</SelectItem>
                              <SelectItem value="ranked_top3">Ranking Top 3</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-end justify-between p-2 border rounded-md">
                          <Label className="text-xs">Obligatoria</Label>
                          <Switch checked={q.required} onCheckedChange={(v) => updateQ(idx, { required: v })} />
                        </div>
                      </div>

                      {hasOptions && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Respuestas {isRanked && "(el participante elegirá 3 en orden)"}</Label>
                            <Button type="button" variant="outline" size="sm" onClick={() => addOption(idx)}>
                              <Plus className="w-3 h-3 mr-1" /> Añadir
                            </Button>
                          </div>
                          {(q.i18n.es.options || []).map((_, optIdx) => (
                            <div key={optIdx} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                              <Input
                                placeholder="ES"
                                value={q.i18n.es.options?.[optIdx] || ""}
                                onChange={(e) => updateOption(idx, optIdx, "es", e.target.value)}
                              />
                              <Input
                                placeholder="EN"
                                value={q.i18n.en.options?.[optIdx] || ""}
                                onChange={(e) => updateOption(idx, optIdx, "en", e.target.value)}
                              />
                              <Button type="button" variant="ghost" size="icon" onClick={() => removeOption(idx, optIdx)}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="button" variant="outline" onClick={addQuestion}>
              <Plus className="w-4 h-4 mr-1" /> Añadir pregunta
            </Button>
            <Button type="button" variant="ghost" onClick={resetDefaults}>
              <RotateCcw className="w-4 h-4 mr-1" /> Restaurar por defecto
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Guardar preguntas</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
