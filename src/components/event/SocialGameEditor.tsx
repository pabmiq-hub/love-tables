import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { DEFAULT_SOCIAL_GAME_QUESTIONS, type SocialGameConfig, type SocialGameQuestion } from "@/lib/socialGame";

interface Props {
  value: SocialGameConfig;
  onChange: (v: SocialGameConfig) => void;
}

const SocialGameEditor = ({ value, onChange }: Props) => {
  const questions = value.questions.length > 0 ? value.questions : DEFAULT_SOCIAL_GAME_QUESTIONS;

  const update = (index: number, patch: Partial<SocialGameQuestion>) => {
    const next = questions.map((q, i) => (i === index ? { ...q, ...patch } : q));
    onChange({ ...value, questions: next });
  };

  const remove = (index: number) => {
    onChange({ ...value, questions: questions.filter((_, i) => i !== index) });
  };

  const add = () => {
    onChange({
      ...value,
      questions: [...questions, { id: `q_${Date.now()}`, label_es: "", label_en: "" }],
    });
  };

  return (
    <div className="p-4 border rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex-1 pr-4">
          <Label className="text-base">🎭 Juego ¿Quién es quién?</Label>
          <p className="text-sm text-muted-foreground">
            Los participantes responden estas preguntas al inscribirse. En cada ronda (incluida la preliminar) verán
            2 preguntas con las respuestas anónimas de su mesa y deberán adivinar quién las escribió. Los aciertos
            desbloquean acciones extra: 1 acierto → Super Like extra · 3 aciertos → también Repetir · pleno → también Flechazo.
          </p>
        </div>
        <Switch checked={value.enabled} onCheckedChange={(v) => onChange({ ...value, enabled: v, questions })} />
      </div>

      {value.enabled && (
        <div className="space-y-3 pt-3 border-t">
          {questions.map((q, i) => (
            <div key={q.id} className="space-y-2 p-3 rounded-md bg-muted/30">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Pregunta {i + 1}</Label>
                <Button type="button" variant="ghost" size="sm" onClick={() => remove(i)} disabled={questions.length <= 1}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
              <Input
                value={q.label_es}
                onChange={(e) => update(i, { label_es: e.target.value })}
                placeholder="Texto en castellano"
              />
              <Input
                value={q.label_en}
                onChange={(e) => update(i, { label_en: e.target.value })}
                placeholder="Text in English"
              />
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={add}>
            <Plus className="w-4 h-4 mr-2" />
            Añadir pregunta
          </Button>
        </div>
      )}
    </div>
  );
};

export default SocialGameEditor;
