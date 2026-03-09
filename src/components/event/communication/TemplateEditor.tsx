import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StructuredTemplate, TemplateKey, TEMPLATE_VARIABLES } from "./types";

interface TemplateEditorProps {
  template: StructuredTemplate;
  templateKey: TemplateKey;
  onChange: (field: keyof StructuredTemplate, value: string) => void;
}

const TemplateEditor = ({ template, templateKey, onChange }: TemplateEditorProps) => {
  const variables = TEMPLATE_VARIABLES[templateKey];

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
