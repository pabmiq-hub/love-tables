export interface StructuredTemplate {
  subject: string;
  greeting: string;
  intro: string;
  closing: string;
  signature: string;
  // Extra fields per type
  extraFields?: Record<string, string>;
}

export interface CommunicationTemplates {
  registration_confirmation: StructuredTemplate;
  reminder: StructuredTemplate;
  matches: StructuredTemplate;
  checkin_code: StructuredTemplate;
  primaryColor: string;
  logoUrl: string;
  brandName: string;
}

export type TemplateKey = keyof Omit<CommunicationTemplates, "primaryColor" | "logoUrl" | "brandName">;

export const TEMPLATE_VARIABLES: Record<TemplateKey, string[]> = {
  registration_confirmation: ["{{nombre}}", "{{evento}}", "{{fecha}}", "{{ubicacion}}", "{{hora}}"],
  reminder: ["{{nombre}}", "{{evento}}", "{{fecha}}", "{{ubicacion}}", "{{hora}}"],
  matches: ["{{nombre}}", "{{evento}}"],
  checkin_code: ["{{nombre}}", "{{evento}}", "{{codigo}}"],
};

export const DEFAULT_TEMPLATES_ES: CommunicationTemplates = {
  registration_confirmation: {
    subject: "¡Registro confirmado! - {{evento}}",
    greeting: "¡Hola {{nombre}}! 🎉",
    intro: "Tu registro para el evento {{evento}} ha sido confirmado con éxito.\n\n📅 Fecha: {{fecha}}\n📍 Lugar: {{ubicacion}}\n🕐 Hora: {{hora}}",
    closing: "Te enviaremos un código de acceso antes del evento. ¡Asegúrate de llegar a tiempo!",
    signature: "¡Nos vemos en el evento!\nEquipo Konektum 🎉",
  },
  reminder: {
    subject: "⏰ Recordatorio: ¡Envía tus selecciones para {{evento}}!",
    greeting: "¡Hola {{nombre}}! 👋",
    intro: "¡Aún estás a tiempo de indicar tus matches para el evento {{evento}}!\n\nNo te pierdas la oportunidad de conectar con las personas que conociste.",
    closing: "¡Esperamos que hayas pasado un buen rato! 💕",
    signature: "Este es un recordatorio automático.\nSi ya has enviado tus selecciones, ignora este mensaje.",
  },
  matches: {
    subject: "¡Tienes matches en {{evento}}! 🎉",
    greeting: "¡Hola {{nombre}}! 🎉",
    intro: "¡Gracias por participar en nuestro evento! Tenemos buenas noticias: ¡has hecho match con otros participantes!",
    closing: "¡No dudes en contactarles! Los mejores momentos empiezan con una simple conversación.",
    signature: "Con cariño,\nEl equipo de Konektum 💕",
  },
  checkin_code: {
    subject: "Tu código de acceso - {{evento}}",
    greeting: "¡Hola {{nombre}}!",
    intro: "Has sido registrado/a en el evento {{evento}}. Usa este código para hacer tu check-in y acceder a tu panel.",
    closing: "Guarda este código, lo necesitarás durante y después del evento.",
    signature: "¡Disfruta del evento!\nEquipo Konektum",
  },
  primaryColor: "#e11d48",
  logoUrl: "https://konektum.com/konektum-logo.png",
  brandName: "Konektum",
};

export const DEFAULT_TEMPLATES_EN: CommunicationTemplates = {
  registration_confirmation: {
    subject: "Registration confirmed! - {{evento}}",
    greeting: "Hi {{nombre}}! 🎉",
    intro: "Your registration for {{evento}} has been confirmed.\n\n📅 Date: {{fecha}}\n📍 Location: {{ubicacion}}\n🕐 Time: {{hora}}",
    closing: "We'll send you an access code before the event. Make sure to arrive on time!",
    signature: "See you at the event!\nKonektum Team 🎉",
  },
  reminder: {
    subject: "⏰ Reminder: Send your selections for {{evento}}!",
    greeting: "Hi {{nombre}}! 👋",
    intro: "You still have time to submit your matches for the event {{evento}}!\n\nDon't miss the opportunity to connect with the people you met.",
    closing: "We hope you had a great time! 💕",
    signature: "This is an automatic reminder.\nIf you have already sent your selections, please ignore this message.",
  },
  matches: {
    subject: "You have matches from {{evento}}! 🎉",
    greeting: "Hi {{nombre}}! 🎉",
    intro: "Thank you for attending our event! We have great news: you matched with other participants!",
    closing: "Don't hesitate to reach out! Great moments start with a simple conversation.",
    signature: "With love,\nThe Konektum Team 💕",
  },
  checkin_code: {
    subject: "Your access code - {{evento}}",
    greeting: "Hi {{nombre}}!",
    intro: "You have been registered for the event {{evento}}. Use this code to check in and access your panel.",
    closing: "Save this code, you will need it during and after the event.",
    signature: "Enjoy the event!\nKonektum Team",
  },
  primaryColor: "#e11d48",
  logoUrl: "https://konektum.com/konektum-logo.png",
  brandName: "Konektum",
};
