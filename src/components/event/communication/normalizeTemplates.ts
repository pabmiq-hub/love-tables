import type { CommunicationTemplates, StructuredTemplate } from "./types";

const serializeTemplate = (template?: Partial<StructuredTemplate> | null) =>
  JSON.stringify({
    subject: template?.subject?.trim() || "",
    greeting: template?.greeting?.trim() || "",
    intro: template?.intro?.trim() || "",
    closing: template?.closing?.trim() || "",
    signature: template?.signature?.trim() || "",
  });

const looksLikeSelectionReminder = (template?: Partial<StructuredTemplate> | null) => {
  const text = [
    template?.subject,
    template?.intro,
    template?.closing,
    template?.signature,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return /(selecciones|matches|people you met|send your selections|submit your matches|indicar tus matches)/i.test(text);
};

const hasEventSignals = (template?: Partial<StructuredTemplate> | null) => {
  const text = [template?.subject, template?.intro, template?.closing]
    .filter(Boolean)
    .join(" ");

  return /(\{\{fecha\}\}|\{\{ubicacion\}\}|\{\{hora\}\}|fecha|date|ubicación|location)/i.test(text);
};

export const shouldResetEventReminderTemplate = (
  reminder?: Partial<StructuredTemplate> | null,
  selectionReminder?: Partial<StructuredTemplate> | null,
) => {
  if (!reminder) return true;

  return (
    serializeTemplate(reminder) === serializeTemplate(selectionReminder) ||
    (looksLikeSelectionReminder(reminder) && !hasEventSignals(reminder))
  );
};

export const normalizeCommunicationTemplates = (
  templates: CommunicationTemplates,
  defaults: CommunicationTemplates,
): CommunicationTemplates => {
  const normalized = { ...templates };

  if (shouldResetEventReminderTemplate(normalized.reminder, normalized.selection_reminder)) {
    normalized.reminder = defaults.reminder;
  }

  return normalized;
};