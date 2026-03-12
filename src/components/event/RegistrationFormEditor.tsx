import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  GripVertical,
  Plus,
  Trash2,
  Type,
  Mail,
  Phone,
  Hash,
  AlignLeft,
  ListChecks,
  CheckSquare,
  Calendar,
  ChevronUp,
  ChevronDown,
  Copy,
  Settings2,
  Eye,
  X,
} from "lucide-react";

export type FormFieldType =
  | "text"
  | "email"
  | "phone"
  | "number"
  | "textarea"
  | "select"
  | "multiselect"
  | "checkbox"
  | "date";

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[]; // For select/multiselect
  system?: boolean; // System fields can't be deleted
  description?: string;
}

export interface RegistrationFormConfig {
  fields: FormField[];
  formMode: "default" | "custom";
}

const FIELD_TYPE_ICONS: Record<FormFieldType, React.ElementType> = {
  text: Type,
  email: Mail,
  phone: Phone,
  number: Hash,
  textarea: AlignLeft,
  select: ListChecks,
  multiselect: CheckSquare,
  checkbox: CheckSquare,
  date: Calendar,
};

const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  text: "Texto corto",
  email: "Email",
  phone: "Teléfono",
  number: "Número",
  textarea: "Texto largo",
  select: "Selección única",
  multiselect: "Selección múltiple",
  checkbox: "Casilla de verificación",
  date: "Fecha",
};

const DEFAULT_SOCIAL_FIELDS: FormField[] = [
  { id: "name", type: "text", label: "Nombre y apellidos", required: true, system: true },
  { id: "email", type: "email", label: "Email", required: true, system: true },
  { id: "phone", type: "phone", label: "Teléfono", required: true, system: true },
  { id: "birth_date", type: "date", label: "Fecha de nacimiento", required: true, system: true },
  { id: "gender", type: "select", label: "Género", required: true, system: true, options: ["Hombre", "Mujer", "No binario", "Prefiero no decirlo"] },
  { id: "preference", type: "select", label: "Tipo de conexión", required: true, system: true, options: ["Amistad y ligue", "Solo amistad"] },
  { id: "dating_preference", type: "select", label: "Preferencia de ligue", required: true, system: true, options: ["Soy un hombre y busco una mujer", "Soy una mujer y busco un hombre", "Soy un hombre y busco un hombre", "Soy una mujer y busco una mujer", "Estoy abierto a todo"] },
];

const DEFAULT_PROFESSIONAL_FIELDS: FormField[] = [
  { id: "name", type: "text", label: "Nombre completo", required: true, system: true },
  { id: "email", type: "email", label: "Email", required: true, system: true },
  { id: "phone", type: "phone", label: "Teléfono", required: true, system: true },
  { id: "entity_type", type: "select", label: "Tipo de participante", required: true, system: true, options: ["Cliente", "Proveedor"] },
  { id: "company_name", type: "text", label: "Nombre de empresa", required: true, system: true },
  { id: "sector", type: "select", label: "Sector", required: true, system: true, options: ["Tecnología", "Marketing", "Finanzas", "Salud", "Educación", "Consultoría", "Industria", "Servicios", "Otro"] },
  { id: "company_size", type: "select", label: "Tamaño de empresa", required: true, system: true, options: ["1-10 empleados", "11-50 empleados", "51-200 empleados", "201-500 empleados", "500+ empleados"] },
  { id: "needs", type: "multiselect", label: "Necesidades (clientes)", required: true, system: true, options: ["Desarrollo de software", "Marketing digital", "Consultoría estratégica"] },
  { id: "solutions", type: "multiselect", label: "Soluciones (proveedores)", required: true, system: true, options: ["Desarrollo de software", "Marketing digital", "Consultoría estratégica"] },
];

export const getDefaultFields = (module: "social" | "professional"): FormField[] => {
  return module === "social"
    ? DEFAULT_SOCIAL_FIELDS.map((f) => ({ ...f }))
    : DEFAULT_PROFESSIONAL_FIELDS.map((f) => ({ ...f }));
};

interface RegistrationFormEditorProps {
  fields: FormField[];
  onChange: (fields: FormField[]) => void;
  eventModule: "social" | "professional";
}

