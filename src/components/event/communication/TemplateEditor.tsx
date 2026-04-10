import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StructuredTemplate, MatchesWithoutTemplate, TemplateKey, TEMPLATE_VARIABLES } from "./types";

interface TemplateEditorProps {
  template: StructuredTemplate;
  templateKey: TemplateKey;
  matchesWithoutTemplate?: MatchesWithoutTemplate;
  matchesVariant?: "with" | "without";
  onChange: (field: keyof StructuredTemplate, value: string) => void;
  onChangeWithout?: (field: keyof MatchesWithoutTemplate, value: string) => void;
  onChangeExtraField?: (fieldName: string, value: string) => void;
}

const TemplateEditor = ({ template, templateKey, matchesWithoutTemplate, matchesVariant, onChange, onChangeWithout, onChangeExtraField }: TemplateEditorProps) => {
  const variables = TEMPLATE_VARIABLES[templateKey];

  // Render "sin matches" editor
  if (((templateKey === "matches" && matchesVariant === "without") || templateKey === "no_show") && matchesWithoutTemplate && onChangeWithout) {
    return (
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Variables disponibles: {variables.map((v, i) => (
            <code key={i} className="bg-muted px-1 rounded mx-0.5">{v}</code>
          ))}
        </p>

        <div className="space-y-2">
          <Label>Asunto</Label>
          <Input
            value={matchesWithoutTemplate.subject}
            onChange={(e) => onChangeWithout("subject", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Saludo</Label>
          <Input
            value={matchesWithoutTemplate.greeting}
            onChange={(e) => onChangeWithout("greeting", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Mensaje</Label>
          <Textarea
            value={matchesWithoutTemplate.message}
            onChange={(e) => onChangeWithout("message", e.target.value)}
            rows={6}
          />
        </div>

        <div className="space-y-2">
          <Label>Cierre</Label>
          <Input
            value={matchesWithoutTemplate.closing}
            onChange={(e) => onChangeWithout("closing", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Firma</Label>
          <Textarea
            value={matchesWithoutTemplate.signature}
            onChange={(e) => onChangeWithout("signature", e.target.value)}
            rows={2}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Variables disponibles: {variables.map((v, i) => (
          <code key={i} className="bg-muted px-1 rounded mx-0.5">{v}</code>
        ))}
      </p>

      <div className="space-y-2">
        <Label>Asunto</Label>
        <Input
          value={template.subject}
          onChange={(e) => onChange("subject", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Saludo</Label>
        <Input
          value={template.greeting}
          onChange={(e) => onChange("greeting", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Introducción</Label>
        <Textarea
          value={template.intro}
          onChange={(e) => onChange("intro", e.target.value)}
          rows={4}
        />
      </div>

      {/* Extra fields for matches template */}
      {templateKey === "matches" && template.extraFields && onChangeExtraField && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Título Amistad</Label>
            <Input
              value={template.extraFields.friendshipTitle || ""}
              onChange={(e) => onChangeExtraField("friendshipTitle", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Título Ligue</Label>
            <Input
              value={template.extraFields.datingTitle || ""}
              onChange={(e) => onChangeExtraField("datingTitle", e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label>Cierre</Label>
        <Textarea
          value={template.closing}
          onChange={(e) => onChange("closing", e.target.value)}
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label>Firma</Label>
        <Textarea
          value={template.signature}
          onChange={(e) => onChange("signature", e.target.value)}
          rows={2}
        />
      </div>
    </div>
  );
};

export default TemplateEditor;