const RegistrationFormEditor = ({ fields, onChange, eventModule }: RegistrationFormEditorProps) => {
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [showAddField, setShowAddField] = useState(false);
  const [newFieldType, setNewFieldType] = useState<FormFieldType>("text");
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const moveField = (index: number, direction: "up" | "down") => {
    const newFields = [...fields];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newFields.length) return;
    [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
    onChange(newFields);
  };

  const removeField = (id: string) => {
    onChange(fields.filter((f) => f.id !== id));
  };

  const duplicateField = (field: FormField) => {
    const newField: FormField = {
      ...field,
      id: `custom_${Date.now()}`,
      label: `${field.label} (copia)`,
      system: false,
    };
    const idx = fields.findIndex((f) => f.id === field.id);
    const newFields = [...fields];
    newFields.splice(idx + 1, 0, newField);
    onChange(newFields);
  };

  const updateField = (updated: FormField) => {
    onChange(fields.map((f) => (f.id === updated.id ? updated : f)));
    setEditingField(null);
  };

  const addField = () => {
    if (!newFieldLabel.trim()) return;
    const newField: FormField = {
      id: `custom_${Date.now()}`,
      type: newFieldType,
      label: newFieldLabel.trim(),
      required: false,
      system: false,
      options: ["select", "multiselect"].includes(newFieldType) ? ["Opción 1", "Opción 2"] : undefined,
    };
    onChange([...fields, newField]);
    setNewFieldLabel("");
    setShowAddField(false);
  };

  const toggleFieldRequired = (id: string) => {
    onChange(fields.map((f) => (f.id === id ? { ...f, required: !f.required } : f)));
  };

  return (
    <div className="space-y-4">
      {/* Header with preview toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-sm">Campos del formulario</h4>
          <p className="text-xs text-muted-foreground">
            Arrastra para reordenar, edita o añade nuevos campos
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)}>
          <Eye className="w-4 h-4 mr-1" />
          {showPreview ? "Editor" : "Vista previa"}
        </Button>
      </div>

      {showPreview ? (
        <FormPreview fields={fields} />
      ) : (
        <>
          {/* Field list */}
          <div className="space-y-2">
            {fields.map((field, index) => {
              const Icon = FIELD_TYPE_ICONS[field.type];
              return (
                <div
                  key={field.id}
                  className="flex items-center gap-2 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors group"
                >
                  {/* Reorder controls */}
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => moveField(index, "up")}
                      disabled={index === 0}
                      className="p-0.5 rounded hover:bg-muted disabled:opacity-30"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveField(index, "down")}
                      disabled={index === fields.length - 1}
                      className="p-0.5 rounded hover:bg-muted disabled:opacity-30"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Grip icon */}
                  <GripVertical className="w-4 h-4 text-muted-foreground/50 shrink-0" />

                  {/* Field info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium truncate">{field.label}</span>
                      {field.required && (
                        <Badge variant="secondary" className="text-[10px] px-1 py-0 shrink-0">
                          Obligatorio
                        </Badge>
                      )}
                      {field.system && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0">
                          Sistema
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {FIELD_TYPE_LABELS[field.type]}
                      {field.options && ` · ${field.options.length} opciones`}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Switch
                      checked={field.required}
                      onCheckedChange={() => toggleFieldRequired(field.id)}
                      className="scale-75"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setEditingField({ ...field })}
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => duplicateField(field)}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    {!field.system && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => removeField(field.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add field */}
          {showAddField ? (
            <Card className="p-4 space-y-3 border-dashed border-primary/30">
              <div className="flex items-center justify-between">
                <h5 className="font-medium text-sm">Nuevo campo</h5>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowAddField(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nombre del campo</Label>
                  <Input
                    value={newFieldLabel}
                    onChange={(e) => setNewFieldLabel(e.target.value)}
                    placeholder="Ej: ¿Cómo nos conociste?"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Tipo</Label>
                  <Select value={newFieldType} onValueChange={(v) => setNewFieldType(v as FormFieldType)}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(FIELD_TYPE_LABELS).map(([key, label]) => {
                        const Icon = FIELD_TYPE_ICONS[key as FormFieldType];
                        return (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center gap-2">
                              <Icon className="w-3.5 h-3.5" />
                              {label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button size="sm" onClick={addField} disabled={!newFieldLabel.trim()}>
                <Plus className="w-4 h-4 mr-1" />
                Añadir campo
              </Button>
            </Card>
          ) : (
            <Button
              variant="outline"
              className="w-full border-dashed"
              onClick={() => setShowAddField(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Añadir campo personalizado
            </Button>
          )}
        </>
      )}

      {/* Edit Field Dialog */}
      {editingField && (
        <FieldEditDialog
          field={editingField}
          onSave={updateField}
          onClose={() => setEditingField(null)}
        />
      )}
    </div>
  );
};

// Field Edit Dialog
const FieldEditDialog = ({
  field,
  onSave,
  onClose,
}: {
  field: FormField;
  onSave: (field: FormField) => void;
  onClose: () => void;
}) => {
  const [editField, setEditField] = useState<FormField>({ ...field });
  const [newOption, setNewOption] = useState("");

  const addOption = () => {
    if (!newOption.trim() || !editField.options) return;
    setEditField({ ...editField, options: [...editField.options, newOption.trim()] });
    setNewOption("");
  };

  const removeOption = (idx: number) => {
    if (!editField.options) return;
    setEditField({ ...editField, options: editField.options.filter((_, i) => i !== idx) });
  };

  const moveOption = (idx: number, dir: "up" | "down") => {
    if (!editField.options) return;
    const newOpts = [...editField.options];
    const target = dir === "up" ? idx - 1 : idx + 1;
    if (target < 0 || target >= newOpts.length) return;
    [newOpts[idx], newOpts[target]] = [newOpts[target], newOpts[idx]];
    setEditField({ ...editField, options: newOpts });
  };

  const hasOptions = ["select", "multiselect"].includes(editField.type);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar campo</DialogTitle>
          <DialogDescription>Configura las propiedades del campo</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Etiqueta</Label>
            <Input
              value={editField.label}
              onChange={(e) => setEditField({ ...editField, label: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Tipo de campo</Label>
            <Select
              value={editField.type}
              onValueChange={(v) => {
                const newType = v as FormFieldType;
                const needsOptions = ["select", "multiselect"].includes(newType);
                setEditField({
                  ...editField,
                  type: newType,
                  options: needsOptions && !editField.options ? ["Opción 1"] : editField.options,
                });
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(FIELD_TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Placeholder</Label>
            <Input
              value={editField.placeholder || ""}
              onChange={(e) => setEditField({ ...editField, placeholder: e.target.value })}
              placeholder="Texto de ayuda..."
            />
          </div>

          <div className="space-y-1.5">
            <Label>Descripción (opcional)</Label>
            <Textarea
              value={editField.description || ""}
              onChange={(e) => setEditField({ ...editField, description: e.target.value })}
              placeholder="Instrucciones adicionales para el participante..."
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Obligatorio</Label>
            <Switch
              checked={editField.required}
              onCheckedChange={(v) => setEditField({ ...editField, required: v })}
            />
          </div>

          {/* Options editor for select/multiselect */}
          {hasOptions && (
            <div className="space-y-2">
              <Label>Opciones</Label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {(editField.options || []).map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <div className="flex flex-col gap-0.5">
                      <button type="button" onClick={() => moveOption(idx, "up")} disabled={idx === 0} className="p-0.5 rounded hover:bg-muted disabled:opacity-30">
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button type="button" onClick={() => moveOption(idx, "down")} disabled={idx === (editField.options?.length || 0) - 1} className="p-0.5 rounded hover:bg-muted disabled:opacity-30">
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </div>
                    <Input
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...(editField.options || [])];
                        newOpts[idx] = e.target.value;
                        setEditField({ ...editField, options: newOpts });
                      }}
                      className="h-8 text-sm"
                    />
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive" onClick={() => removeOption(idx)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addOption())}
                  placeholder="Nueva opción..."
                  className="h-8 text-sm"
                />
                <Button size="sm" variant="outline" onClick={addOption} disabled={!newOption.trim()} className="h-8">
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSave(editField)}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Form Preview
const FormPreview = ({ fields }: { fields: FormField[] }) => {
  return (
    <div className="space-y-4 p-4 rounded-lg border bg-muted/20">
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Vista previa del formulario</p>
      {fields.map((field) => (
        <div key={field.id} className="space-y-1.5">
          <Label className="text-sm">
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          {field.description && (
            <p className="text-xs text-muted-foreground">{field.description}</p>
          )}
          {field.type === "text" || field.type === "email" || field.type === "phone" || field.type === "number" ? (
            <Input
              type={field.type === "phone" ? "tel" : field.type}
              placeholder={field.placeholder || field.label}
              disabled
              className="opacity-60"
            />
          ) : field.type === "textarea" ? (
            <Textarea
              placeholder={field.placeholder || field.label}
              disabled
              className="opacity-60"
              rows={3}
            />
          ) : field.type === "date" ? (
            <Input type="date" disabled className="opacity-60" />
          ) : field.type === "select" ? (
            <Select disabled>
              <SelectTrigger className="opacity-60">
                <SelectValue placeholder={field.placeholder || "Seleccionar..."} />
              </SelectTrigger>
              <SelectContent>
                {(field.options || []).map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : field.type === "multiselect" ? (
            <div className="flex flex-wrap gap-2 opacity-60">
              {(field.options || []).map((opt) => (
                <Badge key={opt} variant="outline" className="text-xs">{opt}</Badge>
              ))}
            </div>
          ) : field.type === "checkbox" ? (
            <div className="flex items-center gap-2 opacity-60">
              <input type="checkbox" disabled className="h-4 w-4 rounded border" />
              <span className="text-sm">{field.placeholder || field.label}</span>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
};

export default RegistrationFormEditor;
